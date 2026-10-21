/**
 * Servicio Centralizado de Trazabilidad & Auditoría de Conexiones
 * Captura telemetría REAL del dispositivo, IP pública real, coordenadas GPS reales
 * (navigator.geolocation) y dirección física exacta mediante geocodificación inversa
 * (OpenStreetMap Nominatim / BigDataCloud), sin coordenadas ni direcciones ficticias.
 */

export interface TrazabilidadItem {
  id: string;
  timestamp: string;          // ISO Timestamp
  formattedDate: string;      // DD/MM/YYYY
  formattedTime: string;      // HH:MM:SS AM/PM
  user: {
    name: string;
    email: string;
    role: string;
    photoUrl?: string;
    avatarBg?: string;
  };
  action: {
    type: 'login' | 'portal_login' | 'checkin' | 'logout' | 'tasting_survey' | 'shelf_audit' | 'price_survey' | 'failed_login';
    label: string;
    details?: string;
    status: 'success' | 'active' | 'warning' | 'error';
    module: string;
  };
  device: {
    ip: string;
    browser: string;
    os: string;
    deviceType: 'Móvil' | 'Escritorio' | 'Tablet';
    connection: string;
    locationCity: string;
    address?: string;          // Dirección física exacta devuelta por geocodificación inversa del GPS real
    gpsVerified?: boolean;     // true únicamente cuando proviene del sensor GPS real del navegador/dispositivo
    coordinates?: string;      // Coordenadas exactas (6 decimales), ej: "10.648392° N, -71.615284° W"
    lat?: number;
    lng?: number;
    accuracy?: number;         // Precisión real en metros reportada por el GPS
    locationSource?: 'gps' | 'ip' | 'unknown';
  };
}

export interface ReverseGeocodeResult {
  address: string;
  sector: string;
  city: string;
  state: string;
  locationCity: string;
  displayName: string;
}

const STORAGE_KEY = 'codizulca_trazabilidad_logs';
const GEO_CACHE_KEY = 'codizulca_reverse_geo_cache';
const EVENT_NAME = 'codizulca_trazabilidad_updated';

// IDs de registros semilla ficticios anteriores que deben ser filtrados y eliminados
const LEGACY_FAKE_IDS = new Set([
  'TRZ-2026-001',
  'TRZ-2026-002',
  'TRZ-2026-003',
  'TRZ-2026-004',
  'TRZ-2026-005',
  'TRZ-2026-006',
  'TRZ-2026-007',
  'TRZ-2026-008',
  'TRZ-2026-009',
  'TRZ-2026-010',
  'TRZ-2026-011',
  'TRZ-2026-012',
  'TRZ-2026-3876'
]);

/**
 * Formatea coordenadas lat/lng numéricas con precisión de 6 decimales
 */
export function formatCoordinatesDMS(lat: number, lng: number, decimals: number = 6): string {
  const latHem = lat >= 0 ? 'N' : 'S';
  const lngHem = lng >= 0 ? 'E' : 'W';
  const latStr = Math.abs(lat).toFixed(decimals);
  const lngStr = `${lng < 0 ? '-' : ''}${Math.abs(lng).toFixed(decimals)}`;
  return `${latStr}° ${latHem}, ${lngStr}° ${lngHem}`;
}

/**
 * Parsea cadenas de coordenadas como "10.648392° N, -71.615284° W" o "10.648392, -71.615284"
 * Retorna { lat, lng } numéricos exactos sin alterarlos
 */
