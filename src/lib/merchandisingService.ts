/**
 * Submódulo de Merchandising (Informes y Certificación de Visita en PDV)
 * Tipos, servicio de persistencia y sincronización bidireccional
 */

export interface MerchandisingReport {
  id: string;
  type?: 'Merchandising';
  date: string;                     // 'YYYY-MM-DD'
  time?: string;                    // 'HH:MM'
  store: string;                    // Nombre de la tienda
  address?: string;                 // Dirección o sucursal
  promoter: string;                 // Nombre del mercaderista
  storeManagerName: string;         // Nombre del encargado
  storeManagerRole: string;         // Cargo (Encargado, Gerente, etc.)
  storeManagerPhone?: string;       // Teléfono de contacto
  visitReason?: string;             // Motivo de la visita
  activities: string[];             // Array de labores seleccionadas
  product?: string;                 // Marcas/SKUs trabajados
  observations?: string;            // Notas y hallazgos
  signature: string;                // Base64 PNG del trazo digital
  signedAt: string;                 // Timestamp ISO de la firma
  certified: boolean;               // Flag de certificación válida (true)
  photos?: string[];                // Array de hasta 6 URLs/Base64 JPEG
  category?: string;                // Categoría de anaquel (Embutidos, etc.)
  metrics?: {
    ourFacings: number;
    competitorFacings: number;
    totalFacings: number;
    shareOfShelfPercent: number;
    shelfLevel: string;
    outOfStockDetected: boolean;
    popDetected: boolean;
  };
  alerts?: string[];
  aiRecommendations?: {
    visibilityScore: number;
    marketPositionStatus: string;
    marketDiagnostic: string;
    criticalObservations: string[];
    clientRecommendations: Array<{
      title: string;
      action: string;
      expectedBenefit: string;
    }>;
    projectedSalesLift: string;
    executiveSummaryForStoreManager: string;
  };
  created_at?: string;              // Timestamp de creación
}

export const MERCHANDISING_ACTIVITIES = [
  'Exhibición y Ajuste de Planograma',
  'Limpieza y Organización de Anaquel',
  'Reposición de Frentes y Rotación (FIFO)',
  'Chequeo de Precios y Señalización',
  'Colocación de Material POP',
  'Verificación de Agotados / Quiebres de Stock'
] as const;

export const STORE_MANAGER_ROLES = [
  'Encargado de Tienda',
  'Pasillero Jefe',
  'Gerente de Sucursal',
  'Propietario / Dueño',
  'Jefe de Piso de Venta',
  'Supervisor de Compras'
] as const;

const STORAGE_KEY = 'codizulca_merchandising_reports';

import { supabase } from './supabase';
import { ensureCampoUuid, resolvePromoterNameFromRaw, campoService } from './campoService';

// Firma dummy vectorizada en base64 PNG para la semilla
const SAMPLE_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFmElEQVR4nO3dX2jbVRzH8c/vnpq0dcuapN1K7Wbttm4dtqXQ1s7/88a2oYzBEGQggyHYHwYyjA2EZdChbAyEDWSD4f4gCIIMhjLGsK0oQ7C1yhr/2qRpnTZpk7Zp8/s6D657b9q69Nfk3vTz';

export const INITIAL_MERCHANDISING_REPORTS: MerchandisingReport[] = [];

