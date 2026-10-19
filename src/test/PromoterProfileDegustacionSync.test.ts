import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  degustacionesService,
  matchPromoterName,
  matchPromoterAssignment,
  resolvePromoterIdentity,
  OFFICIAL_PROMOTER_DIRECTORY,
  DegustacionItem
} from '../lib/degustacionesService';
import { PROMOTERS_LIST } from '../lib/campoService';

describe('Promoter Profile & Cronograma Actual Synchronization Suite', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    }));
    localStorage.clear();
    degustacionesService.resetToDefaults();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. matchPromoterName Normalization & Precision Matching', () => {
    it('matches exact uppercase and lowercase names', () => {
      expect(matchPromoterName('NICOLE GODOY', 'Nicole Godoy')).toBe(true);
      expect(matchPromoterName('fernanda leon', 'FERNANDA LEON')).toBe(true);
    });

    it('matches names with or without accents (Á, É, Í, Ó, Ú)', () => {
      expect(matchPromoterName('Maria de los Ángeles Almarza', 'MARIA DE LOS ANGELES ALMARZA')).toBe(true);
      expect(matchPromoterName('SCARLETH PIÑA', 'Scarleth Pina')).toBe(true);
    });

    it('matches compound names when first name and surname are present', () => {
      expect(matchPromoterName('Maria de los Ángeles Almarza', 'MARIA ALMARZA')).toBe(true);
      expect(matchPromoterName('MARIA ALMARZA', 'Maria de los Ángeles Almarza')).toBe(true);
    });

    it('never matches "POR ASIGNAR (Trade Marketing)" to any promoter', () => {
      expect(matchPromoterName('POR ASIGNAR (Trade Marketing)', 'NICOLE GODOY')).toBe(false);
      expect(matchPromoterName('POR ASIGNAR', 'MARIA ALMARZA')).toBe(false);
      expect(matchPromoterName('CARELIZ REYES', 'POR ASIGNAR (Trade Marketing)')).toBe(false);
    });

    it('never cross-matches distinct names sharing partial substrings', () => {
      // MARIANA CHACIN (vendedor) vs MARIA ALMARZA (promotora)
      expect(matchPromoterName('MARIANA CHACIN', 'MARIA ALMARZA')).toBe(false);
      // ANA ECHEVERRIA vs MARIANA CHACIN
      expect(matchPromoterName('ANA ECHEVERRIA', 'MARIANA CHACIN')).toBe(false);
      // MARIA ALMARZA vs MARIANGEL VALDIVIESO vs MARIANYEL ARANDA
      expect(matchPromoterName('Maria de los Ángeles Almarza Arnedo', 'MARIANGEL VALDIVIESO')).toBe(false);
      expect(matchPromoterName('Maria de los Ángeles Almarza Arnedo', 'MARIANYEL ARANDA')).toBe(false);
      expect(matchPromoterName('MARIANGEL VALDIVIESO', 'MARIANYEL ARANDA')).toBe(false);
      // ANGELICA SANCHEZ (promotora) vs ANGELICA MORENO (vendedor)
      expect(matchPromoterName('ANGELICA SANCHEZ', 'ANGELICA MORENO')).toBe(false);
    });
  });

  describe('2. Schedule Loading into Promoter Profile', () => {
    it('returns empty list for a promoter with no current assignments', () => {
      const items = degustacionesService.getDegustacionesForPromoter('PROMOTORA SIN ASIGNACION');
      expect(items).toEqual([]);
      const active = degustacionesService.getActiveDegustacionForPromoter('PROMOTORA SIN ASIGNACION');
      expect(active).toBeNull();
    });

    it('immediately reflects an assigned degustación in promoter profile when scheduled in Cronograma Actual', () => {
      const newDegustacion: DegustacionItem = {
        id: 'DEG-TEST-SYNC-001',
        date: '20/10/2026',
        time: '09:00 AM - 01:00 PM',
        activity: 'Degustación Jamón Superior - Test Sync',
        product: 'JAMÓN SUPERIOR',
        promoter: 'CARELIZ REYES',
        promoterRole: 'Impulsadora',
        client: 'SUPERMARKET FIORELLA EXPRESS, C.A.',
        zone: 'Punto Fijo',
        vendedor: 'MARIANA CHACÍN',
        source: 'vendedor_app',
        status: 'scheduled',
        delivered: 0,
        target: 200,
        acceptanceRate: 0,
        comments: 'Coordinado para fin de semana'
      };

      degustacionesService.addDegustacion(newDegustacion);

      const promoterTastings = degustacionesService.getDegustacionesForPromoter('CARELIZ REYES', 'REYESCARELIZ3@GMAIL.COM');
      expect(promoterTastings.length).toBeGreaterThanOrEqual(1);
      const found = promoterTastings.find((d) => d.id === 'DEG-TEST-SYNC-001');
      expect(found).toBeDefined();
      expect(found?.client).toBe('SUPERMARKET FIORELLA EXPRESS, C.A.');
      expect(found?.product).toBe('JAMÓN SUPERIOR');
      expect(found?.vendedor).toBe('MARIANA CHACÍN');
      expect(found?.promoterEmail?.toLowerCase()).toBe('reyescareliz3@gmail.com');
      expect(found?.promoterId).toBe('STF-006');

      // Also verifies getActiveDegustacionForPromoter
      const active = degustacionesService.getActiveDegustacionForPromoter('Careliz Reyes', 'reyescareliz3@gmail.com');
      expect(active).not.toBeNull();
      expect(active?.id).toBe('DEG-TEST-SYNC-001');
    });

    it('prioritizes in_progress status over scheduled when querying active degustación', () => {
      const schedItem: DegustacionItem = {
        id: 'DEG-SCHED-01',
        date: '21/10/2026',
        time: '09:00 AM - 01:00 PM',
        activity: 'Degustación Queso Crema',
        product: 'QUESO CREMA',
        promoter: 'NICOLE GODOY',
        promoterRole: 'Impulsadora',
        client: 'ALKOSTO BELLA VISTA',
        zone: 'CORO',
        vendedor: 'CARLOS FUENMAYOR',
        source: 'coordinacion',
        status: 'scheduled',
        delivered: 0,
        target: 100,
        acceptanceRate: 0
      };

      const inProgItem: DegustacionItem = {
        id: 'DEG-PROG-02',
        date: '21/10/2026',
        time: '02:00 PM - 06:00 PM',
        activity: 'Degustación Salchicha Viena',
        product: 'SALCHICHA VIENA',
        promoter: 'NICOLE GODOY',
        promoterRole: 'Impulsadora',
        client: 'FARMAPLUS GRAN BAZAR',
        zone: 'CORO',
        vendedor: 'MARIANA CHACÍN',
        source: 'vendedor_app',
        status: 'in_progress',
        delivered: 45,
        target: 150,
        acceptanceRate: 85
      };

      degustacionesService.addDegustacion(schedItem);
      degustacionesService.addDegustacion(inProgItem);

      const active = degustacionesService.getActiveDegustacionForPromoter('Nicole Godoy', 'godoyaraujonicole@gmail.com');
      expect(active?.id).toBe('DEG-PROG-02');
      expect(active?.status).toBe('in_progress');
    });

    it('reactively transfers degustación between promoters when updated in schedule', () => {
      const initialItem: DegustacionItem = {
        id: 'DEG-REASSIGN-01',
        date: '22/10/2026',
        time: '10:00 AM - 02:00 PM',
        activity: 'Degustación Tocineta Ahumada',
        product: 'TOCINETA AHUMADA',
        promoter: 'FERNANDA LEON',
        promoterRole: 'Impulsadora',
        client: 'HIPERMERCADO VIVIANA',
        zone: 'LA VILLA',
        vendedor: 'MARIANA CHACÍN',
        source: 'vendedor_app',
        status: 'scheduled',
        delivered: 0,
        target: 120,
        acceptanceRate: 0
      };

      degustacionesService.addDegustacion(initialItem);
      expect(degustacionesService.getDegustacionesForPromoter('FERNANDA LEON', 'fer171205@gmail.com').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(true);
      expect(degustacionesService.getDegustacionesForPromoter('NISMARY DERIZAN', 'Nismariderizan3@gmail.com').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(false);

      // Coordinador reasigna la degustación a NISMARY DERIZAN
      degustacionesService.updateDegustacion({
        ...initialItem,
        promoter: 'NISMARY DERIZAN'
      });

      // Fernanda ya no la tiene en su perfil
      expect(degustacionesService.getDegustacionesForPromoter('FERNANDA LEON', 'fer171205@gmail.com').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(false);
      // Nismary ahora la tiene en su perfil
      expect(degustacionesService.getDegustacionesForPromoter('NISMARY DERIZAN', 'Nismariderizan3@gmail.com').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(true);
    });

    it('notifies subscribers via Event when schedule changes occur', () => {
      const listener = vi.fn();
      const unsubscribe = degustacionesService.subscribe(listener);

      degustacionesService.addDegustacion({
        id: 'DEG-EVENT-TEST',
        date: '23/10/2026',
        time: '09:00 AM - 01:00 PM',
        activity: 'Degustación Test Evento',
        product: 'MORTADELA ESPECIAL',
        promoter: 'DARIANNYS FERRER',
        promoterRole: 'Impulsadora',
        client: 'ALKOSTO TRIBUNALES',
        zone: 'SANTA MARIA',
        vendedor: 'CARLOS FUENMAYOR',
        source: 'coordinacion',
        status: 'scheduled',
        delivered: 0,
        target: 100,
        acceptanceRate: 0
      });

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('3. Exact 24-Promoter Email & Name Route Isolation (/portal/login -> /portal/ruta)', () => {
    it('synchronizes all 24 official promoters between PROMOTERS_LIST and OFFICIAL_PROMOTER_DIRECTORY', () => {
      expect(PROMOTERS_LIST.length).toBe(24);
      expect(OFFICIAL_PROMOTER_DIRECTORY.length).toBe(24);

      for (const p of PROMOTERS_LIST) {
        const resolvedByName = resolvePromoterIdentity(p.name);
        const resolvedByEmail = resolvePromoterIdentity(p.email);
        expect(resolvedByName).not.toBeNull();
        expect(resolvedByEmail).not.toBeNull();
        expect(resolvedByName?.id).toBe(p.id);
        expect(resolvedByEmail?.id).toBe(p.id);
        expect(resolvedByName?.email.toLowerCase()).toBe(p.email.toLowerCase());
      }
    });

    it('assigns accepted degustaciones strictly to the selected promoter and NEVER to any of the other 23 promoters', () => {
      // Para cada una de las 24 promotoras, aceptamos una degustación de los vendedores y verificamos aislamiento 1 a 1
      for (const assignedPromoter of PROMOTERS_LIST) {
        const testDegId = `DEG-EXACT-${assignedPromoter.id}`;
        const item: DegustacionItem = {
          id: testDegId,
          date: '18/10/2026',
          time: '09:00 AM - 01:00 PM',
          activity: `Degustación MORTADELA - Asignada a ${assignedPromoter.name}`,
          product: 'MORTADELA',
          promoter: assignedPromoter.name,
          promoterEmail: assignedPromoter.email,
          promoterId: assignedPromoter.id,
          promoterRole: assignedPromoter.role,
          client: 'ALKOSTO DONDE COMPRAR ES GANAR, C.A.',
          zone: assignedPromoter.zone,
          vendedor: 'MARIANA CHACÍN',
          source: 'vendedor_app',
          status: 'scheduled',
          delivered: 0,
          target: 150,
          acceptanceRate: 0
        };

        for (const candidatePromoter of PROMOTERS_LIST) {
          const isMatch = matchPromoterAssignment(item, candidatePromoter, candidatePromoter.email);
          if (candidatePromoter.id === assignedPromoter.id) {
            expect(isMatch).toBe(true);
          } else {
            expect(isMatch).toBe(false);
          }
        }
      }
    });
  });
});

