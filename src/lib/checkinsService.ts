/**
 * Submódulo de Asistencia en Punto de Venta (PDV / Check-in)
 * Servicio de datos, persistencia híbrida (Supabase + LocalStorage) y sincronización offline
 */
import { supabase } from './supabase';
import { resolvePromoterNameFromRaw } from './campoService';

export type CheckInType = 'Ingreso' | 'Salida a almorzar' | 'Vuelta a almorzar' | 'Salida';

export function getCaracasDayKey(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return String(isoDate || '').slice(0, 10);
    // America/Caracas es UTC-4 fijo todo el año
    const caracasMs = d.getTime() - 4 * 60 * 60 * 1000;
    return new Date(caracasMs).toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return String(isoDate || '').slice(0, 10);
  }
}

export function normalizeCheckInType(rawType?: string): CheckInType | null {
  const clean = String(rawType || '').trim().toLowerCase();
  if (!clean) return null;
  if (clean === 'ingreso' || clean.includes('entrada')) return 'Ingreso';
  if (clean.includes('salida a almorzar') || clean.includes('salida almorzar') || clean.includes('salida almuerzo')) {
    return 'Salida a almorzar';
  }
  if (
    clean.includes('vuelta a almorzar') ||
    clean.includes('llegada de almorzar') ||
    clean.includes('llegada almorzar') ||
    clean.includes('regreso')
  ) {
    return 'Vuelta a almorzar';
  }
  if (clean === 'salida' || clean.includes('cierre')) return 'Salida';
  return null;
}

const SYNTHETIC_CHECKIN_PROMOTERS = new Set([
  'grecia castillo',
  'ana perez',
  'ana silva',
  'maria gonzalez',
]);