export function parseCoordinates(coordStr?: string): { lat: number; lng: number } | null {
  if (!coordStr || typeof coordStr !== 'string') return null;
  const matches = coordStr.match(/([+-]?\d+\.?\d*)/g);
  if (matches && matches.length >= 2) {
    let lat = parseFloat(matches[0]);
    let lng = parseFloat(matches[1]);
    const upper = coordStr.toUpperCase();
    if (upper.includes('S') && lat > 0) lat = -Math.abs(lat);
    if ((upper.includes('W') || upper.includes('O')) && lng > 0) lng = -Math.abs(lng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * Valida las coordenadas reales del registro SIN sobrescribirlas ni inventar ubicaciones ficticias.
 */
export function validateAndOptimizeCoordinates(
  coordStr?: string,
  locationCity?: string,
  existingAddress?: string
): {
  lat: number;
  lng: number;
  hasCoordinates: boolean;
  corrected: boolean;
  reason?: string;
  sectorName: string;
} {
  const parsed = parseCoordinates(coordStr);
  const cleanAddress = (existingAddress || '').trim();
  const cleanCity = (locationCity || '').trim();

  if (!parsed) {
    return {
      lat: 0,
      lng: 0,
      hasCoordinates: false,
      corrected: false,
      sectorName: cleanAddress || cleanCity || 'Ubicación pendiente de GPS'
    };
  }

  return {
    lat: parsed.lat,
    lng: parsed.lng,
    hasCoordinates: true,
    corrected: false,
    sectorName: cleanAddress || cleanCity || `${parsed.lat.toFixed(6)}°, ${parsed.lng.toFixed(6)}°`
  };
}

// Caché en memoria para geocodificación inversa
const memoryGeoCache = new Map<string, ReverseGeocodeResult>();

function loadGeoCacheFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v === 'object') {
            memoryGeoCache.set(k, v as ReverseGeocodeResult);
          }
        });
      }
    }
  } catch {}
}

function saveGeoCacheToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, ReverseGeocodeResult> = {};
    memoryGeoCache.forEach((v, k) => {
      obj[k] = v;
    });
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

/**
 * Geocodificación inversa REAL de coordenadas GPS (lat, lng) a dirección física exacta
 * utilizando el endpoint del servidor (/api/geo/reverse), OpenStreetMap Nominatim y BigDataCloud.
 */
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (isNaN(lat) || isNaN(lng)) return null;
  if (memoryGeoCache.size === 0) loadGeoCacheFromStorage();

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = memoryGeoCache.get(cacheKey);
  if (cached && cached.address) {
    return cached;
  }

  // 1. Intentar por medio del proxy del servidor (/api/geo/reverse)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`/api/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const result: ReverseGeocodeResult = {
          address: data.address,
          sector: data.sector || data.address,
          city: data.city || '',
          state: data.state || '',
          locationCity: data.locationCity || [data.city, data.state].filter(Boolean).join(', '),
          displayName: data.displayName || data.address
        };
        memoryGeoCache.set(cacheKey, result);
        saveGeoCacheToStorage();
        return result;
      }
    }
  } catch {}

  // 2. Consulta directa a OpenStreetMap Nominatim desde el navegador
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=es`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (nomRes.ok) {
      const data: any = await nomRes.json();
      const addr = data?.address || {};
      const road = addr.road || addr.pedestrian || addr.footway || addr.street || addr.highway || '';
      const houseNumber = addr.house_number ? ` #${addr.house_number}` : '';
      const placeName = data?.name && data.name !== road ? data.name : (addr.amenity || addr.shop || addr.building || addr.commercial || '');
      const suburb = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.city_district || '';
      const municipality = addr.municipality || addr.county || '';
      const city = addr.city || addr.town || addr.village || municipality || '';
      const state = addr.state || '';

      const streetParts = [
        placeName,
        road ? `${road}${houseNumber}` : '',
        suburb,
        municipality && municipality !== city ? municipality : ''
      ].filter(Boolean);

      const locationCity = [city, state].filter(Boolean).join(', ') || addr.country || 'Ubicación GPS';
      const exactAddress = streetParts.length > 0
        ? `${streetParts.join(', ')}${locationCity ? ` • ${locationCity}` : ''}`
        : (data?.display_name || locationCity);

      const result: ReverseGeocodeResult = {
        address: exactAddress,
        sector: streetParts.slice(0, 2).join(', ') || suburb || city || exactAddress,
        city,
        state,
        locationCity,
        displayName: data?.display_name || exactAddress
      };
      memoryGeoCache.set(cacheKey, result);
      saveGeoCacheToStorage();
      return result;
    }
  } catch {}

  // 3. Fallback a BigDataCloud Reverse Geocoding API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=es`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (bdcRes.ok) {
      const data: any = await bdcRes.json();
      const locality = data?.locality || '';
      const city = data?.city || locality || '';
      const state = data?.principalSubdivision || '';
      const informative = Array.isArray(data?.localityInfo?.administrative)
        ? data.localityInfo.administrative
            .filter((x: any) => x?.name && (x.adminLevel >= 6 || x.order >= 5))
            .map((x: any) => x.name)
        : [];
      const uniqueParts = Array.from(new Set([locality, ...informative, city, state].filter(Boolean)));
      const locationCity = [city, state].filter(Boolean).join(', ') || data?.countryName || 'Ubicación GPS';
      const exactAddress = uniqueParts.join(', ') || locationCity;

      const result: ReverseGeocodeResult = {
        address: exactAddress,
        sector: uniqueParts.slice(0, 2).join(', ') || locationCity,
        city,
        state,
        locationCity,
        displayName: exactAddress
      };
      memoryGeoCache.set(cacheKey, result);
      saveGeoCacheToStorage();
      return result;
    }
  } catch {}

  return null;
}

