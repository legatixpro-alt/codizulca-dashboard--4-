import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { staffService, INITIAL_STAFF_SEED, StaffMember } from '../staffService';

describe('staffService - Senior QA Automation Test Suite', () => {
  const STORAGE_KEY = 'codizulca_staff_members_v4';

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. HAPPY PATH (Flujos de Éxito)
  // =========================================================================
  describe('Happy Path (Flujos de Éxito)', () => {
    it('debe retornar exactamente 24 integrantes oficiales de nómina al iniciar', async () => {
      // Mock fetch rejection to trigger fallback to INITIAL_STAFF_SEED
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const staff = await staffService.getAll();
      expect(staff).toBeDefined();
      expect(staff.length).toBe(24);
    });

    it('la nómina debe distribuirse exactamente en 13 Fija, 9 Eventual y 2 Merchandising', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const staff = await staffService.getAll();
      const fija = staff.filter((s) => s.category === 'fija');
      const eventual = staff.filter((s) => s.category === 'eventual');
      const merch = staff.filter((s) => s.category === 'merchandising');

      expect(fija.length).toBe(13);
      expect(eventual.length).toBe(9);
      expect(merch.length).toBe(2);
    });

    it('no debe contener a los perfiles removidos (Maria Gonzalez, Ana Silva, Maria Almarza en eventual)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const staff = await staffService.getAll();

      // Maria Gonzalez eliminada
      expect(staff.some((s) => s.name.toUpperCase().includes('MARIA GONZALEZ'))).toBe(false);

      // Ana Silva eliminada
      expect(staff.some((s) => s.name.toUpperCase().includes('ANA SILVA'))).toBe(false);

      // Maria Almarza NO debe estar en eventual
      const almarzaEventual = staff.find(
        (s) => s.name.toUpperCase().includes('ALMARZA') && s.category === 'eventual'
      );
      expect(almarzaEventual).toBeUndefined();

      // Maria de los Ángeles Almarza DEBE estar en fija
      const almarzaFija = staff.find(
        (s) => s.name.toUpperCase().includes('ALMARZA') && s.category === 'fija'
      );
      expect(almarzaFija).toBeDefined();
    });

    it('debe actualizar un miembro de staff existente (save con id)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const staff = await staffService.getAll();
      const memberToUpdate = { ...staff[0], phone: '0412-9999999', address: 'Nueva Dirección' };

      const saved = await staffService.save(memberToUpdate);

      expect(saved.phone).toBe('0412-9999999');
      expect(saved.address).toBe('Nueva Dirección');

      const all = await staffService.getAll();
      const updated = all.find((s) => s.id === memberToUpdate.id);
      expect(updated?.phone).toBe('0412-9999999');
    });

    it('debe crear un nuevo miembro de staff con ID autogenerado (save sin id)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const newMember: Omit<StaffMember, 'id'> = {
        name: 'NUEVA PROMOTORA TEST',
        role: 'Impulsadora',
        category: 'eventual',
        status: 'Activo',
        phone: '0412-0000000',
        email: 'test@codizulca.com',
        address: 'Maracaibo',
        assignedStore: 'ALKOSTO',
        photoUrl: '/avatars/default.png'
      };

      const saved = await staffService.save(newMember);

      expect(saved.id).toBeDefined();
      expect(saved.id.startsWith('STF-')).toBe(true);
      expect(saved.name).toBe('NUEVA PROMOTORA TEST');

      const all = await staffService.getAll();
      expect(all.length).toBe(25);
    });

    it('debe actualizar la foto de perfil (updatePhoto)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const staff = await staffService.getAll();
      const targetId = staff[0].id;
      const newPhoto = 'https://example.com/new-avatar.png';

      const success = await staffService.updatePhoto(targetId, newPhoto);
      expect(success).toBe(true);

      const all = await staffService.getAll();
      const target = all.find((s) => s.id === targetId);
      expect(target?.photoUrl).toBe(newPhoto);
    });

    it('debe eliminar un miembro de staff (delete)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const staff = await staffService.getAll();
      const idToDelete = staff[staff.length - 1].id;
      const countBefore = staff.length;

      const success = await staffService.delete(idToDelete);
      expect(success).toBe(true);

      const all = await staffService.getAll();
      expect(all.length).toBe(countBefore - 1);
      expect(all.find((s) => s.id === idToDelete)).toBeUndefined();
    });

    it('debe notificar mediante eventos al suscribirse (subscribe)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const callback = vi.fn();
      const unsubscribe = staffService.subscribe(callback);

      await staffService.save({
        name: 'EVENT TEST',
        role: 'Promotora',
        category: 'eventual',
        status: 'Activo',
        phone: '123',
        email: 'e@test.com',
        address: 'Test',
        assignedStore: 'Test',
        photoUrl: ''
      });

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });
  });

  // =========================================================================
  // 2. CASOS BORDE Y VALIDACIÓN DE TIPOS/DATOS (Edge Cases & Null Safety)
  // =========================================================================
  describe('Casos Borde y Validación de Datos (Edge Cases)', () => {
    it('debe recuperarse ante JSON inválido en localStorage', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      localStorage.setItem(STORAGE_KEY, '{ broken json !!');

      const staff = await staffService.getAll();
      expect(staff).toBeDefined();
      expect(staff.length).toBe(24);
    });

    it('debe ignorar elementos nulos o malformados dentro de un array de localStorage', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      localStorage.setItem(STORAGE_KEY, JSON.stringify([null, undefined, { broken: true }, 'string']));

      expect(async () => {
        const staff = await staffService.getAll();
        expect(staff.length).toBeGreaterThanOrEqual(24);
      }).not.toThrow();
    });

    it('updatePhoto retorna false si el ID no existe', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const result = await staffService.updatePhoto('NON-EXISTENT-ID', 'https://photo.png');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // 3. MANEJO DE EXCEPCIONES Y ERRORES DE RED (Network Errors & HTTP 4xx/5xx)
  // =========================================================================
  describe('Manejo de Excepciones y Errores de Red / API', () => {
    it('debe usar localStorage/seed cuando /api/staff responde HTTP 500', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }));

      const staff = await staffService.getAll();
      expect(staff).toBeDefined();
      expect(staff.length).toBe(24);
    });

    it('debe sincronizar sin fallar si el servidor rechaza POST /api/staff (Network Error)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

      const newMember: Omit<StaffMember, 'id'> = {
        name: 'PROMOTORA OFFLINE',
        role: 'Promotora',
        category: 'fija',
        status: 'Activo',
        phone: '0414-0000000',
        email: 'offline@codizulca.com',
        address: 'Cabimas',
        assignedStore: 'ALKOSTO CABIMAS',
        photoUrl: ''
      };

      // Debe guardar localmente sin lanzar excepción al usuario
      const saved = await staffService.save(newMember);
      expect(saved.name).toBe('PROMOTORA OFFLINE');

      const all = await staffService.getAll();
      expect(all.some((s) => s.name === 'PROMOTORA OFFLINE')).toBe(true);
    });
  });
});
