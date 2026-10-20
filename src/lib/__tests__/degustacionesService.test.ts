import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { degustacionesService, DEFAULT_DEGUSTACIONES, DegustacionItem } from '../degustacionesService';

describe('degustacionesService - Senior QA Automation Test Suite', () => {
  const STORAGE_KEY = 'codizulca_cronograma_degustaciones_v6';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. HAPPY PATH (Casos de Éxito)
  // =========================================================================
  describe('Happy Path (Flujos de Éxito)', () => {
    it('debe inicializar con las 40 solicitudes auténticas de vendedores si localStorage está vacío', () => {
      const items = degustacionesService.getDegustaciones();
      expect(items).toBeDefined();
      const activeVendorRequests = items.filter((i) => !i.id.startsWith('DEG-HIST-'));
      expect(activeVendorRequests.length).toBe(40);
      expect(items.length).toBeGreaterThanOrEqual(40);
      expect(items[0]).toHaveProperty('vendedor');
      expect(items[0].source).toBe('vendedor_app');
    });

    it('todas las degustaciones iniciales deben provenir de solicitudes reales y no contener datos ficticios', () => {
      const items = degustacionesService.getDegustaciones();
      const fake = items.filter(
        (i) =>
          i.id.includes('DEG-2026-W4-') ||
          i.activity.includes('Gran Impulso Mortadela Tapara') ||
          i.promoter === 'Maria Gonzalez' ||
          i.promoter === 'Ana Silva'
      );
      expect(fake.length).toBe(0);
    });

    it('debe agregar una nueva degustación correctamente (addDegustacion)', async () => {
      const globalFetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', globalFetchMock);

      const newItem: DegustacionItem = {
        id: 'TEST-DEG-001',
        date: '20/10/2026',
        time: '14:00 - 18:00',
        activity: 'Degustación Pollo Ebenezer',
        product: 'Pollo Ebenezer',
        promoter: 'CARELIZ REYES',
        promoterRole: 'Impulsadora',
        client: 'ALKOSTO LA LIMPIA',
        zone: 'Maracaibo Oeste',
        vendedor: 'MARIANA CHACÍN',
        source: 'vendedor_app',
        status: 'scheduled',
        delivered: 0,
        target: 200,
        acceptanceRate: 0
      };

      await degustacionesService.addDegustacion(newItem);

      const items = degustacionesService.getDegustaciones();
      expect(items[0].id).toBe('TEST-DEG-001');
      expect(items[0].client).toBe('ALKOSTO LA LIMPIA');
      expect(globalFetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/degustaciones'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('debe actualizar una degustación existente (updateDegustacion)', async () => {
      const globalFetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', globalFetchMock);

      const current = degustacionesService.getDegustaciones();
      const target = { ...current[0], delivered: 120, status: 'completed' as const, acceptanceRate: 95 };

      await degustacionesService.updateDegustacion(target);

      const updated = degustacionesService.getDegustaciones();
      const found = updated.find((i) => i.id === target.id);
      expect(found).toBeDefined();
      expect(found?.delivered).toBe(120);
      expect(found?.status).toBe('completed');
      expect(found?.acceptanceRate).toBe(95);
      expect(globalFetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/degustaciones/${encodeURIComponent(target.id)}`),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('debe eliminar una degustación por id (deleteDegustacion)', async () => {
      const globalFetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', globalFetchMock);

      const current = degustacionesService.getDegustaciones();
      const idToDelete = current[0].id;
      const initialCount = current.length;

      await degustacionesService.deleteDegustacion(idToDelete);

      const remaining = degustacionesService.getDegustaciones();
      expect(remaining.length).toBe(initialCount - 1);
      expect(remaining.find((i) => i.id === idToDelete)).toBeUndefined();
      expect(globalFetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/degustaciones/${encodeURIComponent(idToDelete)}`),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('debe filtrar adecuadamente por promotor de forma insensible a mayúsculas/espacios', () => {
      const items = degustacionesService.getDegustaciones();
      const sample = items[0];
      sample.promoter = 'Careliz Reyes';
      degustacionesService.saveDegustaciones(items);

      const found = degustacionesService.getDegustacionesForPromoter('   careliz reyes  ');
      expect(found.length).toBeGreaterThanOrEqual(1);
      expect(found[0].promoter.toUpperCase()).toContain('CARELIZ REYES');
    });

    it('debe filtrar adecuadamente por vendedor de forma insensible a mayúsculas/espacios', () => {
      const found = degustacionesService.getDegustacionesForVendedor('  mariana chacín  ');
      expect(found.length).toBeGreaterThanOrEqual(1);
      found.forEach((i) => {
        expect(i.vendedor.toUpperCase()).toContain('MARIANA CHACÍN');
      });
    });

    it('debe notificar a los suscriptores cuando cambien los datos (subscribe)', () => {
      const callback = vi.fn();
      const unsubscribe = degustacionesService.subscribe(callback);

      degustacionesService.saveDegustaciones([...DEFAULT_DEGUSTACIONES]);

      expect(callback).toHaveBeenCalled();
      unsubscribe();

      callback.mockClear();
      degustacionesService.saveDegustaciones([...DEFAULT_DEGUSTACIONES]);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. CASOS BORDE Y VALIDACIÓN DE TIPOS/DATOS (Edge Cases & Null Safety)
  // =========================================================================
  describe('Casos Borde y Validación de Datos (Edge Cases)', () => {
    it('debe recuperarse sin fallar si localStorage contiene JSON corrupto/malformado', () => {
      localStorage.setItem(STORAGE_KEY, '{ malformed json :: invalid [ ] }');

      const items = degustacionesService.getDegustaciones();
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThanOrEqual(40);
      expect(items.filter((i) => !i.id.startsWith('DEG-HIST-')).length).toBe(40);
    });

    it('debe limpiarse si localStorage contiene un array con valores nulos o indefinidos', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([null, undefined, { invalid: true }]));

      // Debe manejar el array de forma segura sin lanzar Uncaught TypeError
      expect(() => degustacionesService.getDegustaciones()).not.toThrow();
    });

    it('debe purgar versiones obsoletas de localStorage que contenían degustaciones ficticias', () => {
      localStorage.setItem('codizulca_cronograma_degustaciones_v4', JSON.stringify([{ id: 'old-fake' }]));
      degustacionesService.getDegustaciones();

      expect(localStorage.getItem('codizulca_cronograma_degustaciones_v4')).toBeNull();
    });

    it('debe manejar actualizar un elemento con ID inexistente sin corromper la lista', async () => {
      const globalFetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      vi.stubGlobal('fetch', globalFetchMock);

      const nonExistent: DegustacionItem = {
        id: 'NON-EXISTENT-999',
        date: '01/01/2026',
        time: '10:00 - 12:00',
        activity: 'Fantasma',
        product: 'N/A',
        promoter: 'N/A',
        promoterRole: 'Impulsadora',
        client: 'N/A',
        zone: 'N/A',
        vendedor: 'N/A',
        source: 'sistema',
        status: 'scheduled',
        delivered: 0,
        target: 10,
        acceptanceRate: 0
      };

      await degustacionesService.updateDegustacion(nonExistent);
      const items = degustacionesService.getDegustaciones();
      expect(items.find((i) => i.id === 'NON-EXISTENT-999')).toBeUndefined();
    });

    it('debe manejar búsqueda por vendedor o promotora vacía o de solo espacios', () => {
      const byVendor = degustacionesService.getDegustacionesForVendedor('   ');
      expect(Array.isArray(byVendor)).toBe(true);

      const byPromoter = degustacionesService.getDegustacionesForPromoter('');
      expect(Array.isArray(byPromoter)).toBe(true);
    });
  });

  // =========================================================================
  // 2.b RUTA DE PROMOTORAS LIMPIA: SIN ASIGNACIONES PRECARGADAS
  // =========================================================================
  describe('Ruta de promotoras sin asignaciones precargadas', () => {
    it('DEFAULT_DEGUSTACIONES no trae ninguna promotora asignada (esperan asignación de Trade Marketing)', () => {
      const assigned = DEFAULT_DEGUSTACIONES.filter(
        (i) => !i.promoter.toUpperCase().includes('POR ASIGNAR') || i.promoterEmail || i.promoterId
      );
      expect(assigned).toEqual([]);
    });

    it('limpia una sola vez las asignaciones heredadas en una caché local previa (DEG-HIST-*)', () => {
      const stale = DEFAULT_DEGUSTACIONES.map((i) =>
        i.id.startsWith('DEG-HIST-')
          ? { ...i, promoter: 'NICOLE GODOY', promoterEmail: 'godoyaraujonicole@gmail.com', promoterId: 'STF-001' }
          : i
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

      const items = degustacionesService.getDegustaciones();
      const withPromoter = items.filter((i) => !i.promoter.toUpperCase().includes('POR ASIGNAR'));
      expect(withPromoter).toEqual([]);
      expect(
        degustacionesService.getDegustacionesForPromoter('NICOLE GODOY', 'godoyaraujonicole@gmail.com')
      ).toEqual([]);
    });

    it('conserva las asignaciones que Trade Marketing haga después de la limpieza', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
      const first = degustacionesService.getDegustaciones()[0];
      await degustacionesService.updateDegustacion({
        ...first,
        promoter: 'NICOLE GODOY',
        promoterEmail: 'godoyaraujonicole@gmail.com',
        promoterId: 'STF-001'
      });

      const mine = degustacionesService.getDegustacionesForPromoter('NICOLE GODOY', 'godoyaraujonicole@gmail.com');
      expect(mine.map((i) => i.id)).toEqual([first.id]);
    });
  });

  // =========================================================================
  // 3. MANEJO DE EXCEPCIONES Y ERRORES DE RED (Network Errors & HTTP 4xx/5xx)
  // =========================================================================
  describe('Manejo de Excepciones y Errores de Red / API', () => {
    it('debe soportar HTTP 500 en getDegustacionesAsync y retornar datos locales como fallback', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await degustacionesService.getDegustacionesAsync();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(40);
      expect(result.filter((i) => !i.id.startsWith('DEG-HIST-')).length).toBe(40);
    });

    it('debe soportar HTTP 404 Not Found en getDegustacionesAsync sin lanzar excepción', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await degustacionesService.getDegustacionesAsync();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(40);
      expect(result.filter((i) => !i.id.startsWith('DEG-HIST-')).length).toBe(40);
    });

    it('debe soportar timeout o fallo completo de red (Network Error / TypeError) en sincronización de API', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (Network Timeout)'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await degustacionesService.getDegustacionesAsync();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(40);
      expect(result.filter((i) => !i.id.startsWith('DEG-HIST-')).length).toBe(40);

      // Agregar degustación en modo offline no debe lanzar error no capturado
      const testItem = { ...DEFAULT_DEGUSTACIONES[0], id: 'OFFLINE-ITEM-1' };
      await expect(degustacionesService.addDegustacion(testItem)).resolves.not.toThrow();
    });
  });
});
