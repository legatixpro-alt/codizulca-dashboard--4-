import { describe, it, expect } from 'vitest';
import { getWeekBounds, parseDateDMY, getWeekInfo } from '../pages/TradeMarketing';

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
  });
});
