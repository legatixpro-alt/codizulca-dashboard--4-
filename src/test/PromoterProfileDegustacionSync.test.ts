import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  degustacionesService,
  matchPromoterName,
  DegustacionItem
} from '../lib/degustacionesService';

describe('Promoter Profile & Cronograma Actual Synchronization Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    degustacionesService.resetToDefaults();
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

      const promoterTastings = degustacionesService.getDegustacionesForPromoter('CARELIZ REYES');
      expect(promoterTastings.length).toBeGreaterThanOrEqual(1);
      const found = promoterTastings.find((d) => d.id === 'DEG-TEST-SYNC-001');
      expect(found).toBeDefined();
      expect(found?.client).toBe('SUPERMARKET FIORELLA EXPRESS, C.A.');
      expect(found?.product).toBe('JAMÓN SUPERIOR');
      expect(found?.vendedor).toBe('MARIANA CHACÍN');

      // Also verifies getActiveDegustacionForPromoter
      const active = degustacionesService.getActiveDegustacionForPromoter('Careliz Reyes');
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

      const active = degustacionesService.getActiveDegustacionForPromoter('Nicole Godoy');
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
      expect(degustacionesService.getDegustacionesForPromoter('FERNANDA LEON').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(true);
      expect(degustacionesService.getDegustacionesForPromoter('NISMARY DERIZAN').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(false);

      // Coordinador reasigna la degustación a NISMARY DERIZAN
      degustacionesService.updateDegustacion({
        ...initialItem,
        promoter: 'NISMARY DERIZAN'
      });

      // Fernanda ya no la tiene en su perfil
      expect(degustacionesService.getDegustacionesForPromoter('FERNANDA LEON').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(false);
      // Nismary ahora la tiene en su perfil
      expect(degustacionesService.getDegustacionesForPromoter('NISMARY DERIZAN').some((d) => d.id === 'DEG-REASSIGN-01')).toBe(true);
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
});
