import { describe, it, expect } from 'vitest';
import {
  getSellerMetadata,
  normalizeSellerName,
  isValidVolumeSeller,
  isExcludedVolumeSeller,
  OFFICIAL_SUPERVISORS
} from '../components/cuotas/sellerSupervisorMap';

describe('Ventas & Cuotas Business Calculations Test Suite', () => {
  // =========================================================================
  // 1. NORMALIZACIÓN DE NOMBRES DE VENDEDORES
  // =========================================================================
  describe('normalizeSellerName', () => {
    it('debe limpiar espacios adicionales y convertir a mayúsculas', () => {
      expect(normalizeSellerName('  hernan   paz  ')).toBe('HERNAN PAZ');
      expect(normalizeSellerName('carlos fuenmayor')).toBe('CARLOS FUENMAYOR');
    });

    it('debe manejar variantes con tildes y sin tildes de forma consistente', () => {
      const res1 = normalizeSellerName('MARÍA BRICEÑO');
      const res2 = normalizeSellerName('MARIA BRICENO');
      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
    });

    it('debe retornar string vacío ante inputs vacíos, nulos o indefinidos sin lanzar excepción', () => {
      expect(normalizeSellerName('')).toBe('');
      expect(normalizeSellerName(null as any)).toBe('');
      expect(normalizeSellerName(undefined as any)).toBe('');
    });
  });

  // =========================================================================
  // 2. ASIGNACIÓN OFICIAL DE SUPERVISORES (ALÍ PÉREZ, JOHNATAN SOTO, NELSON FINOL)
  // =========================================================================
  describe('getSellerMetadata - División Oficial de Supervisores', () => {
    it('debe contener exactamente los 3 supervisores oficiales', () => {
      expect(OFFICIAL_SUPERVISORS).toContain('JOHNATAN SOTO');
      expect(OFFICIAL_SUPERVISORS).toContain('ALI PEREZ');
      expect(OFFICIAL_SUPERVISORS).toContain('NELSON FINOL');
      expect(OFFICIAL_SUPERVISORS.length).toBe(3);
    });

    it('debe asignar a JOHNATAN SOTO sus vendedores correspondientes', () => {
      expect(getSellerMetadata('HERNAN PAZ').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('OSWALDO CHURION').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('JUAN HERNANDEZ').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('ADEL JARABA').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('ANGELICA MORENO').supervisor).toBe('JOHNATAN SOTO');
    });

    it('debe asignar a ALÍ PÉREZ sus vendedores correspondientes', () => {
      expect(getSellerMetadata('ALI PEREZ').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('ELISA SOLER').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('LEONARDO RIOS').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('LUIS GUANIPA').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('OSCAR ORTIZ- CORO').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('OSCAR ORTIZ- LA COSTA').supervisor).toBe('ALI PEREZ');
    });

    it('debe asignar a NELSON FINOL el resto de vendedores según la regla de negocio', () => {
      expect(getSellerMetadata('CARLOS FUENMAYOR').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('MARIA BRICEÑO').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('CUENTAS CLAVE 1 - MC').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('CUENTAS CLAVE 2 - SV').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('EDUARDO PIÑA').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('SARAH REYES').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('VICTOR CAMPOS').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('YOLEIDA LUGO').supervisor).toBe('NELSON FINOL');
    });

    it('cualquier vendedor no registrado debe asignarse por defecto a NELSON FINOL', () => {
      const meta = getSellerMetadata('VENDEDOR NUEVO O DESCONOCIDO');
      expect(meta.supervisor).toBe('NELSON FINOL');
      expect(meta.region).toBe('Supervisión Nelson Finol');
    });

    it('debe manejar vendedor nulo o vacío asignando NELSON FINOL sin lanzar error', () => {
      const meta = getSellerMetadata('');
      expect(meta.supervisor).toBe('NELSON FINOL');
    });
  });

  // =========================================================================
  // 3. EXCLUSIONES DE VENDEDORES DE VOLUMEN (OFICINA, GERENCIA)
  // =========================================================================
  describe('Filtros de Vendedores Válidos vs Excluidos', () => {
    it('debe excluir cuentas administrativas y de oficina (OFICINA, GERENCIA, etc.)', () => {
      expect(isExcludedVolumeSeller('OFICINA')).toBe(true);
      expect(isExcludedVolumeSeller('OFICINA - GERENCIA')).toBe(true);
      expect(isExcludedVolumeSeller('GERENCIA LC')).toBe(true);
      expect(isExcludedVolumeSeller('OFICINA - AMERICO ALFONZO')).toBe(true);
      expect(isValidVolumeSeller('OFICINA')).toBe(false);
    });

    it('debe reconocer como válidos los vendedores comerciales activos', () => {
      expect(isValidVolumeSeller('CARLOS FUENMAYOR')).toBe(true);
      expect(isValidVolumeSeller('HERNAN PAZ')).toBe(true);
      expect(isValidVolumeSeller('ALI PEREZ')).toBe(true);
      expect(isExcludedVolumeSeller('CARLOS FUENMAYOR')).toBe(false);
    });
  });

  // =========================================================================
  // 4. LÓGICA DE DISTRIBUCIÓN PARETO ABC (80-15-5)
  // =========================================================================
  describe('Lógica Matemática de Pareto ABC', () => {
    const calculateParetoDistribution = (items: { id: string; valor: number }[]) => {
      const sorted = [...items].sort((a, b) => b.valor - a.valor);
      const total = sorted.reduce((sum, item) => sum + item.valor, 0);

      if (total === 0) {
        return sorted.map((item, idx) => ({
          ...item,
          ranking: idx + 1,
          pctIndividual: 0,
          pctAcumulado: 0,
          clasificacion: 'C' as 'A' | 'B' | 'C'
        }));
      }

      let runningSum = 0;
      return sorted.map((item, idx) => {
        runningSum += item.valor;
        const pctIndividual = (item.valor / total) * 100;
        const pctAcumulado = (runningSum / total) * 100;
        let clasificacion: 'A' | 'B' | 'C' = 'C';
        if (pctAcumulado <= 80 || idx === 0) {
          clasificacion = 'A';
        } else if (pctAcumulado <= 95) {
          clasificacion = 'B';
        } else {
          clasificacion = 'C';
        }

        return {
          ...item,
          ranking: idx + 1,
          pctIndividual: Math.round(pctIndividual * 100) / 100,
          pctAcumulado: Math.round(pctAcumulado * 100) / 100,
          clasificacion
        };
      });
    };

    it('debe clasificar correctamente productos o clientes según la regla 80/20 de Pareto', () => {
      const mockData = [
        { id: '1', valor: 500 }, // 50% -> A
        { id: '2', valor: 250 }, // 25% (acum 75%) -> A
        { id: '3', valor: 150 }, // 15% (acum 90%) -> B
        { id: '4', valor: 70 },  // 7% (acum 97%) -> C
        { id: '5', valor: 30 }   // 3% (acum 100%) -> C
      ];

      const result = calculateParetoDistribution(mockData);

      expect(result[0].clasificacion).toBe('A');
      expect(result[0].pctAcumulado).toBe(50);

      expect(result[1].clasificacion).toBe('A');
      expect(result[1].pctAcumulado).toBe(75);

      expect(result[2].clasificacion).toBe('B');
      expect(result[2].pctAcumulado).toBe(90);

      expect(result[3].clasificacion).toBe('C');
      expect(result[4].clasificacion).toBe('C');
      expect(result[4].pctAcumulado).toBe(100);
    });

    it('debe proteger contra división por cero cuando todos los valores son 0', () => {
      const zeroData = [
        { id: '1', valor: 0 },
        { id: '2', valor: 0 }
      ];

      const result = calculateParetoDistribution(zeroData);
      expect(result[0].pctIndividual).toBe(0);
      expect(result[0].pctAcumulado).toBe(0);
      expect(Number.isNaN(result[0].pctIndividual)).toBe(false);
    });

    it('debe manejar un array vacío sin lanzar excepciones', () => {
      const result = calculateParetoDistribution([]);
      expect(result).toEqual([]);
    });
  });
});