/**
 * Obtiene la IP pública real, ISP y ciudad de la red actual del usuario (sin valores inventados)
 */
export async function fetchClientNetworkInfo(): Promise<{
  ip: string;
  locationCity: string;
  isp: string;
  lat?: number;
  lng?: number;
}> {
  // 1. Consultar endpoint del backend /api/geo/client-info
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('/api/geo/client-info', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip && data.ip !== 'Red Local' && data.ip !== 'Red Activa') {
        return {
          ip: data.ip,
          locationCity: data.locationCity || [data.city, data.region].filter(Boolean).join(', ') || 'Conexión Verificada',
          isp: data.isp || '',
          lat: typeof data.lat === 'number' ? data.lat : undefined,
          lng: typeof data.lng === 'number' ? data.lng : undefined
        };
      }
    }
  } catch {}

  // 2. Consultar directamente ipwho.is desde el navegador del cliente
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('https://ipwho.is/?lang=es', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.ip) {
        const locationCity = [data.city, data.region].filter(Boolean).join(', ') || data.country || 'Conexión Verificada';
        return {
          ip: data.ip,
          locationCity,
          isp: data.connection?.isp || data.connection?.org || '',
          lat: typeof data.latitude === 'number' ? data.latitude : undefined,
          lng: typeof data.longitude === 'number' ? data.longitude : undefined
        };
      }
    }
  } catch {}

  // 3. Fallback de IP pública vía BigDataCloud
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.bigdatacloud.net/data/client-ip', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ipString) {
        return {
          ip: data.ipString,
          locationCity: 'Conexión Directa',
          isp: ''
        };
      }
    }
  } catch {}

  return {
    ip: 'Red Local',
    locationCity: 'Conexión Directa',
    isp: ''
  };
}

/**
 * Solicita las coordenadas GPS reales del hardware/navegador (navigator.geolocation)
 */
export function requestBrowserGpsPosition(
  timeoutMs: number = 10000
): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.max(1, Math.round(pos.coords.accuracy || 10));
        resolve({ lat, lng, accuracy });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0
      }
    );
  });
}

/**
 * Detecta con exactitud el Sistema Operativo, Navegador y Tipo de Dispositivo reales del usuario
 */
export function detectRealBrowserAndOs(): {
  browser: string;
  os: string;
  deviceType: 'Móvil' | 'Escritorio' | 'Tablet';
  connectionType: string;
} {
  if (typeof navigator === 'undefined') {
    return {
      browser: 'Navegador Web',
      os: 'Sistema Operativo',
      deviceType: 'Escritorio',
      connectionType: 'Red Activa'
    };
  }

  const ua = navigator.userAgent || '';
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const isMobile = !isTablet && /Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const deviceType: 'Móvil' | 'Escritorio' | 'Tablet' = isTablet ? 'Tablet' : isMobile ? 'Móvil' : 'Escritorio';

  // Sistema Operativo
  let os = 'Sistema Desconocido';
  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android\s+([\d.]+)/i.test(ua)) {
    const m = ua.match(/Android\s+([\d.]+)/i);
    os = `Android ${m ? m[1] : ''}`.trim();
  } else if (/iPhone OS ([\d_]+)/i.test(ua) || /CPU OS ([\d_]+)/i.test(ua)) {
    const m = ua.match(/(?:iPhone|CPU) OS ([\d_]+)/i);
    os = `iOS ${m ? m[1].replace(/_/g, '.') : ''}`.trim();
  } else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Navegador
  let browser = 'Navegador Web';
  if (/Edg\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/Edg\/([\d]+)/i);
    browser = `Edge ${m ? m[1] : ''}`.trim();
  } else if (/OPR\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/OPR\/([\d]+)/i);
    browser = `Opera ${m ? m[1] : ''}`.trim();
  } else if (/Chrome\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/Chrome\/([\d]+)/i);
    browser = `Chrome ${isMobile ? 'Mobile ' : ''}${m ? m[1] : ''}`.trim();
  } else if (/Version\/([\d.]+).*Safari/i.test(ua)) {
    const m = ua.match(/Version\/([\d.]+)/i);
    browser = `Safari ${isMobile ? 'Mobile ' : ''}${m ? m[1] : ''}`.trim();
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/Firefox\/([\d]+)/i);
    browser = `Firefox ${m ? m[1] : ''}`.trim();
  }

  // Tipo de conexión de red reportada por el navegador
  const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  let connectionType = isMobile ? 'Red Móvil / WiFi' : 'Banda Ancha / Red Local';
  if (navConn) {
    if (navConn.type === 'wifi') connectionType = 'WiFi';
    else if (navConn.type === 'cellular') connectionType = `Datos Móviles (${(navConn.effectiveType || '4G').toUpperCase()})`;
    else if (navConn.effectiveType) connectionType = `Red ${(navConn.effectiveType as string).toUpperCase()}`;
  }

  return { browser, os, deviceType, connectionType };
}