export function mapSupabaseMerchRowToReport(row: any): MerchandisingReport {
  if (row && Array.isArray(row.activities) && row.storeManagerName) {
    return {
      ...row,
      id: String(row.id),
      type: 'Merchandising',
      promoter: resolvePromoterNameFromRaw(row.promoter, (row as any).creatorId),
      signature: row.signature || SAMPLE_SIGNATURE,
      certified: row.certified !== undefined ? Boolean(row.certified) : true,
      photos: Array.isArray(row.photos) ? row.photos : [],
      created_at: row.created_at || row.signedAt || row.date || new Date().toISOString(),
    };
  }

  let c: any = {};
  if (typeof row?.comments === 'string' && row.comments.trim().startsWith('{')) {
    try {
      c = JSON.parse(row.comments);
    } catch {
      c = {};
    }
  } else if (row?.comments && typeof row.comments === 'object') {
    c = row.comments;
  }

  const rawDate = String(row?.date || c?.date || row?.created_at || new Date().toISOString());
  return {
    id: String(row?.id || ensureCampoUuid(undefined, `${rawDate}|${row?.promoter}|${row?.store}`)),
    type: 'Merchandising',
    date: rawDate.split('T')[0],
    time:
      c?.time ||
      (row?.created_at
        ? new Date(row.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
        : '09:00 a.m.'),
    store: String(row?.store || c?.store || 'Punto de Venta').trim(),
    address: String(c?.address || row?.address || '').trim(),
    promoter: resolvePromoterNameFromRaw(row?.promoter || c?.promoter, row?.creatorId),
    storeManagerName: String(c?.storeManagerName || row?.storeManagerName || 'Encargado de Tienda').trim(),
    storeManagerRole: String(c?.storeManagerRole || row?.storeManagerRole || 'Encargado de PDV').trim(),
    storeManagerPhone: String(c?.storeManagerPhone || row?.storeManagerPhone || '').trim(),
    visitReason: String(c?.visitReason || row?.visitReason || 'Visita de Merchandising y Certificación PDV').trim(),
    activities:
      Array.isArray(c?.activities) && c.activities.length > 0
        ? c.activities
        : ['Exhibición y Ajuste de Planograma'],
    product: String(row?.product || c?.product || 'General').trim(),
    observations: String(c?.observations || row?.observations || '').trim(),
    signature: c?.signature || row?.signature || SAMPLE_SIGNATURE,
    signedAt: c?.signedAt || row?.signedAt || row?.created_at || rawDate,
    certified: c?.certified !== undefined ? Boolean(c.certified) : true,
    photos: Array.isArray(c?.photos) ? c.photos : Array.isArray(row?.photos) ? row.photos : [],
    category: c?.category || row?.category,
    metrics: c?.metrics || row?.metrics,
    alerts: c?.alerts || row?.alerts,
    aiRecommendations: c?.aiRecommendations || row?.aiRecommendations,
    created_at: row?.created_at || c?.signedAt || rawDate,
  };
}

function saveMerchToLocalStorageSafe(items: MerchandisingReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    try {
      const compact = items.map((item, idx) => ({
        ...item,
        photos: idx < 5 ? item.photos : [],
        signature: idx < 15 ? item.signature : SAMPLE_SIGNATURE,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // ignore storage quota errors
    }
  }
}

export const merchandisingService = {
  async getAll(): Promise<MerchandisingReport[]> {
    let serverMerch: MerchandisingReport[] = [];
    let serverScans: any[] = [];

    try {
      const res = await fetch('/api/merchandising');
      if (res.ok) {
        const contentType = res.headers?.get?.('content-type') || 'application/json';
        if (contentType.includes('application/json') || !contentType.includes('text/html')) {
          const data = await res.json();
          if (Array.isArray(data)) serverMerch = data.map(mapSupabaseMerchRowToReport);
        }
      }
    } catch {}

    const isTestEnv =
      typeof process !== 'undefined' &&
      Boolean(process.env?.NODE_ENV === 'test' || process.env?.VITEST);
    if (!isTestEnv && serverMerch.length === 0) {
      try {
        const { data: sbMerch, error: sbErr } = await supabase
          .from('surveys')
          .select('*')
          .eq('type', 'Merchandising')
          .order('date', { ascending: false })
          .limit(200);
        if (!sbErr && Array.isArray(sbMerch) && sbMerch.length > 0) {
          serverMerch = sbMerch.map(mapSupabaseMerchRowToReport);
        }
      } catch {
        // ignore direct Supabase error
      }
    }

    try {
      const resScans = await fetch('/api/shelf-scans');
      if (resScans.ok) {
        const dataScans = await resScans.json();
        if (Array.isArray(dataScans)) serverScans = dataScans;
      }
    } catch {}

    let localScans: any[] = [];
    try {
      const rawScans = localStorage.getItem('codizulca_shelf_scans');
      if (rawScans) {
        const parsed = JSON.parse(rawScans);
        if (Array.isArray(parsed)) localScans = parsed;
      }
    } catch {}

    let localMerch: MerchandisingReport[] = [];
    try {
      const rawMerch = localStorage.getItem(STORAGE_KEY);
      if (rawMerch) {
        const parsed = JSON.parse(rawMerch);
        if (Array.isArray(parsed)) {
          localMerch = parsed.filter((r: MerchandisingReport) =>
            !r.id?.startsWith('MERCH-REP-00') &&
            !r.store?.includes('Palos Grandes') &&
            !r.photos?.some((p) => p.includes('unsplash'))
          );
        }
      }
    } catch {}

    const allScansMap = new Map<string, any>();
    [...serverScans, ...localScans].forEach((s) => {
      if (s && s.id) allScansMap.set(s.id, s);
    });

    // Combinar reportes de merchandising con escaneos de góndola IA
    const scanReports: MerchandisingReport[] = Array.from(allScansMap.values()).map((s) => ({
      id: s.id || ('SCAN-' + Date.now().toString().slice(-6)),
      type: 'Merchandising',
      date: s.date ? s.date.split('T')[0] : new Date().toISOString().split('T')[0],
      time: s.date ? new Date(s.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '10:00',
      store: s.store,
      address: s.address || `Categoría: ${s.category || 'Embutidos y Refrigerados'}`,
      promoter: s.promoter || 'Jose Barroso',
      storeManagerName: s.storeManagerName || 'Encargado de Tienda',
      storeManagerRole: s.storeManagerRole || 'Gerente de PDV',
      visitReason: 'Escaneo Inteligente de Góndola & Diagnóstico IA',
      activities: [
        'Escaneo Inteligente de Góndolas (IA)',
        'Auditoría de Planograma & Visibilidad',
        'Medición de Share of Shelf',
        ...(s.metrics?.outOfStockDetected ? ['Detección de Quiebres de Stock'] : []),
        ...(s.metrics?.popDetected ? ['Verificación de Material POP'] : [])
      ],
      product: s.category || 'Embutidos y Charcutería',
      observations: s.aiRecommendations?.marketDiagnostic || `Auditoría IA de Góndola: Share of Shelf ${s.metrics?.shareOfShelfPercent}%. Frentes propios: ${s.metrics?.ourFacings}.`,
      signature: s.signature || SAMPLE_SIGNATURE,
      signedAt: s.date || new Date().toISOString(),
      certified: true,
      photos: s.photos && s.photos.length > 0 ? s.photos : [],
      category: s.category,
      metrics: s.metrics,
      alerts: s.alerts,
      aiRecommendations: s.aiRecommendations,
      created_at: s.created_at || s.date || new Date().toISOString()
    }));

    // Combinar y eliminar duplicados por ID
    const combined = [...scanReports, ...localMerch, ...serverMerch];
    const uniqueMap = new Map<string, MerchandisingReport>();
    combined.forEach((item) => {
      if (item && item.id) uniqueMap.set(item.id, item);
    });

    if (uniqueMap.size > 0) {
      const result = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime()
      );
      saveMerchToLocalStorageSafe(result);
      return result;
    }

    saveMerchToLocalStorageSafe(INITIAL_MERCHANDISING_REPORTS);
    return INITIAL_MERCHANDISING_REPORTS;
  },

  async create(report: Omit<MerchandisingReport, 'id' | 'created_at'>): Promise<MerchandisingReport> {
    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : ensureCampoUuid(undefined, `${report.date}|${report.promoter}|${report.store}|${Date.now()}`);
    const newRecord: MerchandisingReport = {
      ...report,
      id: generatedId,
      created_at: new Date().toISOString()
    };

    try {
      const rawMerch = localStorage.getItem(STORAGE_KEY);
      const parsed = rawMerch ? JSON.parse(rawMerch) : [];
      const current = Array.isArray(parsed) ? parsed : [];
      saveMerchToLocalStorageSafe([newRecord, ...current.filter((r: any) => r?.id !== newRecord.id)]);
    } catch {}

    let syncedDirectSupabase = false;
    try {
      const dbRow: Record<string, any> = {
        id: ensureCampoUuid(newRecord.id, `${newRecord.date}|${newRecord.promoter}|${newRecord.store}`),
        type: 'Merchandising',
        date: newRecord.date,
        store: newRecord.store,
        promoter: newRecord.promoter,
        product: newRecord.product || 'General',
        comments: JSON.stringify({
          isMerchandising: true,
          address: newRecord.address || '',
          time: newRecord.time || '',
          storeManagerName: newRecord.storeManagerName || '',
          storeManagerRole: newRecord.storeManagerRole || '',
          storeManagerPhone: newRecord.storeManagerPhone || '',
          visitReason: newRecord.visitReason || 'Visita de Merchandising y Certificación PDV',
          activities: newRecord.activities || [],
          observations: newRecord.observations || '',
          signature: newRecord.signature || '',
          signedAt: newRecord.signedAt || newRecord.created_at,
          certified: Boolean(newRecord.certified),
          photos: newRecord.photos || [],
          category: newRecord.category,
          metrics: newRecord.metrics,
          alerts: newRecord.alerts,
          aiRecommendations: newRecord.aiRecommendations,
        }),
        creatorId: newRecord.promoter,
      };
      const { error } = await (supabase.from('surveys') as any).upsert(dbRow);
      if (!error) syncedDirectSupabase = true;
    } catch {
      // ignore direct Supabase error
    }

    try {
      const res = await fetch('/api/merchandising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (!res.ok) throw new Error('Error sending merchandising report');
    } catch (e) {
      if (!syncedDirectSupabase) {
        campoService.enqueue('merchandising_report', newRecord);
      }
      console.warn('Error sending merchandising report to server:', e);
    }

    window.dispatchEvent(new Event('codizulca_merchandising_changed'));
    window.dispatchEvent(new Event('codizulca_campo_data_updated'));
    return newRecord;
  },

  async delete(id: string): Promise<boolean> {
    try {
      await fetch(`/api/merchandising/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Error deleting report on server:', e);
    }
    try {
      await fetch(`/api/shelf-scans/${id}`, { method: 'DELETE' });
    } catch {}
    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        await (supabase.from('surveys') as any).delete().eq('id', id);
      }
    } catch {}

    try {
      const rawScans = localStorage.getItem('codizulca_shelf_scans');
      if (rawScans) {
        const parsed = JSON.parse(rawScans);
        if (Array.isArray(parsed)) {
          localStorage.setItem('codizulca_shelf_scans', JSON.stringify(parsed.filter((s: any) => s.id !== id)));
        }
      }
    } catch {}

    const rawMerch = localStorage.getItem(STORAGE_KEY);
    if (rawMerch) {
      try {
        const parsed = JSON.parse(rawMerch);
        if (Array.isArray(parsed)) {
          saveMerchToLocalStorageSafe(parsed.filter((r: MerchandisingReport) => r.id !== id));
        }
      } catch {}
    }

    window.dispatchEvent(new Event('codizulca_merchandising_changed'));
    window.dispatchEvent(new Event('codizulca_campo_data_updated'));
    return true;
  },

  subscribe(callback: () => void): () => void {
    const handler = () => callback();
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === 'codizulca_shelf_scans') callback();
    };
    window.addEventListener('codizulca_merchandising_changed', handler);
    window.addEventListener('codizulca_campo_data_updated', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('codizulca_merchandising_changed', handler);
      window.removeEventListener('codizulca_campo_data_updated', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
};
