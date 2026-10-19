/**
 * Submódulo de Asistencia en Punto de Venta (PDV / Check-in)
 * Servicio de datos, persistencia híbrida (Supabase + LocalStorage) y sincronización offline
 */

export type CheckInType = 'Ingreso' | 'Salida a almorzar' | 'Vuelta a almorzar' | 'Salida';

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
const STORAGE_KEY_QUEUE = 'portal_sync_queue';
export const STORAGE_KEY_ACTIVE_STORE = 'portal_active_store';
export const STORAGE_KEY_ACTIVE_PROMOTER = 'portal_active_promoter';

// Helper de canal para sincronización en tiempo real entre pestañas
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('codizulca_checkins_sync')
  : null;

// Semilla inicial vacía para producción limpia
export const INITIAL_CHECKINS_SEED: CheckInRecord[] = [];

export const checkinsService = {
  /**
   * Obtiene todos los checkins (servidor / supabase + local fallback)
   */
  async getAllCheckIns(): Promise<CheckInRecord[]> {
    let serverList: CheckInRecord[] = [];
    try {
      const response = await fetch('/api/checkins');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          serverList = data.filter((c: CheckInRecord) =>
            c && c.id &&
            !c.id.startsWith('chk-00') &&
            !c.store?.includes("Palos Grandes") &&
            !c.photoBase64?.includes('unsplash')
          );
        }
      }
    } catch {
      // Si la red falla o está offline, continuar con almacenamiento local
    }

    let localList: CheckInRecord[] = [];
    const local = localStorage.getItem(STORAGE_KEY_CHECKINS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          localList = parsed.filter((c: CheckInRecord) =>
            c && c.id &&
            !c.id.startsWith('chk-00') &&
            !c.store?.includes("Palos Grandes") &&
            !c.photoBase64?.includes('unsplash')
          );
        }
      } catch (e) {
        console.warn('Error leyendo checkins locales:', e);
      }
    }

    const map = new Map<string, CheckInRecord>();
    [...serverList, ...localList].forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime()
    );
    localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(merged));
    return merged;
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
    localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(updated));

    // Si está offline, guardar en la cola de sincronización
    if (!isOnline) {
      this.enqueueOfflineCheckIn(newRecord);
      this.notifySync();
      return { record: newRecord, isOffline: true };
    }

    // Si está online, enviar al servidor / backend
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (response.ok) {
        const serverRecord = await response.json();
        newRecord.offlinePending = false;
        // Refrescar registro en local
        const refreshed = updated.map(r => r.id === newRecord.id ? { ...newRecord, ...serverRecord, offlinePending: false } : r);
        localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(refreshed));
      } else {
        // Si el backend responde con error, encolar para reintento
        this.enqueueOfflineCheckIn(newRecord);
      }
    } catch (err) {
      console.warn('Fallo al enviar check-in al servidor, guardado en cola offline:', err);
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
      localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(updated));
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
    localStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(filtered));

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