/**
 * Filtra registros semilla ficticios y limpia coordenadas inventadas (10.6542, -71.6241)
 * cuando gpsVerified era false
 */
function sanitizeLogsList(items: TrazabilidadItem[]): { sanitized: TrazabilidadItem[]; changed: boolean } {
  let changed = false;
  const sanitized: TrazabilidadItem[] = [];

  for (const item of items) {
    if (!item || !item.id) {
      changed = true;
      continue;
    }
    if (LEGACY_FAKE_IDS.has(item.id)) {
      changed = true;
      continue;
    }
    // Filtrar cualquier otro registro que provenga del seed antiguo de septiembre 2026
    if (item.formattedDate === '30/09/2026' || item.formattedDate === '29/09/2026') {
      changed = true;
      continue;
    }

    // Si un registro tenía gpsVerified: false pero se le inyectó la coordenada ficticia 10.6542° N, -71.6241° W
    if (
      item.device &&
      !item.device.gpsVerified &&
      item.device.coordinates &&
      item.device.coordinates.includes('10.6542') &&
      item.device.coordinates.includes('-71.6241') &&
      item.device.locationSource !== 'ip'
    ) {
      changed = true;
      const cleanDevice = { ...item.device };
      delete cleanDevice.coordinates;
      delete cleanDevice.lat;
      delete cleanDevice.lng;
      sanitized.push({
        ...item,
        device: cleanDevice
      });
      continue;
    }

    // Si tiene coordenadas válidas pero no lat/lng numéricos, sincronizarlos sin cambiar su valor
    if (item.device?.coordinates && (typeof item.device.lat !== 'number' || typeof item.device.lng !== 'number')) {
      const parsed = parseCoordinates(item.device.coordinates);
      if (parsed) {
        changed = true;
        sanitized.push({
          ...item,
          device: {
            ...item.device,
            lat: parsed.lat,
            lng: parsed.lng
          }
        });
        continue;
      }
    }

    sanitized.push(item);
  }

  return { sanitized, changed };
}

export const INITIAL_TRAZABILIDAD_SEED: TrazabilidadItem[] = [];

