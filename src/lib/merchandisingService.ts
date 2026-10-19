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

// Firma dummy vectorizada en base64 PNG para la semilla
const SAMPLE_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFmElEQVR4nO3dX2jbVRzH8c/vnpq0dcuapN1K7Wbttm4dtqXQ1s7/88a2oYzBEGQggyHYHwYyjA2EZdChbAyEDWSD4f4gCIIMhjLGsK0oQ7C1yhr/2qRpnTZpk7Zp8/s6D657b9q69Nfk3vTz';

export const INITIAL_MERCHANDISING_REPORTS: MerchandisingReport[] = [];

export const merchandisingService = {
  async getAll(): Promise<MerchandisingReport[]> {
    let serverMerch: MerchandisingReport[] = [];
    let serverScans: any[] = [];

    try {
      const res = await fetch('/api/merchandising');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) serverMerch = data;
      }
    } catch {}

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
    const combined = [...scanReports, ...serverMerch, ...localMerch];
    const uniqueMap = new Map<string, MerchandisingReport>();
    combined.forEach((item) => {
      if (item && item.id) uniqueMap.set(item.id, item);
    });

    if (uniqueMap.size > 0) {
      const result = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime()
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      return result;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MERCHANDISING_REPORTS));
    return INITIAL_MERCHANDISING_REPORTS;
  },

  async create(report: Omit<MerchandisingReport, 'id' | 'created_at'>): Promise<MerchandisingReport> {
    const newRecord: MerchandisingReport = {
      ...report,
      id: 'MERCH-REP-' + Date.now().toString().slice(-6),
      created_at: new Date().toISOString()
    };

    const current = await this.getAll();
    const updated = [newRecord, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch('/api/merchandising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
    } catch (e) {
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.filter((r: MerchandisingReport) => r.id !== id)));
        }
      } catch {}
    }

    window.dispatchEvent(new Event('codizulca_merchandising_changed'));
    window.dispatchEvent(new Event('codizulca_campo_data_updated'));
    return true;
  },

  subscribe(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener('codizulca_merchandising_changed', handler);
    window.addEventListener('codizulca_campo_data_updated', handler);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === 'codizulca_shelf_scans') callback();
    });
    return () => {
      window.removeEventListener('codizulca_merchandising_changed', handler);
      window.removeEventListener('codizulca_campo_data_updated', handler);
    };
  }
};
