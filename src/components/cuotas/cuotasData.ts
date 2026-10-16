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

// Datos exactos sincronizados de la pestaña "Cuotas de Activacion" del Google Sheet (23 vendedores)
const SHEET_ACTIVATION_SELLERS: Array<{
  name: string;
  cartera: number;
  metas: [number, number, number, number, number];
  act: [number, number, number, number, number];
}> = [
  { name: 'MARIA BRICEÑO', cartera: 128, metas: [77, 77, 40, 64, 35], act: [39, 39, 24, 50, 31] },
  { name: 'MIKELANGELO DIAZ', cartera: 67, metas: [40, 40, 25, 32, 38], act: [27, 24, 19, 21, 32] },
  { name: 'HERNAN PAZ', cartera: 66, metas: [40, 40, 10, 32, 25], act: [16, 14, 0, 14, 10] },
  { name: 'OSWALDO CHURION', cartera: 62, metas: [37, 37, 15, 25, 35], act: [11, 17, 5, 18, 12] },
  { name: 'OSCAR ORTIZ- LA COSTA', cartera: 13, metas: [8, 8, 1, 3, 2], act: [3, 5, 1, 4, 3] },
  { name: 'OSCAR ORTIZ- CORO', cartera: 52, metas: [31, 31, 15, 6, 15], act: [5, 13, 7, 3, 6] },
  { name: 'CARLOS FUENMAYOR', cartera: 89, metas: [53, 53, 25, 29, 30], act: [9, 13, 5, 17, 14] },
  { name: 'SARAH REYES', cartera: 158, metas: [97, 97, 30, 50, 52], act: [22, 33, 9, 26, 37] },
  { name: 'J PABLO ARAUJO - CAB/OJE', cartera: 54, metas: [32, 32, 18, 20, 15], act: [4, 4, 10, 13, 9] },
  { name: 'JOSE G. GONZALEZ', cartera: 123, metas: [74, 74, 45, 30, 42], act: [8, 21, 34, 11, 11] },
  { name: 'ANGELICA MORENO', cartera: 88, metas: [53, 53, 60, 45, 55], act: [19, 21, 31, 26, 19] },
  { name: 'ADEL JARABA', cartera: 98, metas: [59, 59, 40, 30, 60], act: [22, 25, 17, 13, 17] },
  { name: 'JUAN HERNANDEZ', cartera: 119, metas: [71, 71, 10, 50, 26], act: [19, 20, 5, 20, 13] },
  { name: 'YOLEIDA LUGO', cartera: 95, metas: [57, 57, 43, 33, 40], act: [33, 41, 23, 20, 30] },
  { name: 'ELISA SOLER', cartera: 160, metas: [109, 96, 90, 65, 55], act: [63, 75, 52, 42, 40] },
  { name: 'ALI PEREZ', cartera: 141, metas: [85, 85, 65, 35, 75], act: [3, 9, 5, 2, 8] },
  { name: 'J PABLO ARAUJO', cartera: 163, metas: [98, 98, 75, 48, 50], act: [51, 25, 55, 29, 24] },
  { name: 'EDUARDO PIÑA', cartera: 182, metas: [70, 80, 25, 30, 32], act: [23, 33, 10, 10, 16] },
  { name: 'MIKELANGELO DIAZ - VILLA DEL ROS', cartera: 36, metas: [22, 22, 10, 10, 15], act: [9, 9, 2, 2, 8] },
  { name: 'LEONARDO RIOS', cartera: 87, metas: [52, 52, 23, 25, 25], act: [15, 16, 15, 15, 15] },
  { name: 'MARYERY GARCIA', cartera: 165, metas: [99, 99, 60, 65, 70], act: [42, 50, 43, 20, 37] },
  { name: 'LUIS GUANIPA', cartera: 52, metas: [31, 31, 10, 20, 25], act: [7, 11, 1, 5, 7] },
  { name: 'PEDRO ABREU', cartera: 55, metas: [33, 33, 15, 20, 30], act: [7, 13, 8, 7, 9] },
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
