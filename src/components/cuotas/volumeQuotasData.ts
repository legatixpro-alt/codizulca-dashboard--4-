import { normalizeSellerName } from './sellerSupervisorMap';

export interface SkuQuotaRealPair {
  q: number;
  r: number;
}

export interface SellerVolumeQuota {
  kgs: number;
  realKgsOct: number;
  cajas: number;
  monto: number;
  byCat?: {
    aceite: SkuQuotaRealPair;
    azucar: SkuQuotaRealPair;
    pollo: SkuQuotaRealPair;
    estandarAsturias: SkuQuotaRealPair;
    mortadelaSalpicaoAsturias: SkuQuotaRealPair;
  };
}

// Metas y ejecución oficial de volumen mensual (Octubre 2026) extraídas directamente de la pestaña "Cuotas Volumen" del Google Sheet
// Total Global (28 vendedores): Cuota = 2,914,293.70 Kg | Real = 945,146.60 Kg (32.4%)
// - NELSON FINOL (14 vendedores): Cuota = 1,567,033.90 Kg | Real = 599,006.20 Kg (38.2%)
// - JOHNATAN SOTO (8 vendedores): Cuota = 778,155.00 Kg | Real = 173,688.10 Kg (22.3%)
// - ALI PEREZ (6 vendedores): Cuota = 569,104.80 Kg | Real = 172,452.30 Kg (30.3%)
export const SELLER_VOLUME_QUOTAS: Record<string, SellerVolumeQuota> = {
  // ==========================================
  // SUPERVISOR: NELSON FINOL (14 Vendedores)
  // ==========================================
  'CARLOS FUENMAYOR': {
    kgs: 135530.30,
    realKgsOct: 52072.30,
    cajas: 18762,
    monto: 255687,
    byCat: {
      aceite: { q: 11330.70, r: 1222.10 },
      azucar: { q: 20564.70, r: 25480.00 },
      pollo: { q: 15495.10, r: 3637.90 },
      estandarAsturias: { q: 925.90, r: 394.80 },
      mortadelaSalpicaoAsturias: { q: 9089.80, r: 3413.60 },
    },
  },
  'EDUARDO PIÑA': {
    kgs: 90851.30,
    realKgsOct: 30599.40,
    cajas: 17030,
    monto: 269533,
    byCat: {
      aceite: { q: 1960.00, r: 556.40 },
      azucar: { q: 9462.30, r: 4500.00 },
      pollo: { q: 13260.10, r: 2688.70 },
      estandarAsturias: { q: 620.70, r: 264.70 },
      mortadelaSalpicaoAsturias: { q: 6093.30, r: 2288.20 },
    },
  },
  'J PABLO ARAUJO': {
    kgs: 167407.40,
    realKgsOct: 65705.20,
    cajas: 75372,
    monto: 513755,
    byCat: {
      aceite: { q: 6385.50, r: 1281.70 },
      azucar: { q: 11618.90, r: 1099.00 },
      pollo: { q: 64344.10, r: 24245.20 },
      estandarAsturias: { q: 1143.70, r: 487.70 },
      mortadelaSalpicaoAsturias: { q: 11227.80, r: 4216.40 },
    },
  },
  'J PABLO ARAUJO - CAB/OJE': {
    kgs: 69456.60,
    realKgsOct: 26225.90,
    cajas: 21697,
    monto: 201275,
    byCat: {
      aceite: { q: 2470.70, r: 985.20 },
      azucar: { q: 5555.70, r: 4100.00 },
      pollo: { q: 15635.90, r: 6180.40 },
      estandarAsturias: { q: 474.50, r: 202.40 },
      mortadelaSalpicaoAsturias: { q: 4658.40, r: 1749.50 },
    },
  },
  'JOSE G. GONZALEZ': {
    kgs: 101468.30,
    realKgsOct: 34016.70,
    cajas: 69241,
    monto: 306952,
    byCat: {
      aceite: { q: 9415.20, r: 1680.40 },
      azucar: { q: 21450.00, r: 11200.00 },
      pollo: { q: 22140.50, r: 8420.30 },
      estandarAsturias: { q: 693.20, r: 295.60 },
      mortadelaSalpicaoAsturias: { q: 6805.40, r: 2555.70 },
    },
  },
  'MARIA BRICEÑO': {
    kgs: 102146.20,
    realKgsOct: 26875.60,
    cajas: 41314,
    monto: 345138,
    byCat: {
      aceite: { q: 9540.30, r: 1420.50 },
      azucar: { q: 22180.40, r: 8950.00 },
      pollo: { q: 21890.20, r: 6840.10 },
      estandarAsturias: { q: 697.80, r: 297.60 },
      mortadelaSalpicaoAsturias: { q: 6850.90, r: 2572.70 },
    },
  },
  'CUENTAS CLAVE 1 - MC': {
    kgs: 91100.80,
    realKgsOct: 54836.50,
    cajas: 13452,
    monto: 191272,
    byCat: {
      aceite: { q: 8420.10, r: 2410.80 },
      azucar: { q: 19840.20, r: 18420.00 },
      pollo: { q: 18920.40, r: 12450.60 },
      estandarAsturias: { q: 622.40, r: 265.40 },
      mortadelaSalpicaoAsturias: { q: 6110.10, r: 2294.50 },
    },
  },
  'CUENTAS CLAVE 2 - SV': {
    kgs: 312852.50,
    realKgsOct: 119035.90,
    cajas: 49506,
    monto: 572246,
    byCat: {
      aceite: { q: 29840.50, r: 5890.20 },
      azucar: { q: 68420.30, r: 42150.00 },
      pollo: { q: 65420.80, r: 28410.50 },
      estandarAsturias: { q: 2137.30, r: 911.40 },
      mortadelaSalpicaoAsturias: { q: 20982.80, r: 7879.80 },
    },
  },
  'FOOD SERVICE SENIOR - JUAN HERNANDEZ': {
    kgs: 14278.10,
    realKgsOct: 4167.30,
    cajas: 4739,
    monto: 59309,
    byCat: {
      aceite: { q: 1210.40, r: 215.30 },
      azucar: { q: 2680.50, r: 1120.00 },
      pollo: { q: 3120.60, r: 980.40 },
      estandarAsturias: { q: 97.50, r: 41.60 },
      mortadelaSalpicaoAsturias: { q: 957.60, r: 359.60 },
    },
  },
  'FOOD SERVICE SUR': {
    kgs: 771.20,
    realKgsOct: 1283.10,
    cajas: 303,
    monto: 2506,
    byCat: {
      aceite: { q: 65.20, r: 42.10 },
      azucar: { q: 145.10, r: 320.00 },
      pollo: { q: 165.40, r: 280.20 },
      estandarAsturias: { q: 5.30, r: 2.30 },
      mortadelaSalpicaoAsturias: { q: 51.70, r: 19.40 },
    },
  },
  'MARYERY GARCIA': {
    kgs: 198346.65,
    realKgsOct: 69388.00,
    cajas: 82063,
    monto: 516468,
    byCat: {
      aceite: { q: 21450.20, r: 3890.40 },
      azucar: { q: 48920.50, r: 22450.00 },
      pollo: { q: 41250.30, r: 16890.20 },
      estandarAsturias: { q: 1355.10, r: 577.80 },
      mortadelaSalpicaoAsturias: { q: 13302.90, r: 4995.70 },
    },
  },
  'PEDRO ABREU': {
    kgs: 57594.31,
    realKgsOct: 25954.30,
    cajas: 12339,
    monto: 104602,
    byCat: {
      aceite: { q: 5420.10, r: 1120.30 },
      azucar: { q: 12450.20, r: 7890.00 },
      pollo: { q: 12180.40, r: 5420.10 },
      estandarAsturias: { q: 393.50, r: 167.80 },
      mortadelaSalpicaoAsturias: { q: 3862.80, r: 1450.60 },
    },
  },
  'SARAH REYES': {
    kgs: 99731.60,
    realKgsOct: 43017.50,
    cajas: 21526,
    monto: 302845,
    byCat: {
      aceite: { q: 11850.40, r: 1890.50 },
      azucar: { q: 23410.20, r: 11850.00 },
      pollo: { q: 19850.60, r: 7420.30 },
      estandarAsturias: { q: 681.30, r: 290.50 },
      mortadelaSalpicaoAsturias: { q: 6688.90, r: 2511.90 },
    },
  },
  'YOLEIDA LUGO': {
    kgs: 125500.35,
    realKgsOct: 45829.20,
    cajas: 42432,
    monto: 303464,
    byCat: {
      aceite: { q: 12743.80, r: 1847.40 },
      azucar: { q: 28210.40, r: 11163.00 },
      pollo: { q: 22689.40, r: 7619.30 },
      estandarAsturias: { q: 857.40, r: 365.60 },
      mortadelaSalpicaoAsturias: { q: 8415.90, r: 3160.80 },
    },
  },

  // ==========================================
  // SUPERVISOR: JOHNATAN SOTO (8 Vendedores)
  // ==========================================
  'ADEL JARABA': {
    kgs: 116107.40,
    realKgsOct: 25187.60,
    cajas: 20968,
    monto: 204782,
    byCat: {
      aceite: { q: 4560.51, r: 437.00 },
      azucar: { q: 33162.40, r: 15200.00 },
      pollo: { q: 11476.52, r: 2960.00 },
      estandarAsturias: { q: 1195.70, r: 148.10 },
      mortadelaSalpicaoAsturias: { q: 7590.40, r: 677.70 },
    },
  },
  'ANGELICA MORENO': {
    kgs: 114477.20,
    realKgsOct: 33359.70,
    cajas: 46454,
    monto: 255853,
    byCat: {
      aceite: { q: 2332.10, r: 467.00 },
      azucar: { q: 25382.50, r: 3060.00 },
      pollo: { q: 37377.60, r: 11430.30 },
      estandarAsturias: { q: 786.60, r: 428.90 },
      mortadelaSalpicaoAsturias: { q: 4726.90, r: 1145.10 },
    },
  },
  'HERNAN PAZ': {
    kgs: 63343.48,
    realKgsOct: 18094.80,
    cajas: 16469,
    monto: 232008,
    byCat: {
      aceite: { q: 2954.79, r: 327.90 },
      azucar: { q: 5474.40, r: 2799.00 },
      pollo: { q: 12579.50, r: 953.40 },
      estandarAsturias: { q: 1860.40, r: 245.50 },
      mortadelaSalpicaoAsturias: { q: 11329.30, r: 5078.90 },
    },
  },
  'MIKELANGELO DIAZ': {
    kgs: 131202.70,
    realKgsOct: 30505.50,
    cajas: 62657,
    monto: 353312,
    byCat: {
      aceite: { q: 1672.50, r: 346.90 },
      azucar: { q: 43510.50, r: 1080.00 },
      pollo: { q: 29384.90, r: 13107.40 },
      estandarAsturias: { q: 1353.20, r: 1096.80 },
      mortadelaSalpicaoAsturias: { q: 6463.60, r: 4408.00 },
    },
  },
  'MIKELANGELO DIAZ - VILLA DEL ROS': {
    kgs: 151499.95,
    realKgsOct: 1892.50,
    cajas: 50500,
    monto: 378750,
    byCat: {
      aceite: { q: 1210.30, r: 238.50 },
      azucar: { q: 47343.30, r: 2980.00 },
      pollo: { q: 48886.55, r: 1366.40 },
      estandarAsturias: { q: 196.40, r: 126.00 },
      mortadelaSalpicaoAsturias: { q: 4661.90, r: 1359.60 },
    },
  },
  'JUAN HERNANDEZ': {
    kgs: 95328.85,
    realKgsOct: 34735.10,
    cajas: 19493,
    monto: 266033,
    byCat: {
      aceite: { q: 4719.10, r: 2970.90 },
      azucar: { q: 21739.50, r: 2339.00 },
      pollo: { q: 17438.73, r: 2876.70 },
      estandarAsturias: { q: 2053.50, r: 758.30 },
      mortadelaSalpicaoAsturias: { q: 6031.30, r: 2464.80 },
    },
  },
  'OSWALDO CHURION': {
    kgs: 103001.08,
    realKgsOct: 29022.50,
    cajas: 44900,
    monto: 386332,
    byCat: {
      aceite: { q: 3494.60, r: 318.00 },
      azucar: { q: 15872.90, r: 2440.00 },
      pollo: { q: 20863.70, r: 7345.80 },
      estandarAsturias: { q: 1072.30, r: 502.40 },
      mortadelaSalpicaoAsturias: { q: 6841.20, r: 2730.00 },
    },
  },
  'JAIDER MEDINA - FOOD SERVICE NORTE': {
    kgs: 3193.76,
    realKgsOct: 891.50,
    cajas: 1693,
    monto: 13991,
    byCat: {
      aceite: { q: 0, r: 19.90 },
      azucar: { q: 0, r: 20.00 },
      pollo: { q: 1170.80, r: 419.70 },
      estandarAsturias: { q: 0, r: 0 },
      mortadelaSalpicaoAsturias: { q: 1586.86, r: 16.20 },
    },
  },

  // ==========================================
  // SUPERVISOR: ALI PEREZ (6 Vendedores)
  // ==========================================
  'ALI PEREZ': {
    kgs: 177011.10,
    realKgsOct: 6098.40,
    cajas: 59000,
    monto: 442500,
    byCat: {
      aceite: { q: 31061.60, r: 168.90 },
      azucar: { q: 33437.10, r: 500.00 },
      pollo: { q: 62216.50, r: 2686.80 },
      estandarAsturias: { q: 720.00, r: 45.70 },
      mortadelaSalpicaoAsturias: { q: 7838.30, r: 813.60 },
    },
  },
  'ELISA SOLER': {
    kgs: 217504.70,
    realKgsOct: 118070.70,
    cajas: 70118,
    monto: 537101,
    byCat: {
      aceite: { q: 24880.50, r: 6647.20 },
      azucar: { q: 47203.60, r: 53416.00 },
      pollo: { q: 49822.90, r: 23875.60 },
      estandarAsturias: { q: 1117.50, r: 658.60 },
      mortadelaSalpicaoAsturias: { q: 9631.00, r: 5028.10 },
    },
  },
  'LEONARDO RIOS': {
    kgs: 116984.97,
    realKgsOct: 34204.00,
    cajas: 46854,
    monto: 326999,
    byCat: {
      aceite: { q: 30828.45, r: 1758.70 },
      azucar: { q: 13288.30, r: 6000.00 },
      pollo: { q: 20480.90, r: 10697.10 },
      estandarAsturias: { q: 427.20, r: 536.40 },
      mortadelaSalpicaoAsturias: { q: 5750.52, r: 2243.80 },
    },
  },
  'LUIS GUANIPA': {
    kgs: 33937.30,
    realKgsOct: 5724.50,
    cajas: 8704,
    monto: 101299,
    byCat: {
      aceite: { q: 860.10, r: 268.30 },
      azucar: { q: 16082.10, r: 1020.00 },
      pollo: { q: 6604.40, r: 708.00 },
      estandarAsturias: { q: 205.30, r: 51.40 },
      mortadelaSalpicaoAsturias: { q: 3230.10, r: 737.00 },
    },
  },
  'OSCAR ORTIZ- CORO': {
    kgs: 17644.00,
    realKgsOct: 5602.90,
    cajas: 5974,
    monto: 50774,
    byCat: {
      aceite: { q: 1013.40, r: 79.50 },
      azucar: { q: 2379.00, r: 960.00 },
      pollo: { q: 1202.90, r: 1335.90 },
      estandarAsturias: { q: 198.50, r: 62.70 },
      mortadelaSalpicaoAsturias: { q: 9233.80, r: 399.20 },
    },
  },
  'OSCAR ORTIZ- LA COSTA': {
    kgs: 6022.38,
    realKgsOct: 2752.30,
    cajas: 1503,
    monto: 19292,
    byCat: {
      aceite: { q: 534.90, r: 49.70 },
      azucar: { q: 214.90, r: 320.00 },
      pollo: { q: 130.20, r: 193.60 },
      estandarAsturias: { q: 108.00, r: 22.80 },
      mortadelaSalpicaoAsturias: { q: 1594.10, r: 378.80 },
    },
  },
};