export const trazabilidadService = {
  /**
   * Obtiene todos los registros reales de trazabilidad
   */
  async getAll(): Promise<TrazabilidadItem[]> {
    try {
      const res = await fetch('/api/trazabilidad');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const { sanitized } = sanitizeLogsList(data);
          // Combinar con registros locales que aún no estén en el servidor
          const localRaw = localStorage.getItem(STORAGE_KEY);
          let merged = sanitized;
          if (localRaw) {
            try {
              const localParsed = JSON.parse(localRaw);
              if (Array.isArray(localParsed)) {
                const { sanitized: cleanLocal } = sanitizeLogsList(localParsed);
                const byId = new Map<string, TrazabilidadItem>();
                for (const item of sanitized) byId.set(item.id, item);
                const missingOnServer: TrazabilidadItem[] = [];
                for (const loc of cleanLocal) {
                  if (!byId.has(loc.id)) {
                    byId.set(loc.id, loc);
                    missingOnServer.push(loc);
                  } else {
                    // Conservar la versión que tenga GPS verificado o dirección resuelta
                    const existing = byId.get(loc.id)!;
                    if (loc.device.gpsVerified && !existing.device.gpsVerified) {
                      byId.set(loc.id, loc);
                    } else if (loc.device.address && !existing.device.address) {
                      byId.set(loc.id, loc);
                    }
                  }
                }
                if (missingOnServer.length > 0) {
                  (async () => {
                    for (const itemToSync of missingOnServer) {
                      try {
                        await fetch('/api/trazabilidad', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(itemToSync)
                        });
                      } catch {}
                    }
                  })();
                }
                merged = Array.from(byId.values()).sort(
                  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
              }
            } catch {}
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {
      // Offline fallback
    }

    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const { sanitized, changed } = sanitizeLogsList(parsed);
          if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          }
          return sanitized;
        }
      } catch (e) {
        console.warn('Error reading local trazabilidad logs:', e);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRAZABILIDAD_SEED));
    return INITIAL_TRAZABILIDAD_SEED;
  },

  /**
   * Registra un nuevo evento de conexión o actividad
   */
  async logEvent(
    item: Omit<TrazabilidadItem, 'id' | 'timestamp' | 'formattedDate' | 'formattedTime'> & { id?: string }
  ): Promise<TrazabilidadItem> {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

    const completeItem: TrazabilidadItem = {
      id: item.id || `TRZ-${now.getFullYear()}-${String(Date.now()).slice(-5)}`,
      timestamp: now.toISOString(),
      formattedDate,
      formattedTime,
      ...item
    };

    const current = await this.getAll();
    const updated = [completeItem, ...current.filter((c) => c.id !== completeItem.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch('/api/trazabilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeItem)
      });
    } catch {
      // Offline fallback
    }

    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { item: completeItem } }));
    return completeItem;
  },

  /**
   * Actualiza un evento existente (por ejemplo cuando el GPS o la geocodificación inversa terminan de resolver)
   */
  async updateEvent(id: string, partial: Partial<TrazabilidadItem>): Promise<TrazabilidadItem | null> {
    const current = await this.getAll();
    let updatedTarget: TrazabilidadItem | null = null;

    const updatedList = current.map((item) => {
      if (item.id === id) {
        updatedTarget = {
          ...item,
          ...partial,
          user: partial.user ? { ...item.user, ...partial.user } : item.user,
          action: partial.action ? { ...item.action, ...partial.action } : item.action,
          device: partial.device ? { ...item.device, ...partial.device } : item.device
        };
        return updatedTarget;
      }
      return item;
    });

    if (updatedTarget) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      try {
        await fetch(`/api/trazabilidad/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTarget)
        });
      } catch {}
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { item: updatedTarget } }));
    }

    return updatedTarget;
  },

  /**
   * Registra un inicio de sesión capturando IP pública real, navegador/OS real,
   * coordenadas GPS reales del dispositivo y la dirección física exacta (geocodificación inversa).
   */
  async logConnection(
    user: { name: string; email: string; role: string; photoUrl?: string },
    isMobilePortal: boolean = false
  ): Promise<TrazabilidadItem> {
    const { browser, os, deviceType, connectionType } = detectRealBrowserAndOs();
    const eventId = `TRZ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    // 1. Iniciar consulta de red/IP real y GPS real en paralelo
    const netPromise = fetchClientNetworkInfo();
    const gpsPromise = requestBrowserGpsPosition(12000);

    // Esperar brevemente (máx 1.2s) por si la red o el GPS responden de inmediato antes de navegar
    const fastNet = await Promise.race([
      netPromise,
      new Promise<null>((r) => setTimeout(() => r(null), 1200))
    ]);
    const fastGps = await Promise.race([
      gpsPromise,
      new Promise<null>((r) => setTimeout(() => r(null), 1200))
    ]);

    let initialAddress: string | undefined;
    let initialCity = fastNet?.locationCity || 'Obteniendo ubicación real...';

    if (fastGps) {
      const geo = await Promise.race([
        reverseGeocodeCoordinates(fastGps.lat, fastGps.lng),
        new Promise<null>((r) => setTimeout(() => r(null), 1500))
      ]);
      if (geo) {
        initialAddress = geo.address;
        if (geo.locationCity) initialCity = geo.locationCity;
      }
    }

    const initialConnectionLabel = fastNet?.isp
      ? `${connectionType} (${fastNet.isp})`
      : connectionType;

    const initialItem = await this.logEvent({
      id: eventId,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl
      },
      action: {
        type: isMobilePortal ? 'portal_login' : 'login',
        label: isMobilePortal ? 'Inicio de Sesión en App Móvil' : 'Conexión al Dashboard Gerencial',
        details: initialAddress
          ? `Ubicación GPS confirmada: ${initialAddress}`
          : isMobilePortal
          ? 'Acceso personal verificado en Codizulca Campo'
          : 'Autenticación corporativa en Dashboard Gerencia',
        status: 'active',
        module: isMobilePortal ? 'Portal Campo (PWA)' : 'Dashboard Gerencia'
      },
      device: {
        ip: fastNet?.ip || 'Detectando IP...',
        browser,
        os,
        deviceType,
        connection: initialConnectionLabel,
        locationCity: initialCity,
        address: initialAddress,
        gpsVerified: Boolean(fastGps),
        coordinates: fastGps ? formatCoordinatesDMS(fastGps.lat, fastGps.lng, 6) : undefined,
        lat: fastGps?.lat,
        lng: fastGps?.lng,
        accuracy: fastGps?.accuracy,
        locationSource: fastGps ? 'gps' : fastNet?.lat ? 'ip' : 'unknown'
      }
    });

    // 2. Completar resolución asíncrona de IP + GPS + Geocodificación Inversa si tardó más de 1.2s
    (async () => {
      try {
        const [finalNet, finalGps] = await Promise.all([netPromise, gpsPromise]);
        const connLabel = finalNet?.isp ? `${connectionType} (${finalNet.isp})` : connectionType;

        if (finalGps) {
          const geo = await reverseGeocodeCoordinates(finalGps.lat, finalGps.lng);
          const resolvedCity = geo?.locationCity || finalNet?.locationCity || 'Ubicación GPS Verificada';
          const resolvedAddress = geo?.address || `${finalGps.lat.toFixed(6)}°, ${finalGps.lng.toFixed(6)}°`;

          await this.updateEvent(eventId, {
            action: {
              ...initialItem.action,
              details: `Ubicación GPS exacta: ${resolvedAddress}`
            },
            device: {
              ip: finalNet?.ip || initialItem.device.ip,
              browser,
              os,
              deviceType,
              connection: connLabel,
              locationCity: resolvedCity,
              address: resolvedAddress,
              gpsVerified: true,
              coordinates: formatCoordinatesDMS(finalGps.lat, finalGps.lng, 6),
              lat: finalGps.lat,
              lng: finalGps.lng,
              accuracy: finalGps.accuracy,
              locationSource: 'gps'
            }
          });
        } else if (finalNet) {
          // Si el usuario no dio permiso de GPS, usar la ubicación real de su IP sin mentir que es GPS verificado
          let ipAddress: string | undefined;
          let resolvedCity = finalNet.locationCity || 'Conexión Directa';
          if (typeof finalNet.lat === 'number' && typeof finalNet.lng === 'number') {
            const geo = await reverseGeocodeCoordinates(finalNet.lat, finalNet.lng);
            if (geo) {
              ipAddress = `Aprox. por Red/IP: ${geo.address}`;
              if (geo.locationCity) resolvedCity = geo.locationCity;
            }
          }

          await this.updateEvent(eventId, {
            device: {
              ip: finalNet.ip,
              browser,
              os,
              deviceType,
              connection: connLabel,
              locationCity: resolvedCity,
              address: ipAddress,
              gpsVerified: false,
              coordinates:
                typeof finalNet.lat === 'number' && typeof finalNet.lng === 'number'
                  ? formatCoordinatesDMS(finalNet.lat, finalNet.lng, 4)
                  : undefined,
              lat: finalNet.lat,
              lng: finalNet.lng,
              locationSource: typeof finalNet.lat === 'number' ? 'ip' : 'unknown'
            }
          });
        }
      } catch {}
    })();

    return initialItem;
  },

  /**
   * Registra un intento de acceso fallido con telemetría real (sin IPs ni ciudades ficticias)
   */
  async logFailedLogin(params: {
    email: string;
    role: string;
    details: string;
    module: string;
  }): Promise<TrazabilidadItem> {
    const { browser, os, deviceType, connectionType } = detectRealBrowserAndOs();
    const netInfo = await fetchClientNetworkInfo();
    const connLabel = netInfo.isp ? `${connectionType} (${netInfo.isp})` : connectionType;

    return this.logEvent({
      user: {
        name: params.email.split('@')[0] || 'Usuario Desconocido',
        email: params.email,
        role: params.role
      },
      action: {
        type: 'failed_login',
        label: 'Intento de Acceso Rechazado',
        details: params.details,
        status: 'warning',
        module: params.module
      },
      device: {
        ip: netInfo.ip,
        browser,
        os,
        deviceType,
        connection: connLabel,
        locationCity: netInfo.locationCity,
        gpsVerified: false,
        locationSource: 'ip'
      }
    });
  },

  /**
   * Registra o actualiza en vivo la posición GPS exacta y dirección física real del usuario conectado
   */
  async syncCurrentUserGpsLocation(user: {
    name: string;
    email: string;
    role: string;
    photoUrl?: string;
    isMobilePortal?: boolean;
  }): Promise<{ success: boolean; item?: TrazabilidadItem; error?: string }> {
    const gps = await requestBrowserGpsPosition(15000);
    if (!gps) {
      return {
        success: false,
        error: 'No se pudo obtener la señal GPS del navegador. Asegúrate de permitir el acceso a la ubicación en tu navegador.'
      };
    }

    const [netInfo, geo] = await Promise.all([
      fetchClientNetworkInfo(),
      reverseGeocodeCoordinates(gps.lat, gps.lng)
    ]);

    const { browser, os, deviceType, connectionType } = detectRealBrowserAndOs();
    const connLabel = netInfo.isp ? `${connectionType} (${netInfo.isp})` : connectionType;
    const resolvedCity = geo?.locationCity || netInfo.locationCity || 'Ubicación GPS Verificada';
    const resolvedAddress = geo?.address || `${gps.lat.toFixed(6)}°, ${gps.lng.toFixed(6)}°`;
    const coordStr = formatCoordinatesDMS(gps.lat, gps.lng, 6);

    const logs = await this.getAll();
    const existingUserLog = logs.find(
      (l) => l.user.email.toLowerCase() === user.email.toLowerCase() && l.action.status === 'active'
    );

    if (existingUserLog) {
      const updated = await this.updateEvent(existingUserLog.id, {
        action: {
          ...existingUserLog.action,
          details: `Ubicación GPS exacta: ${resolvedAddress}`
        },
        device: {
          ...existingUserLog.device,
          ip: netInfo.ip !== 'Red Local' ? netInfo.ip : existingUserLog.device.ip,
          browser,
          os,
          deviceType,
          connection: connLabel,
          locationCity: resolvedCity,
          address: resolvedAddress,
          gpsVerified: true,
          coordinates: coordStr,
          lat: gps.lat,
          lng: gps.lng,
          accuracy: gps.accuracy,
          locationSource: 'gps'
        }
      });
      return { success: true, item: updated || existingUserLog };
    }

    const created = await this.logEvent({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl
      },
      action: {
        type: user.isMobilePortal ? 'portal_login' : 'login',
        label: user.isMobilePortal ? 'Sesión Activa en App Móvil' : 'Sesión Activa en Dashboard Gerencial',
        details: `Ubicación GPS exacta: ${resolvedAddress}`,
        status: 'active',
        module: user.isMobilePortal ? 'Portal Campo (PWA)' : 'Dashboard Gerencia'
      },
      device: {
        ip: netInfo.ip,
        browser,
        os,
        deviceType,
        connection: connLabel,
        locationCity: resolvedCity,
        address: resolvedAddress,
        gpsVerified: true,
        coordinates: coordStr,
        lat: gps.lat,
        lng: gps.lng,
        accuracy: gps.accuracy,
        locationSource: 'gps'
      }
    });

    return { success: true, item: created };
  },

  /**
   * Suscripción en vivo a nuevos registros
   */
  subscribe(callback: (logs: TrazabilidadItem[]) => void): () => void {
    const handler = () => {
      this.getAll().then(callback);
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) handler();
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
};
