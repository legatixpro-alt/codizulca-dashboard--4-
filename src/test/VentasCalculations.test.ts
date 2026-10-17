import { describe, it, expect } from 'vitest';
import {
  getSellerMetadata,
  normalizeSellerName,
  isValidVolumeSeller,
  isExcludedVolumeSeller,
  OFFICIAL_SUPERVISORS,
  OFFICIAL_SELLERS_LIST
} from '../components/cuotas/sellerSupervisorMap';
import { INITIAL_SELLERS_ACTIVATION } from '../components/cuotas/cuotasData';
import { SELLER_VOLUME_QUOTAS } from '../components/cuotas/volumeQuotasData';
import { CARTERA_CLIENTES } from '../data/carteraClientes';
import { ENRICHED_CLIENTS } from '../data/clientsWithLocation';

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
      expect(res1).toBe('MARIA BRICEÑO');
      expect(res2).toBe('MARIA BRICEÑO');
    });

    it('debe normalizar códigos legacy y pasar las rutas de Johnatan Soto a MIKELANGELO DIAZ', () => {
      expect(normalizeSellerName('CUENTAS CLAVE 1 - MC')).toBe('MARIANA CHACIN');
      expect(normalizeSellerName('CUENTAS CLAVE 2 - SV')).toBe('SAIRU VALLES');
      expect(normalizeSellerName('OSCAR ORTIZ- CORO')).toBe('OSCAR ORTIZ');
      expect(normalizeSellerName('OSCAR ORTIZ- LA COSTA')).toBe('OSCAR ORTIZ');
      expect(normalizeSellerName('MIKELANGELO DIAZ')).toBe('MIKELANGELO DIAZ');
      expect(normalizeSellerName('MIKELANGELO DIAZ - VILLA DEL ROS')).toBe('MIKELANGELO DIAZ');
      expect(normalizeSellerName('JOHNATAN SOTO')).toBe('MIKELANGELO DIAZ');
      expect(normalizeSellerName('JOHNATAN SOTO VILLA DEL ROS')).toBe('MIKELANGELO DIAZ');
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
  describe('getSellerMetadata - División Oficial de Supervisores y Fuerza de Ventas', () => {
    it('debe contener exactamente los 3 supervisores oficiales y las 23 carteras activas de ventas', () => {
      expect(OFFICIAL_SUPERVISORS).toContain('JOHNATAN SOTO');
      expect(OFFICIAL_SUPERVISORS).toContain('ALI PEREZ');
      expect(OFFICIAL_SUPERVISORS).toContain('NELSON FINOL');
      expect(OFFICIAL_SUPERVISORS.length).toBe(3);
      expect(OFFICIAL_SELLERS_LIST.length).toBe(23);
      expect(INITIAL_SELLERS_ACTIVATION.length).toBe(23);
      expect(Object.keys(SELLER_VOLUME_QUOTAS).length).toBe(23);
    });

    it('debe asignar a JOHNATAN SOTO sus 6 vendedores (con los clientes de Johnatan asignados a Mikelangelo Diaz)', () => {
      expect(getSellerMetadata('MIKELANGELO DIAZ').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('MIKELANGELO DIAZ - VILLA DEL ROS').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('HERNAN PAZ').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('OSWALDO CHURION').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('JUAN HERNANDEZ').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('ADEL JARABA').supervisor).toBe('JOHNATAN SOTO');
      expect(getSellerMetadata('ANGELICA MORENO').supervisor).toBe('JOHNATAN SOTO');
    });

    it('debe asignar a ALÍ PÉREZ sus 5 carteras correspondientes (1 propia + 4 vendedores)', () => {
      expect(getSellerMetadata('ALI PEREZ').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('ELISA SOLER').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('LEONARDO RIOS').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('LUIS GUANIPA').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('OSCAR ORTIZ').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('OSCAR ORTIZ- CORO').supervisor).toBe('ALI PEREZ');
      expect(getSellerMetadata('OSCAR ORTIZ- LA COSTA').supervisor).toBe('ALI PEREZ');
    });

    it('debe asignar a NELSON FINOL sus 12 carteras de vendedores según la regla de negocio', () => {
      expect(getSellerMetadata('MARIA BRICEÑO').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('MARIANA CHACIN').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('CARLOS FUENMAYOR').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('SARAH REYES').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('J PABLO ARAUJO - CAB/OJE').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('JOSE G. GONZALEZ').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('YOLEIDA LUGO').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('SAIRU VALLES').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('J PABLO ARAUJO').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('EDUARDO PIÑA').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('MARYERY GARCIA').supervisor).toBe('NELSON FINOL');
      expect(getSellerMetadata('PEDRO ABREU').supervisor).toBe('NELSON FINOL');
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
  // 3. EXCLUSIONES Y VALIDACIÓN EXACTA DE LA CARTERA DE CLIENTES OCTUBRE 2026
  // =========================================================================
  describe('Filtros de Vendedores Válidos y Cartera Exacta de Clientes Octubre 2026', () => {
    it('debe excluir cuentas administrativas y de oficina (OFICINA, GERENCIA, etc.)', () => {
      expect(isExcludedVolumeSeller('OFICINA')).toBe(true);
      expect(isExcludedVolumeSeller('OFICINA - GERENCIA')).toBe(true);
      expect(isExcludedVolumeSeller('GERENCIA LC')).toBe(true);
      expect(isExcludedVolumeSeller('OFICINA - AMERICO ALFONZO')).toBe(true);
      expect(isValidVolumeSeller('OFICINA')).toBe(false);
    });

    it('debe reconocer como válidos los 23 registros comerciales activos', () => {
      OFFICIAL_SELLERS_LIST.forEach((seller) => {
        expect(isValidVolumeSeller(seller)).toBe(true);
        expect(isExcludedVolumeSeller(seller)).toBe(false);
      });
    });

    it('debe sincronizar exactamente los 2,514 clientes activos de Octubre 2026 asignando a Mikelangelo Diaz sus 98 clientes', () => {
      expect(CARTERA_CLIENTES.length).toBe(2514);
      expect(ENRICHED_CLIENTS.length).toBe(2514);

      const countBySeller = new Map<string, number>();
      ENRICHED_CLIENTS.forEach((c) => {
        countBySeller.set(c.vendedor, (countBySeller.get(c.vendedor) || 0) + 1);
      });

      expect(countBySeller.get('MIKELANGELO DIAZ')).toBe(98);
      expect(countBySeller.get('EDUARDO PIÑA')).toBe(184);
      expect(countBySeller.get('ELISA SOLER')).toBe(165);
      expect(countBySeller.get('MARYERY GARCIA')).toBe(165);
      expect(countBySeller.get('J PABLO ARAUJO')).toBe(163);
      expect(countBySeller.get('SARAH REYES')).toBe(148);
      expect(countBySeller.get('ALI PEREZ')).toBe(145);
      expect(countBySeller.get('JOSE G. GONZALEZ')).toBe(144);
      expect(countBySeller.get('OSCAR ORTIZ')).toBe(131);
      expect(countBySeller.get('MARIA BRICEÑO')).toBe(127);
      expect(countBySeller.get('JUAN HERNANDEZ')).toBe(121);
      expect(countBySeller.get('CARLOS FUENMAYOR')).toBe(113);
      expect(countBySeller.get('LEONARDO RIOS')).toBe(101);
      expect(countBySeller.get('YOLEIDA LUGO')).toBe(100);
      expect(countBySeller.get('ANGELICA MORENO')).toBe(95);
      expect(countBySeller.get('ADEL JARABA')).toBe(93);
      expect(countBySeller.get('PEDRO ABREU')).toBe(79);
      expect(countBySeller.get('OSWALDO CHURION')).toBe(73);
      expect(countBySeller.get('LUIS GUANIPA')).toBe(72);
      expect(countBySeller.get('HERNAN PAZ')).toBe(69);
      expect(countBySeller.get('J PABLO ARAUJO - CAB/OJE')).toBe(55);
      expect(countBySeller.get('MARIANA CHACIN')).toBe(37);
      expect(countBySeller.get('SAIRU VALLES')).toBe(36);
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