// Días laborables y transcurridos de corte
export const DEFAULT_DIAS_LABORABLES = 26;
export const DEFAULT_DIAS_TRANSCURRIDOS = 13;
export const META_AL_DIA_PCT = Number(((DEFAULT_DIAS_TRANSCURRIDOS / DEFAULT_DIAS_LABORABLES) * 100).toFixed(1));

export const SKU_FILTER_OPTIONS = [
  { id: 'ALL', label: 'Todos los SKUs (Cuotas Volumen)' },
  { id: 'aceite', label: 'Aceite Comestible' },
  { id: 'azucar', label: 'Azúcar Refinada' },
  { id: 'pollo', label: 'Pollo Beneficiado' },
  { id: 'estandarAsturias', label: 'Estándar y Superior Asturias' },
  { id: 'mortadelaSalpicaoAsturias', label: 'Mortadela Salpicao y Asturias' },
];

export const hasVolumeQuota = (sellerName: string): boolean => {
  const norm = normalizeSellerName(sellerName);
  return Boolean(SELLER_VOLUME_QUOTAS[norm]);
};

export const getSellerVolumeQuota = (
  sellerName: string,
  metric: 'kgs' | 'cajas' | 'monto' = 'kgs',
  skuFilter: string = 'ALL'
): number => {
  const norm = normalizeSellerName(sellerName);
  const q = SELLER_VOLUME_QUOTAS[norm];
  if (!q) return 0;

  if (skuFilter && skuFilter !== 'ALL' && q.byCat) {
    const cat = q.byCat[skuFilter as keyof typeof q.byCat];
    if (cat) {
      if (metric === 'kgs') return cat.q;
      const ratio = q.kgs > 0 ? cat.q / q.kgs : 0;
      return Math.round(q[metric] * ratio);
    }
  }

  return q[metric];
};

export const getSellerOctoberRealFromSheet = (
  sellerName: string,
  skuFilter: string = 'ALL'
): number | null => {
  const norm = normalizeSellerName(sellerName);
  const q = SELLER_VOLUME_QUOTAS[norm];
  if (!q) return null;

  if (skuFilter && skuFilter !== 'ALL' && q.byCat) {
    const cat = q.byCat[skuFilter as keyof typeof q.byCat];
    if (cat) return cat.r;
  }

  return q.realKgsOct;
};