export function normalizeAndDeduplicateCheckIns(records: CheckInRecord[]): CheckInRecord[] {
  const validNormalized: CheckInRecord[] = [];

  for (const c of records) {
    if (!c || !c.id) continue;
    const idStr = String(c.id).trim();
    if (/^CHK-LIVE-/i.test(idStr) || idStr.startsWith('chk-00')) continue;
    if (c.store?.includes('Palos Grandes') || c.photoBase64?.includes('unsplash')) continue;
    if (String(c.creatorId || '').trim().toLowerCase() === 'admin') continue;
    const rawPromoterLower = String(c.promoter || '').trim().toLowerCase();
    if (SYNTHETIC_CHECKIN_PROMOTERS.has(rawPromoterLower)) continue;

    const normalizedType = normalizeCheckInType(c.type);
    if (!normalizedType) continue;

    const canonicalPromoter = resolvePromoterNameFromRaw(c.promoter, c.creatorId);
    if (!canonicalPromoter || SYNTHETIC_CHECKIN_PROMOTERS.has(canonicalPromoter.toLowerCase())) continue;

    const dateIso = c.date || c.created_at || new Date().toISOString();
    const photo =
      c.photoBase64 && String(c.photoBase64).trim() !== ''
        ? c.photoBase64
        : `/api/checkins/${encodeURIComponent(idStr)}/photo`;

    validNormalized.push({
      ...c,
      id: idStr,
      date: dateIso,
      created_at: c.created_at || dateIso,
      type: normalizedType,
      promoter: canonicalPromoter,
      store: String(c.store || 'Punto de Venta').trim(),
      photoBase64: photo,
      location: c.location && typeof c.location === 'object'
        ? {
            lat: Number(c.location.lat) || 0,
            lng: Number(c.location.lng) || 0,
            accuracy: Number(c.location.accuracy) || 0,
            ...(c.location.error ? { error: c.location.error } : {}),
          }
        : { lat: 0, lng: 0, accuracy: 0 },
    });
  }

  // Deduplicar por (Día en Caracas | Promotora Canónica | Tipo de Marcaje)
  // para eliminar marcajes duplicados del mismo hito en el mismo día.
  const grouped = new Map<string, CheckInRecord[]>();
  for (const rec of validNormalized) {
    const dayKey = getCaracasDayKey(rec.date);
    const groupKey = `${dayKey}|${rec.promoter.toUpperCase()}|${rec.type}`;
    const bucket = grouped.get(groupKey);
    if (bucket) {
      bucket.push(rec);
    } else {
      grouped.set(groupKey, [rec]);
    }
  }

  const deduplicated: CheckInRecord[] = [];
  for (const [, bucket] of grouped.entries()) {
    if (bucket.length === 1) {
      deduplicated.push(bucket[0]);
      continue;
    }

    // Ordenar cronológicamente ascendente dentro del mismo día e hito
    bucket.sort(
      (a, b) => new Date(a.date || a.created_at || 0).getTime() - new Date(b.date || b.created_at || 0).getTime()
    );

    // Para Ingreso y Salida a almorzar tomamos el primer marcaje válido;
    // para Vuelta a almorzar y Salida tomamos el último marcaje del día.
    const isFirstMilestone = bucket[0].type === 'Ingreso' || bucket[0].type === 'Salida a almorzar';
    const primary = isFirstMilestone ? bucket[0] : bucket[bucket.length - 1];

    // Conservar todos los PDV distintos visitados si hubiera más de uno
    const uniqueStores: string[] = [];
    for (const item of bucket) {
      const st = item.store.trim();
      if (st && !uniqueStores.some((u) => u.toLowerCase() === st.toLowerCase())) {
        uniqueStores.push(st);
      }
    }

    // Preferir ubicación con coordenadas GPS reales si alguno de los intentos la capturó
    const recordWithGps =
      bucket.find((item) => item.location && item.location.lat !== 0 && item.location.lng !== 0) ||
      primary;

    // Preferir foto data:image directa si alguno la tiene en memoria
    const recordWithDirectPhoto =
      bucket.find((item) => item.photoBase64?.startsWith('data:image')) || primary;

    deduplicated.push({
      ...primary,
      store: uniqueStores.join(' / ') || primary.store,
      location: recordWithGps.location,
      photoBase64: recordWithDirectPhoto.photoBase64,
    });
  }

  return deduplicated.sort(
    (a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()
  );
}

export interface CheckInLocation {
  lat: number;
  lng: number;
  accuracy: number;
  error?: string;
}

export interface CheckInRecord {
  id: string;
  date: string; // TIMESTAMPTZ / ISOString
  type: CheckInType;
  store: string;
  photoBase64: string;
  location: CheckInLocation;
  promoter: string;
  creatorId: string;
  created_at: string;
  // Campos de apoyo operativo
  offlinePending?: boolean;
  batteryLevel?: string;
}

const STORAGE_KEY_CHECKINS = 'codizulca_checkins';
const STORAGE_KEY_QUEUE = 'portal_checkins_sync_queue';
export const STORAGE_KEY_ACTIVE_STORE = 'portal_active_store';
export const STORAGE_KEY_ACTIVE_PROMOTER = 'portal_active_promoter';

// Helper de canal para sincronización en tiempo real entre pestañas
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('codizulca_checkins_sync')
  : null;

// Semilla inicial vacía para producción limpia
export const INITIAL_CHECKINS_SEED: CheckInRecord[] = [
  {
    "id": "CHK-LIVE-1910-101",
    "date": "2026-10-19T08:00:12.000Z",
    "type": "Ingreso",
    "store": "SUPERMARKET FIORELLA EXPRESS, C.A.",
    "photoBase64": "/avatars/nicole_godoy.jpg",
    "location": {
      "lat": 10.6934,
      "lng": -71.6324,
      "accuracy": 5
    },
    "promoter": "NICOLE GODOY",
    "creatorId": "STF-001",
    "created_at": "2026-10-19T08:00:12.000Z",
    "offlinePending": false,
    "batteryLevel": "90%"
  },
  {
    "id": "CHK-LIVE-1910-102",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "SUPERMARKET FIORELLA EXPRESS, C.A.",
    "photoBase64": "/avatars/nicole_godoy.jpg",
    "location": {
      "lat": 10.6934,
      "lng": -71.6324,
      "accuracy": 6
    },
    "promoter": "NICOLE GODOY",
    "creatorId": "STF-001",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "45%"
  },
  {
    "id": "CHK-LIVE-1910-103",
    "date": "2026-10-19T08:02:12.000Z",
    "type": "Ingreso",
    "store": "MULTITIENDAS FARMAPLUS GRAN BAZAR, C.A",
    "photoBase64": "/avatars/fernanda_leon.jpg",
    "location": {
      "lat": 10.6431,
      "lng": -71.6119,
      "accuracy": 6
    },
    "promoter": "FERNANDA LEON",
    "creatorId": "STF-002",
    "created_at": "2026-10-19T08:02:12.000Z",
    "offlinePending": false,
    "batteryLevel": "91%"
  },
  {
    "id": "CHK-LIVE-1910-104",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "MULTITIENDAS FARMAPLUS GRAN BAZAR, C.A",
    "photoBase64": "/avatars/fernanda_leon.jpg",
    "location": {
      "lat": 10.6431,
      "lng": -71.6119,
      "accuracy": 6
    },
    "promoter": "FERNANDA LEON",
    "creatorId": "STF-002",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "46%"
  },
  {
    "id": "CHK-LIVE-1910-105",
    "date": "2026-10-19T08:04:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO LA LIMPIA",
    "photoBase64": "/avatars/nismary_derizan.jpg",
    "location": {
      "lat": 10.6654,
      "lng": -71.6482,
      "accuracy": 7
    },
    "promoter": "NISMARY DERIZAN",
    "creatorId": "STF-003",
    "created_at": "2026-10-19T08:04:12.000Z",
    "offlinePending": false,
    "batteryLevel": "92%"
  },
  {
    "id": "CHK-LIVE-1910-106",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "ALKOSTO LA LIMPIA",
    "photoBase64": "/avatars/nismary_derizan.jpg",
    "location": {
      "lat": 10.6654,
      "lng": -71.6482,
      "accuracy": 6
    },
    "promoter": "NISMARY DERIZAN",
    "creatorId": "STF-003",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "47%"
  },
  {
    "id": "CHK-LIVE-1910-107",
    "date": "2026-10-19T08:06:12.000Z",
    "type": "Ingreso",
    "store": "DE CANDIDO EXPRESS",
    "photoBase64": "/avatars/dariannys_ferrer.jpg",
    "location": {
      "lat": 10.6845,
      "lng": -71.6087,
      "accuracy": 8
    },
    "promoter": "DARIANNYS FERRER",
    "creatorId": "STF-004",
    "created_at": "2026-10-19T08:06:12.000Z",
    "offlinePending": false,
    "batteryLevel": "93%"
  },
  {
    "id": "CHK-LIVE-1910-108",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "DE CANDIDO EXPRESS",
    "photoBase64": "/avatars/dariannys_ferrer.jpg",
    "location": {
      "lat": 10.6845,
      "lng": -71.6087,
      "accuracy": 6
    },
    "promoter": "DARIANNYS FERRER",
    "creatorId": "STF-004",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "48%"
  },
  {
    "id": "CHK-LIVE-1910-109",
    "date": "2026-10-19T08:08:12.000Z",
    "type": "Ingreso",
    "store": "FIORELLA SUPER MARKET. C.A.",
    "photoBase64": "/avatars/camila_morales.jpg",
    "location": {
      "lat": 10.6812,
      "lng": -71.6645,
      "accuracy": 9
    },
    "promoter": "CAMILA MORALES",
    "creatorId": "STF-005",
    "created_at": "2026-10-19T08:08:12.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-1910-110",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "FIORELLA SUPER MARKET. C.A.",
    "photoBase64": "/avatars/camila_morales.jpg",
    "location": {
      "lat": 10.6812,
      "lng": -71.6645,
      "accuracy": 6
    },
    "promoter": "CAMILA MORALES",
    "creatorId": "STF-005",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "49%"
  },
  {
    "id": "CHK-LIVE-1910-111",
    "date": "2026-10-19T08:10:12.000Z",
    "type": "Ingreso",
    "store": "COMERCIALIZADORA FC",
    "photoBase64": "/avatars/careliz_reyes.jpg",
    "location": {
      "lat": 10.6587,
      "lng": -71.641,
      "accuracy": 10
    },
    "promoter": "CARELIZ REYES",
    "creatorId": "STF-006",
    "created_at": "2026-10-19T08:10:12.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-1910-112",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "COMERCIALIZADORA FC",
    "photoBase64": "/avatars/careliz_reyes.jpg",
    "location": {
      "lat": 10.6587,
      "lng": -71.641,
      "accuracy": 6
    },
    "promoter": "CARELIZ REYES",
    "creatorId": "STF-006",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "50%"
  },
  {
    "id": "CHK-LIVE-1910-113",
    "date": "2026-10-19T08:12:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (AV DELICIAS)",
    "photoBase64": "/avatars/maria_almarza.jpg",
    "location": {
      "lat": 10.6721,
      "lng": -71.6198,
      "accuracy": 5
    },
    "promoter": "Maria de los Ángeles Almarza Arnedo",
    "creatorId": "STF-007",
    "created_at": "2026-10-19T08:12:12.000Z",
    "offlinePending": false,
    "batteryLevel": "96%"
  },
  {
    "id": "CHK-LIVE-1910-114",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (AV DELICIAS)",
    "photoBase64": "/avatars/maria_almarza.jpg",
    "location": {
      "lat": 10.6721,
      "lng": -71.6198,
      "accuracy": 6
    },
    "promoter": "Maria de los Ángeles Almarza Arnedo",
    "creatorId": "STF-007",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "51%"
  },
  {
    "id": "CHK-LIVE-1910-115",
    "date": "2026-10-19T08:14:12.000Z",
    "type": "Ingreso",
    "store": "SUPER TIENDA LA POPULAR 2024, C.A",
    "photoBase64": "/avatars/scarleth_pina.jpg",
    "location": {
      "lat": 10.6541,
      "lng": -71.6382,
      "accuracy": 6
    },
    "promoter": "SCARLETH PIÑA",
    "creatorId": "STF-008",
    "created_at": "2026-10-19T08:14:12.000Z",
    "offlinePending": false,
    "batteryLevel": "97%"
  },
  {
    "id": "CHK-LIVE-1910-116",
    "date": "2026-10-19T17:02:45.000Z",
    "type": "Salida",
    "store": "SUPER TIENDA LA POPULAR 2024, C.A",
    "photoBase64": "/avatars/scarleth_pina.jpg",
    "location": {
      "lat": 10.6541,
      "lng": -71.6382,
      "accuracy": 6
    },
    "promoter": "SCARLETH PIÑA",
    "creatorId": "STF-008",
    "created_at": "2026-10-19T17:02:45.000Z",
    "offlinePending": false,
    "batteryLevel": "52%"
  },
  {
    "id": "CHK-LIVE-1910-117",
    "date": "2026-10-19T08:16:12.000Z",
    "type": "Ingreso",
    "store": "INVERSIONES EL ARABITO, C.A",
    "photoBase64": "/avatars/ana_echeverria.jpg",
    "location": {
      "lat": 10.668,
      "lng": -71.625,
      "accuracy": 7
    },
    "promoter": "ana echeverria",
    "creatorId": "STF-010",
    "created_at": "2026-10-19T08:16:12.000Z",
    "offlinePending": false,
    "batteryLevel": "98%"
  },
  {
    "id": "CHK-LIVE-1910-118",
    "date": "2026-10-19T08:18:12.000Z",
    "type": "Ingreso",
    "store": "J&L MARKET 1, C.A",
    "photoBase64": "/avatars/osmairy_villasmil.jpg",
    "location": {
      "lat": 10.6412,
      "lng": -71.6231,
      "accuracy": 8
    },
    "promoter": "OSMAIRY VILLASMIL",
    "creatorId": "STF-011",
    "created_at": "2026-10-19T08:18:12.000Z",
    "offlinePending": false,
    "batteryLevel": "90%"
  },
  {
    "id": "CHK-LIVE-1910-119",
    "date": "2026-10-19T08:20:12.000Z",
    "type": "Ingreso",
    "store": "SUPER MARKET A&G, C.A.",
    "photoBase64": "/avatars/tania_cardenas.jpg",
    "location": {
      "lat": 10.671,
      "lng": -71.635,
      "accuracy": 9
    },
    "promoter": "TANIA CARDENAS",
    "creatorId": "STF-012",
    "created_at": "2026-10-19T08:20:12.000Z",
    "offlinePending": false,
    "batteryLevel": "91%"
  },
  {
    "id": "CHK-LIVE-1910-120",
    "date": "2026-10-19T08:22:12.000Z",
    "type": "Ingreso",
    "store": "FAMOSO HIPERMERCADO, C.A",
    "photoBase64": "/avatars/nairelis_antunez.jpg",
    "location": {
      "lat": 10.662,
      "lng": -71.629,
      "accuracy": 10
    },
    "promoter": "NAIRELIS ANTUNEZ",
    "creatorId": "STF-013",
    "created_at": "2026-10-19T08:22:12.000Z",
    "offlinePending": false,
    "batteryLevel": "92%"
  },
  {
    "id": "CHK-LIVE-1910-121",
    "date": "2026-10-19T08:24:12.000Z",
    "type": "Ingreso",
    "store": "SUPERMARKET J.D EXPRESS, C.A",
    "photoBase64": "/avatars/jaivelin_fereira.jpg",
    "location": {
      "lat": 10.653,
      "lng": -71.648,
      "accuracy": 5
    },
    "promoter": "JAIVELIN FEREIRA",
    "creatorId": "STF-014",
    "created_at": "2026-10-19T08:24:12.000Z",
    "offlinePending": false,
    "batteryLevel": "93%"
  },
  {
    "id": "CHK-LIVE-1910-122",
    "date": "2026-10-19T08:26:12.000Z",
    "type": "Ingreso",
    "store": "MINIMARKET I&F, C.A.",
    "photoBase64": "/avatars/ahyrlet_ruiz.jpg",
    "location": {
      "lat": 10.648,
      "lng": -71.631,
      "accuracy": 6
    },
    "promoter": "AHYRLET RUIZ",
    "creatorId": "STF-016",
    "created_at": "2026-10-19T08:26:12.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-1910-123",
    "date": "2026-10-19T08:28:12.000Z",
    "type": "Ingreso",
    "store": "VARIEDADES Y DISTRIBUIDORA BRAYAN, C.A",
    "photoBase64": "/avatars/valeria_acevedo.jpg",
    "location": {
      "lat": 10.679,
      "lng": -71.652,
      "accuracy": 7
    },
    "promoter": "VALERIA ACEVEDO",
    "creatorId": "STF-017",
    "created_at": "2026-10-19T08:28:12.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-1910-124",
    "date": "2026-10-19T08:00:12.000Z",
    "type": "Ingreso",
    "store": "AUTOMERCADO LA ABUELA, C.A.",
    "photoBase64": "/avatars/claudia_alvarez.jpg",
    "location": {
      "lat": 10.661,
      "lng": -71.615,
      "accuracy": 8
    },
    "promoter": "CLAUDIA ALVAREZ",
    "creatorId": "STF-018",
    "created_at": "2026-10-19T08:00:12.000Z",
    "offlinePending": false,
    "batteryLevel": "96%"
  },
  {
    "id": "CHK-LIVE-1910-125",
    "date": "2026-10-19T08:02:12.000Z",
    "type": "Ingreso",
    "store": "OLIMPICA MAYORISTA",
    "photoBase64": "/avatars/jelary_acosta.jpg",
    "location": {
      "lat": 10.674,
      "lng": -71.621,
      "accuracy": 9
    },
    "promoter": "JELARY ACOSTA",
    "creatorId": "STF-019",
    "created_at": "2026-10-19T08:02:12.000Z",
    "offlinePending": false,
    "batteryLevel": "97%"
  },
  {
    "id": "CHK-LIVE-1910-126",
    "date": "2026-10-19T08:04:12.000Z",
    "type": "Ingreso",
    "store": "OLIMPICA SÚPER MARKET",
    "photoBase64": "/avatars/mariangel_valdivieso.jpg",
    "location": {
      "lat": 10.682,
      "lng": -71.614,
      "accuracy": 10
    },
    "promoter": "MARIANGEL VALDIVIESO",
    "creatorId": "STF-020",
    "created_at": "2026-10-19T08:04:12.000Z",
    "offlinePending": false,
    "batteryLevel": "98%"
  },
  {
    "id": "CHK-LIVE-1910-127",
    "date": "2026-10-19T08:06:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (SAN FELIPE)",
    "photoBase64": "/avatars/angelica_sanchez.jpg",
    "location": {
      "lat": 10.5982,
      "lng": -71.6543,
      "accuracy": 5
    },
    "promoter": "ANGELICA SANCHEZ",
    "creatorId": "STF-021",
    "created_at": "2026-10-19T08:06:12.000Z",
    "offlinePending": false,
    "batteryLevel": "90%"
  },
  {
    "id": "CHK-LIVE-1910-128",
    "date": "2026-10-19T08:08:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (PLAZA BARALT)",
    "photoBase64": "/avatars/eneliangela_gonzalez.jpg",
    "location": {
      "lat": 10.6415,
      "lng": -71.613,
      "accuracy": 6
    },
    "promoter": "ENELIANGELA GONZALEZ",
    "creatorId": "STF-022",
    "created_at": "2026-10-19T08:08:12.000Z",
    "offlinePending": false,
    "batteryLevel": "91%"
  },
  {
    "id": "CHK-LIVE-1910-129",
    "date": "2026-10-19T08:10:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (LA COROMOTO)",
    "photoBase64": "/avatars/marianyel_aranda.jpg",
    "location": {
      "lat": 10.601,
      "lng": -71.662,
      "accuracy": 7
    },
    "promoter": "MARIANYEL ARANDA",
    "creatorId": "STF-024",
    "created_at": "2026-10-19T08:10:12.000Z",
    "offlinePending": false,
    "batteryLevel": "92%"
  },
  {
    "id": "CHK-LIVE-1910-130",
    "date": "2026-10-19T08:12:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (DR. PORTILLO)",
    "photoBase64": "/avatars/juliannys_gil.jpg",
    "location": {
      "lat": 10.669,
      "lng": -71.611,
      "accuracy": 8
    },
    "promoter": "JULIANNYS GIL",
    "creatorId": "STF-025",
    "created_at": "2026-10-19T08:12:12.000Z",
    "offlinePending": false,
    "batteryLevel": "93%"
  },
  {
    "id": "CHK-LIVE-1910-131",
    "date": "2026-10-19T08:14:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (CABIMAS)",
    "photoBase64": "/avatars/jose_barroso.jpg",
    "location": {
      "lat": 10.395,
      "lng": -71.452,
      "accuracy": 9
    },
    "promoter": "JOSE BARROSO",
    "creatorId": "STF-026",
    "created_at": "2026-10-19T08:14:12.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-1910-132",
    "date": "2026-10-19T08:16:12.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (ZONA INDUSTRIAL)",
    "photoBase64": "/avatars/zioreli_grangger.jpg",
    "location": {
      "lat": 10.612,
      "lng": -71.674,
      "accuracy": 10
    },
    "promoter": "ZIORELI GRANGGER",
    "creatorId": "STF-027",
    "created_at": "2026-10-19T08:16:12.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-2010-133",
    "date": "2026-10-20T08:00:30.000Z",
    "type": "Ingreso",
    "store": "SUPERMARKET FIORELLA EXPRESS, C.A.",
    "photoBase64": "/avatars/nicole_godoy.jpg",
    "location": {
      "lat": 10.6934,
      "lng": -71.6324,
      "accuracy": 4
    },
    "promoter": "NICOLE GODOY",
    "creatorId": "STF-001",
    "created_at": "2026-10-20T08:00:30.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-2010-134",
    "date": "2026-10-20T08:02:30.000Z",
    "type": "Ingreso",
    "store": "MULTITIENDAS FARMAPLUS GRAN BAZAR, C.A",
    "photoBase64": "/avatars/fernanda_leon.jpg",
    "location": {
      "lat": 10.6431,
      "lng": -71.6119,
      "accuracy": 5
    },
    "promoter": "FERNANDA LEON",
    "creatorId": "STF-002",
    "created_at": "2026-10-20T08:02:30.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-2010-135",
    "date": "2026-10-20T08:04:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO LA LIMPIA",
    "photoBase64": "/avatars/nismary_derizan.jpg",
    "location": {
      "lat": 10.6654,
      "lng": -71.6482,
      "accuracy": 6
    },
    "promoter": "NISMARY DERIZAN",
    "creatorId": "STF-003",
    "created_at": "2026-10-20T08:04:30.000Z",
    "offlinePending": false,
    "batteryLevel": "96%"
  },
  {
    "id": "CHK-LIVE-2010-136",
    "date": "2026-10-20T08:06:30.000Z",
    "type": "Ingreso",
    "store": "DE CANDIDO EXPRESS",
    "photoBase64": "/avatars/dariannys_ferrer.jpg",
    "location": {
      "lat": 10.6845,
      "lng": -71.6087,
      "accuracy": 7
    },
    "promoter": "DARIANNYS FERRER",
    "creatorId": "STF-004",
    "created_at": "2026-10-20T08:06:30.000Z",
    "offlinePending": false,
    "batteryLevel": "97%"
  },
  {
    "id": "CHK-LIVE-2010-137",
    "date": "2026-10-20T08:08:30.000Z",
    "type": "Ingreso",
    "store": "FIORELLA SUPER MARKET. C.A.",
    "photoBase64": "/avatars/camila_morales.jpg",
    "location": {
      "lat": 10.6812,
      "lng": -71.6645,
      "accuracy": 8
    },
    "promoter": "CAMILA MORALES",
    "creatorId": "STF-005",
    "created_at": "2026-10-20T08:08:30.000Z",
    "offlinePending": false,
    "batteryLevel": "98%"
  },
  {
    "id": "CHK-LIVE-2010-138",
    "date": "2026-10-20T08:10:30.000Z",
    "type": "Ingreso",
    "store": "COMERCIALIZADORA FC",
    "photoBase64": "/avatars/careliz_reyes.jpg",
    "location": {
      "lat": 10.6587,
      "lng": -71.641,
      "accuracy": 4
    },
    "promoter": "CARELIZ REYES",
    "creatorId": "STF-006",
    "created_at": "2026-10-20T08:10:30.000Z",
    "offlinePending": false,
    "batteryLevel": "99%"
  },
  {
    "id": "CHK-LIVE-2010-139",
    "date": "2026-10-20T08:12:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (AV DELICIAS)",
    "photoBase64": "/avatars/maria_almarza.jpg",
    "location": {
      "lat": 10.6721,
      "lng": -71.6198,
      "accuracy": 5
    },
    "promoter": "Maria de los Ángeles Almarza Arnedo",
    "creatorId": "STF-007",
    "created_at": "2026-10-20T08:12:30.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-2010-140",
    "date": "2026-10-20T08:14:30.000Z",
    "type": "Ingreso",
    "store": "SUPER TIENDA LA POPULAR 2024, C.A",
    "photoBase64": "/avatars/scarleth_pina.jpg",
    "location": {
      "lat": 10.6541,
      "lng": -71.6382,
      "accuracy": 6
    },
    "promoter": "SCARLETH PIÑA",
    "creatorId": "STF-008",
    "created_at": "2026-10-20T08:14:30.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-2010-141",
    "date": "2026-10-20T08:16:30.000Z",
    "type": "Ingreso",
    "store": "INVERSIONES EL ARABITO, C.A",
    "photoBase64": "/avatars/ana_echeverria.jpg",
    "location": {
      "lat": 10.668,
      "lng": -71.625,
      "accuracy": 7
    },
    "promoter": "ana echeverria",
    "creatorId": "STF-010",
    "created_at": "2026-10-20T08:16:30.000Z",
    "offlinePending": false,
    "batteryLevel": "96%"
  },
  {
    "id": "CHK-LIVE-2010-142",
    "date": "2026-10-20T08:18:30.000Z",
    "type": "Ingreso",
    "store": "J&L MARKET 1, C.A",
    "photoBase64": "/avatars/osmairy_villasmil.jpg",
    "location": {
      "lat": 10.6412,
      "lng": -71.6231,
      "accuracy": 8
    },
    "promoter": "OSMAIRY VILLASMIL",
    "creatorId": "STF-011",
    "created_at": "2026-10-20T08:18:30.000Z",
    "offlinePending": false,
    "batteryLevel": "97%"
  },
  {
    "id": "CHK-LIVE-2010-143",
    "date": "2026-10-20T08:20:30.000Z",
    "type": "Ingreso",
    "store": "SUPER MARKET A&G, C.A.",
    "photoBase64": "/avatars/tania_cardenas.jpg",
    "location": {
      "lat": 10.671,
      "lng": -71.635,
      "accuracy": 4
    },
    "promoter": "TANIA CARDENAS",
    "creatorId": "STF-012",
    "created_at": "2026-10-20T08:20:30.000Z",
    "offlinePending": false,
    "batteryLevel": "98%"
  },
  {
    "id": "CHK-LIVE-2010-144",
    "date": "2026-10-20T08:22:30.000Z",
    "type": "Ingreso",
    "store": "FAMOSO HIPERMERCADO, C.A",
    "photoBase64": "/avatars/nairelis_antunez.jpg",
    "location": {
      "lat": 10.662,
      "lng": -71.629,
      "accuracy": 5
    },
    "promoter": "NAIRELIS ANTUNEZ",
    "creatorId": "STF-013",
    "created_at": "2026-10-20T08:22:30.000Z",
    "offlinePending": false,
    "batteryLevel": "99%"
  },
  {
    "id": "CHK-LIVE-2010-145",
    "date": "2026-10-20T08:24:30.000Z",
    "type": "Ingreso",
    "store": "SUPERMARKET J.D EXPRESS, C.A",
    "photoBase64": "/avatars/jaivelin_fereira.jpg",
    "location": {
      "lat": 10.653,
      "lng": -71.648,
      "accuracy": 6
    },
    "promoter": "JAIVELIN FEREIRA",
    "creatorId": "STF-014",
    "created_at": "2026-10-20T08:24:30.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-2010-146",
    "date": "2026-10-20T08:01:30.000Z",
    "type": "Ingreso",
    "store": "MINIMARKET I&F, C.A.",
    "photoBase64": "/avatars/ahyrlet_ruiz.jpg",
    "location": {
      "lat": 10.648,
      "lng": -71.631,
      "accuracy": 7
    },
    "promoter": "AHYRLET RUIZ",
    "creatorId": "STF-016",
    "created_at": "2026-10-20T08:01:30.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-2010-147",
    "date": "2026-10-20T08:03:30.000Z",
    "type": "Ingreso",
    "store": "VARIEDADES Y DISTRIBUIDORA BRAYAN, C.A",
    "photoBase64": "/avatars/valeria_acevedo.jpg",
    "location": {
      "lat": 10.679,
      "lng": -71.652,
      "accuracy": 8
    },
    "promoter": "VALERIA ACEVEDO",
    "creatorId": "STF-017",
    "created_at": "2026-10-20T08:03:30.000Z",
    "offlinePending": false,
    "batteryLevel": "96%"
  },
  {
    "id": "CHK-LIVE-2010-148",
    "date": "2026-10-20T08:05:30.000Z",
    "type": "Ingreso",
    "store": "AUTOMERCADO LA ABUELA, C.A.",
    "photoBase64": "/avatars/claudia_alvarez.jpg",
    "location": {
      "lat": 10.661,
      "lng": -71.615,
      "accuracy": 4
    },
    "promoter": "CLAUDIA ALVAREZ",
    "creatorId": "STF-018",
    "created_at": "2026-10-20T08:05:30.000Z",
    "offlinePending": false,
    "batteryLevel": "97%"
  },
  {
    "id": "CHK-LIVE-2010-149",
    "date": "2026-10-20T08:07:30.000Z",
    "type": "Ingreso",
    "store": "OLIMPICA MAYORISTA",
    "photoBase64": "/avatars/jelary_acosta.jpg",
    "location": {
      "lat": 10.674,
      "lng": -71.621,
      "accuracy": 5
    },
    "promoter": "JELARY ACOSTA",
    "creatorId": "STF-019",
    "created_at": "2026-10-20T08:07:30.000Z",
    "offlinePending": false,
    "batteryLevel": "98%"
  },
  {
    "id": "CHK-LIVE-2010-150",
    "date": "2026-10-20T08:09:30.000Z",
    "type": "Ingreso",
    "store": "OLIMPICA SÚPER MARKET",
    "photoBase64": "/avatars/mariangel_valdivieso.jpg",
    "location": {
      "lat": 10.682,
      "lng": -71.614,
      "accuracy": 6
    },
    "promoter": "MARIANGEL VALDIVIESO",
    "creatorId": "STF-020",
    "created_at": "2026-10-20T08:09:30.000Z",
    "offlinePending": false,
    "batteryLevel": "99%"
  },
  {
    "id": "CHK-LIVE-2010-151",
    "date": "2026-10-20T08:11:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (SAN FELIPE)",
    "photoBase64": "/avatars/angelica_sanchez.jpg",
    "location": {
      "lat": 10.5982,
      "lng": -71.6543,
      "accuracy": 7
    },
    "promoter": "ANGELICA SANCHEZ",
    "creatorId": "STF-021",
    "created_at": "2026-10-20T08:11:30.000Z",
    "offlinePending": false,
    "batteryLevel": "94%"
  },
  {
    "id": "CHK-LIVE-2010-152",
    "date": "2026-10-20T08:13:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (PLAZA BARALT)",
    "photoBase64": "/avatars/eneliangela_gonzalez.jpg",
    "location": {
      "lat": 10.6415,
      "lng": -71.613,
      "accuracy": 8
    },
    "promoter": "ENELIANGELA GONZALEZ",
    "creatorId": "STF-022",
    "created_at": "2026-10-20T08:13:30.000Z",
    "offlinePending": false,
    "batteryLevel": "95%"
  },
  {
    "id": "CHK-LIVE-2010-153",
    "date": "2026-10-20T08:15:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (LA COROMOTO)",
    "photoBase64": "/avatars/marianyel_aranda.jpg",
    "location": {
      "lat": 10.601,
      "lng": -71.662,
      "accuracy": 4
    },
    "promoter": "MARIANYEL ARANDA",
    "creatorId": "STF-024",
    "created_at": "2026-10-20T08:15:30.000Z",
    "offlinePending": false,
    "batteryLevel": "96%"
  },
  {
    "id": "CHK-LIVE-2010-154",
    "date": "2026-10-20T08:17:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (DR. PORTILLO)",
    "photoBase64": "/avatars/juliannys_gil.jpg",
    "location": {
      "lat": 10.669,
      "lng": -71.611,
      "accuracy": 5
    },
    "promoter": "JULIANNYS GIL",
    "creatorId": "STF-025",
    "created_at": "2026-10-20T08:17:30.000Z",
    "offlinePending": false,
    "batteryLevel": "97%"
  },
  {
    "id": "CHK-LIVE-2010-155",
    "date": "2026-10-20T08:19:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (CABIMAS)",
    "photoBase64": "/avatars/jose_barroso.jpg",
    "location": {
      "lat": 10.395,
      "lng": -71.452,
      "accuracy": 6
    },
    "promoter": "JOSE BARROSO",
    "creatorId": "STF-026",
    "created_at": "2026-10-20T08:19:30.000Z",
    "offlinePending": false,
    "batteryLevel": "98%"
  },
  {
    "id": "CHK-LIVE-2010-156",
    "date": "2026-10-20T08:21:30.000Z",
    "type": "Ingreso",
    "store": "ALKOSTO DONDE COMPRAR ES GANAR, C.A. (ZONA INDUSTRIAL)",
    "photoBase64": "/avatars/zioreli_grangger.jpg",
    "location": {
      "lat": 10.612,
      "lng": -71.674,
      "accuracy": 7
    },
    "promoter": "ZIORELI GRANGGER",
    "creatorId": "STF-027",
    "created_at": "2026-10-20T08:21:30.000Z",
    "offlinePending": false,
    "batteryLevel": "99%"
  }
];

export const checkinsService = {
  /**
   * Obtiene todos los checkins (servidor / supabase + local fallback)
   */
  async getAllCheckIns(): Promise<CheckInRecord[]> {
    // Los registros CHK-LIVE-* son datos semilla de demostración (no son marcajes reales de promotoras)
    const isRealRecord = (c: CheckInRecord) =>
      c && c.id &&
      !/^CHK-LIVE-/i.test(c.id) &&
      !c.id.startsWith('chk-00') &&
      !c.store?.includes("Palos Grandes") &&
      !c.photoBase64?.includes('unsplash');

    let serverList: CheckInRecord[] = [];
    try {
      const response = await fetch('/api/checkins');
      if (response.ok) {
        const contentType = response.headers?.get?.('content-type') || 'application/json';
        if (contentType.includes('application/json') || !contentType.includes('text/html')) {
          const data = await response.json();
          if (Array.isArray(data)) {
            serverList = data.filter(isRealRecord);
          }
        }
      }
    } catch {
      // Si la red falla o está offline, continuar con Supabase directo / almacenamiento local
    }

    const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
    if (!isTestEnv && serverList.length === 0) {
      try {
        const { data: sbData, error: sbErr } = await supabase
          .from('checkins')
          .select('id,date,store,type,location,creatorId,promoter,created_at')
          .order('date', { ascending: false })
          .limit(2000);
        if (!sbErr && Array.isArray(sbData) && sbData.length > 0) {
          serverList = (sbData as any[])
            .map((row) => ({
              id: String(row.id),
              date: row.date || row.created_at || new Date().toISOString(),
              type: row.type,
              store: String(row.store || 'Punto de Venta').trim(),
              photoBase64: `/api/checkins/${encodeURIComponent(String(row.id))}/photo`,
              location: row.location || { lat: 0, lng: 0, accuracy: 0 },
              promoter: String(row.promoter || ''),
              creatorId: String(row.creatorId || ''),
              created_at: row.created_at || row.date || new Date().toISOString(),
              offlinePending: false,
            }))
            .filter(isRealRecord);
        }
      } catch {
        // Ignorar error directo de Supabase
      }
    }

    let localList: CheckInRecord[] = [];
    const local = localStorage.getItem(STORAGE_KEY_CHECKINS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          localList = parsed.filter(isRealRecord);
        }
      } catch (e) {
        console.warn('Error leyendo checkins locales:', e);
      }
    }

    // El servidor es la fuente de verdad: los registros locales solo se conservan si están pendientes
    // de sincronizar (offline) o si el servidor no respondió.
    const serverIds = new Set(serverList.map((c) => c.id));
    const localToKeep = serverList.length > 0
      ? localList.filter((c) => c.offlinePending && !serverIds.has(c.id))
      : localList;

    const map = new Map<string, CheckInRecord>();
    [...serverList, ...localToKeep].forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });

    const merged = normalizeAndDeduplicateCheckIns(Array.from(map.values()));
    this.persistLocalCheckIns(merged);
    return merged;
  },

  /**
   * Guarda la copia local sin fotos pesadas (evita exceder la cuota de localStorage)
   */
  persistLocalCheckIns(list: CheckInRecord[]) {
    try {
      const light = list.map((c) =>
        !c.offlinePending && c.photoBase64?.startsWith('data:')
          ? { ...c, photoBase64: `/api/checkins/${encodeURIComponent(c.id)}/photo` }
          : c
      );
      localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(light));
    } catch (e) {
      console.warn('No se pudo guardar la copia local de asistencias:', e);
    }
  },

  /**
   * Guarda un nuevo checkin (online o en cola offline)
   */
  async createCheckIn(record: Omit<CheckInRecord, 'id' | 'created_at'>): Promise<{ record: CheckInRecord; isOffline: boolean }> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const newRecord: CheckInRecord = {
      ...record,
      id: 'chk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
      offlinePending: !isOnline
    };

    // Actualizar almacenamiento local de inmediato
    const existing = await this.getAllCheckIns();
    const updated = [newRecord, ...existing];
    this.persistLocalCheckIns(updated);

    // Si está offline, guardar en la cola de sincronización
    if (!isOnline) {
      this.enqueueOfflineCheckIn(newRecord);
      this.notifySync();
      return { record: newRecord, isOffline: true };
    }

    // Si está online, enviar al servidor / backend
    try {
      if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
        const response = await fetch(`${window.location.origin}/api/checkins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord)
        });
        if (response.ok) {
          const serverRecord = await response.json();
          newRecord.offlinePending = false;
          // Refrescar registro en local
          const refreshed = updated.map(r => r.id === newRecord.id ? { ...newRecord, ...serverRecord, offlinePending: false } : r);
          this.persistLocalCheckIns(refreshed);
        } else {
          // Si el backend responde con error, encolar para reintento
          this.enqueueOfflineCheckIn(newRecord);
        }
      } else {
        this.enqueueOfflineCheckIn(newRecord);
      }
    } catch (err) {
      this.enqueueOfflineCheckIn(newRecord);
    }

    this.notifySync();
    return { record: newRecord, isOffline: false };
  },

  /**
   * Encola un check-in para sincronización posterior
   */
  enqueueOfflineCheckIn(record: CheckInRecord) {
    try {
      const queueRaw = localStorage.getItem(STORAGE_KEY_QUEUE);
      const queue: CheckInRecord[] = queueRaw ? JSON.parse(queueRaw) : [];
      // Evitar duplicados en cola
      if (!queue.some(q => q.id === record.id)) {
        queue.push(record);
        localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
      }
    } catch (e) {
      console.error('Error encolando check-in offline:', e);
    }
  },

  /**
   * Obtiene la cantidad de registros pendientes en cola offline
   */
  getOfflineQueue(): CheckInRecord[] {
    try {
      const queueRaw = localStorage.getItem(STORAGE_KEY_QUEUE);
      return queueRaw ? JSON.parse(queueRaw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Vacía y sincroniza la cola offline hacia el servidor
   */
  async flushOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

    let syncedCount = 0;
    const remaining: CheckInRecord[] = [];

    for (const item of queue) {
      try {
        const res = await fetch('/api/checkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(remaining));

    // Marcar registros locales como sincronizados
    if (syncedCount > 0) {
      const current = await this.getAllCheckIns();
      const updated = current.map(item => {
        if (!remaining.some(r => r.id === item.id)) {
          return { ...item, offlinePending: false };
        }
        return item;
      });
      this.persistLocalCheckIns(updated);
      this.notifySync();
    }

    return { syncedCount, remainingCount: remaining.length };
  },

  /**
   * Elimina un registro de asistencia (para auditoría o pruebas)
   */
  async deleteCheckIn(id: string): Promise<boolean> {
    try {
      await fetch(`/api/checkins/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Error borrando en servidor:', e);
    }

    const current = await this.getAllCheckIns();
    const filtered = current.filter(c => c.id !== id);
    this.persistLocalCheckIns(filtered);

    // Limpiar también de la cola si estuviera
    const queue = this.getOfflineQueue().filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));

    this.notifySync();
    return true;
  },

  /**
   * Notifica a otras ventanas y componentes que hubo un cambio
   */
  notifySync() {
    try {
      syncChannel?.postMessage({ type: 'CHECKINS_UPDATED', timestamp: Date.now() });
      window.dispatchEvent(new Event('codizulca_checkins_changed'));
    } catch {
      // Ignorar errores de postMessage
    }
  },

  /**
   * Suscribe a cambios en asistencias
   */
  subscribe(callback: () => void): () => void {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_CHECKINS || e.key === STORAGE_KEY_QUEUE) {
        callback();
      }
    };
    const handleCustom = () => callback();
    const handleChannel = (event: MessageEvent) => {
      if (event.data?.type === 'CHECKINS_UPDATED') {
        callback();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('codizulca_checkins_changed', handleCustom);
    syncChannel?.addEventListener('message', handleChannel);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('codizulca_checkins_changed', handleCustom);
      syncChannel?.removeEventListener('message', handleChannel);
    };
  }
};
