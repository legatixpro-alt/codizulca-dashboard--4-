import { getSellerMetadata } from './sellerSupervisorMap';

export interface RubroActivationData {
  meta: number;
  activados: number;
}

export interface SellerActivationRow {
  id: string;
  vendedor: string;
  cartera?: number;
  supervisor: string;
  zona: string;
  region: string;
  rubros: {
    aceite: RubroActivationData;
    azucar: RubroActivationData;
    pollo: RubroActivationData;
    estandarAsturias: RubroActivationData;
    mortadelaSalpicaoAsturias: RubroActivationData;
  };
}

export const RUBROS_CONFIG = [
  { key: 'aceite', label: 'ACEITE', shortLabel: 'Aceite' },
  { key: 'azucar', label: 'AZUCAR', shortLabel: 'Azúcar' },
  { key: 'pollo', label: 'POLLO', shortLabel: 'Pollo' },
  { key: 'estandarAsturias', label: 'ESTANDAR Y SUPERIOR ASTURIAS', shortLabel: 'Est. & Sup. Asturias' },
  { key: 'mortadelaSalpicaoAsturias', label: 'MORTADELA SALPICAO Y ASTURIAS', shortLabel: 'Mortadela Salpicao y Asturias' },
] as const;

export type RubroKey = typeof RUBROS_CONFIG[number]['key'];

// Datos oficiales sincronizados de las 23 carteras activas de la Fuerza de Ventas (Maestra Clientes Activos Octubre 2026: 2,514 clientes)
const SHEET_ACTIVATION_SELLERS: Array<{
  name: string;
  cartera: number;
  metas: [number, number, number, number, number];
  act: [number, number, number, number, number];
}> = [
  { name: 'MARIA BRICEÑO', cartera: 127, metas: [77, 77, 40, 64, 35], act: [41, 42, 24, 50, 31] },
  { name: 'MARIANA CHACIN', cartera: 37, metas: [23, 23, 15, 20, 15], act: [14, 18, 12, 11, 10] },
  { name: 'MIKELANGELO DIAZ', cartera: 98, metas: [62, 62, 35, 42, 53], act: [36, 33, 21, 23, 40] },
  { name: 'HERNAN PAZ', cartera: 69, metas: [40, 40, 10, 32, 25], act: [17, 14, 0, 14, 12] },
  { name: 'OSWALDO CHURION', cartera: 73, metas: [37, 37, 15, 25, 35], act: [12, 18, 5, 18, 12] },
  { name: 'CARLOS FUENMAYOR', cartera: 113, metas: [53, 53, 25, 29, 30], act: [9, 13, 5, 17, 14] },
  { name: 'SARAH REYES', cartera: 148, metas: [97, 97, 30, 50, 52], act: [24, 33, 9, 26, 37] },
  { name: 'J PABLO ARAUJO - CAB/OJE', cartera: 55, metas: [32, 32, 18, 20, 15], act: [4, 4, 10, 13, 9] },
  { name: 'JOSE G. GONZALEZ', cartera: 144, metas: [74, 74, 45, 30, 42], act: [8, 21, 37, 24, 17] },
  { name: 'ANGELICA MORENO', cartera: 95, metas: [53, 53, 60, 45, 55], act: [19, 21, 31, 26, 19] },
  { name: 'ADEL JARABA', cartera: 93, metas: [59, 59, 40, 30, 60], act: [22, 25, 17, 13, 17] },
  { name: 'JUAN HERNANDEZ', cartera: 121, metas: [71, 71, 10, 50, 26], act: [21, 22, 5, 22, 15] },
  { name: 'YOLEIDA LUGO', cartera: 100, metas: [57, 57, 43, 33, 40], act: [35, 47, 29, 26, 39] },
  { name: 'SAIRU VALLES', cartera: 36, metas: [20, 20, 18, 16, 16], act: [12, 15, 14, 11, 12] },
  { name: 'ELISA SOLER', cartera: 165, metas: [109, 96, 90, 65, 55], act: [92, 98, 58, 53, 53] },
  { name: 'ALI PEREZ', cartera: 145, metas: [85, 85, 65, 35, 75], act: [3, 9, 6, 2, 9] },
  { name: 'J PABLO ARAUJO', cartera: 163, metas: [98, 98, 75, 48, 50], act: [51, 25, 57, 29, 24] },
  { name: 'EDUARDO PIÑA', cartera: 184, metas: [70, 80, 25, 30, 32], act: [23, 33, 10, 10, 16] },
  { name: 'LEONARDO RIOS', cartera: 101, metas: [52, 52, 23, 25, 25], act: [19, 24, 17, 21, 19] },
  { name: 'MARYERY GARCIA', cartera: 165, metas: [99, 99, 60, 65, 70], act: [42, 50, 43, 20, 37] },
  { name: 'LUIS GUANIPA', cartera: 72, metas: [31, 31, 10, 20, 25], act: [11, 15, 3, 8, 10] },
  { name: 'PEDRO ABREU', cartera: 79, metas: [33, 33, 15, 20, 30], act: [7, 14, 8, 7, 9] },
  { name: 'OSCAR ORTIZ', cartera: 131, metas: [39, 39, 16, 9, 17], act: [10, 22, 8, 9, 11] },
];

export const INITIAL_SELLERS_ACTIVATION: SellerActivationRow[] = SHEET_ACTIVATION_SELLERS.map((s, idx) => {
  const meta = getSellerMetadata(s.name);
  return {
    id: `seller-${idx + 1}`,
    vendedor: s.name,
    cartera: s.cartera,
    supervisor: meta.supervisor,
    zona: meta.zona,
    region: meta.region,
    rubros: {
      aceite: { meta: s.metas[0], activados: s.act[0] },
      azucar: { meta: s.metas[1], activados: s.act[1] },
      pollo: { meta: s.metas[2], activados: s.act[2] },
      estandarAsturias: { meta: s.metas[3], activados: s.act[3] },
      mortadelaSalpicaoAsturias: { meta: s.metas[4], activados: s.act[4] },
    },
  };
});
