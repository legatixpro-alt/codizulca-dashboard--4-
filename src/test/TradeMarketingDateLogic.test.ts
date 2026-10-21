import { describe, it, expect } from 'vitest';
import {
  getWeekBounds,
  parseDateDMY,
  getWeekInfo,
  getTodayStart,
  isPastDegustacionDate,
  getDefaultScheduleDateStr
} from '../pages/TradeMarketing';
import {
  matchVendedorName,
  normalizeDateToDMY,
  degustacionesService
} from '../lib/degustacionesService';

describe('TradeMarketing - Date & Sunday Cutoff Logic Test Suite', () => {
  // =========================================================================
  // 1. HAPPY PATH (Casos de Éxito)
  // =========================================================================
  describe('Happy Path (Cálculo de Semanas y Cortes de Domingo)', () => {
    it('debe calcular correctamente los límites de lunes a domingo para una fecha intermedia (Miércoles 21 Octubre 2026)', () => {
      const wednesday = new Date(2026, 9, 21); // 21 Oct 2026
      const { weekStart, weekEnd } = getWeekBounds(wednesday);

      expect(weekStart.getFullYear()).toBe(2026);
      expect(weekStart.getMonth()).toBe(9); // Octubre (0-indexed)
      expect(weekStart.getDate()).toBe(19); // Lunes 19
      expect(weekStart.getHours()).toBe(0);
      expect(weekStart.getMinutes()).toBe(0);

      expect(weekEnd.getFullYear()).toBe(2026);
      expect(weekEnd.getMonth()).toBe(9);
      expect(weekEnd.getDate()).toBe(25); // Domingo 25
      expect(weekEnd.getHours()).toBe(23);
      expect(weekEnd.getMinutes()).toBe(59);
    });

    it('debe mantener la misma semana cuando la fecha de referencia es Domingo (corte semanal)', () => {
      const sunday = new Date(2026, 9, 25); // Domingo 25 Oct 2026
      const { weekStart, weekEnd } = getWeekBounds(sunday);

      expect(weekStart.getDate()).toBe(19); // Lunes 19
      expect(weekEnd.getDate()).toBe(25);   // Domingo 25
    });

    it('debe mantener la misma semana cuando la fecha de referencia es Lunes (inicio semanal)', () => {
      const monday = new Date(2026, 9, 19); // Lunes 19 Oct 2026
      const { weekStart, weekEnd } = getWeekBounds(monday);

      expect(weekStart.getDate()).toBe(19);
      expect(weekEnd.getDate()).toBe(25);
    });

    it('debe parsear fechas en formato DD/MM/YYYY correctamente con parseDateDMY', () => {
      const parsed = parseDateDMY('15/10/2026');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(9); // Octubre
      expect(parsed.getDate()).toBe(15);
    });

    it('debe parsear fechas en formato ISO YYYY-MM-DD enviadas por la App de Vendedores', () => {
      const parsed = parseDateDMY('2026-10-17');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(9);
      expect(parsed.getDate()).toBe(17);

      const info = getWeekInfo('2026-10-17');
      expect(info.weekNumber).toBe(3);
      expect(info.weekLabel).toBe('Semana 3');
    });

    it('debe normalizar cualquier formato de fecha a DD/MM/YYYY con normalizeDateToDMY', () => {
      expect(normalizeDateToDMY('2026-10-17')).toBe('17/10/2026');
      expect(normalizeDateToDMY('2026-10-08T15:20:00Z')).toBe('08/10/2026');
      expect(normalizeDateToDMY('8/10/2026')).toBe('08/10/2026');
      expect(normalizeDateToDMY('17-10-2026')).toBe('17/10/2026');
    });

    it('debe emparejar nombres de vendedores con o sin acentos (matchVendedorName)', () => {
      expect(matchVendedorName('MARIANA CHACÍN', 'MARIANA CHACIN')).toBe(true);
      expect(matchVendedorName('MARÍA BRICEÑO', 'MARIA BRICEÑO')).toBe(true);
      expect(matchVendedorName('HERNÁN PAZ', 'HERNAN PAZ')).toBe(true);
      expect(matchVendedorName('OSWALDO CHURIÓN', 'OSWALDO CHURION')).toBe(true);
      expect(matchVendedorName('JUAN HERNÁNDEZ', 'JUAN HERNANDEZ')).toBe(true);
      expect(matchVendedorName('SAIRÚ VALLES', 'SAIRU VALLES')).toBe(true);
      expect(matchVendedorName('CARLOS FUENMAYOR', 'MARIANA CHACIN')).toBe(false);
    });

    it('debe clasificar correctamente las 5 semanas de Octubre con getWeekInfo', () => {
      const w1 = getWeekInfo('02/10/2026');
      expect(w1.weekNumber).toBe(1);
      expect(w1.weekLabel).toBe('Semana 1');

      const w2 = getWeekInfo('08/10/2026');
      expect(w2.weekNumber).toBe(2);
      expect(w2.weekLabel).toBe('Semana 2');

      const w3 = getWeekInfo('15/10/2026');
      expect(w3.weekNumber).toBe(3);
      expect(w3.weekLabel).toBe('Semana 3');

      const w4 = getWeekInfo('22/10/2026');
      expect(w4.weekNumber).toBe(4);
      expect(w4.weekLabel).toBe('Semana 4');

      const w5 = getWeekInfo('29/10/2026');
      expect(w5.weekNumber).toBe(5);
      expect(w5.weekLabel).toBe('Semana 5');
    });
  });

  // =========================================================================
  // 2. CASOS BORDE Y VALIDACIÓN DE TIPOS/DATOS (Edge Cases & Boundaries)
  // =========================================================================
  describe('Casos Borde y Validación de Fechas (Edge Cases)', () => {
    it('debe manejar cambios de mes y año al calcular límites de semana', () => {
      // 1 de Enero de 2026 (Jueves)
      const jan1 = new Date(2026, 0, 1);
      const { weekStart, weekEnd } = getWeekBounds(jan1);

      // El lunes de esa semana cayó en diciembre 2025
      expect(weekStart.getFullYear()).toBe(2025);
      expect(weekStart.getMonth()).toBe(11); // Diciembre
      expect(weekStart.getDate()).toBe(29);  // 29 Dic 2025

      // El domingo cae en enero 2026
      expect(weekEnd.getFullYear()).toBe(2026);
      expect(weekEnd.getMonth()).toBe(0);
      expect(weekEnd.getDate()).toBe(4);    // 4 Ene 2026
    });

    it('parseDateDMY debe retornar Date válido sin lanzar excepción ante string vacío o malformado', () => {
      expect(() => parseDateDMY('')).not.toThrow();
      expect(parseDateDMY('') instanceof Date).toBe(true);

      expect(() => parseDateDMY('invalid-date')).not.toThrow();
      expect(parseDateDMY('invalid-date') instanceof Date).toBe(true);
    });

    it('getWeekInfo debe manejar strings malformados retornando fallback seguro sin lanzar excepción', () => {
      expect(() => getWeekInfo('')).not.toThrow();
      const fallback = getWeekInfo('');
      expect(fallback.weekNumber).toBeDefined();
      expect(fallback.weekLabel).toBeDefined();
    });

    it('debe clasificar correctamente una fecha en el corte exacto de medianoche del Domingo', () => {
      const { weekStart, weekEnd } = getWeekBounds(new Date(2026, 9, 21));

      // Degustación del domingo 18 Octubre (semana anterior)
      const pastSunday = parseDateDMY('18/10/2026');
      expect(pastSunday < weekStart).toBe(true); // Debe ir a Historial

      // Degustación del lunes 19 Octubre (inicio de semana en curso)
      const thisMonday = parseDateDMY('19/10/2026');
      expect(thisMonday >= weekStart && thisMonday <= weekEnd).toBe(true); // Debe ir a Cronograma Actual
    });

    it('debe pasar las degustaciones previas al Historial y dejar el Cronograma Actual limpio', () => {
      // Hoy: Lunes 19 de Octubre de 2026
      const refToday = new Date(2026, 9, 19, 8, 0, 0);
      const todayStart = getTodayStart(refToday);

      expect(todayStart.getFullYear()).toBe(2026);
      expect(todayStart.getMonth()).toBe(9);
      expect(todayStart.getDate()).toBe(19);
      expect(todayStart.getHours()).toBe(0);

      const allItems = degustacionesService.getDegustaciones();

      // Regla de negocio oficial de Trade Marketing:
      // 1. Solo las nuevas solicitudes 'scheduled' o 'in_progress' aparecen en Cronograma Actual
      // 2. Todas las actividades completadas pasan al Historial dejando el Cronograma Actual limpio
      const currentItems = allItems.filter((item) => {
        return item.status === 'scheduled' || item.status === 'in_progress';
      });
      const historicalItems = allItems.filter((item) => {
        return item.status !== 'scheduled' && item.status !== 'in_progress';
      });

      // El Cronograma Actual queda limpio (0) y todas las degustaciones pasan al Historial
      expect(currentItems.length).toBe(0);
      expect(historicalItems.length).toBe(allItems.length);
      expect(historicalItems.length).toBeGreaterThanOrEqual(54);

      // Verificación de fechas para nuevas solicitudes programadas
      expect(isPastDegustacionDate('19/10/2026', todayStart)).toBe(false);
      expect(isPastDegustacionDate('20/10/2026', todayStart)).toBe(false);
      expect(getDefaultScheduleDateStr(refToday)).toBe('19/10/2026');
    });
  });
});

