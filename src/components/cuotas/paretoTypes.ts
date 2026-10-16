export type ParetoDimension = 'clientes' | 'productos' | 'vendedores' | 'zonas' | 'canales';
export type ParetoMetric = 'cajas' | 'monto' | 'kgs';
export type ABCClass = 'A' | 'B' | 'C';
export type InsightStatus = 'AT_RISK' | 'GROWTH_OPPORTUNITY' | 'TOP_ANCHOR' | 'NORMAL';
export type Pareto360Mode = 'AT_RISK' | 'CONCENTRATION' | 'GROWTH';

export interface ClientSalesItem {
  id_cliente: string;
  idsList?: string[];
  cliente: string;
  vendedor: string;
  vendedoresList?: string[];
  canal?: string;
  region?: string;
  monto: number;
  cajas: number;
  kgs: number;
  facturasCount: number;
  months: Record<string, { monto: number; cajas: number; kgs: number }>;
}

export interface ProductSalesItem {
  id_articulo: number;
  articulo: string;
  monto: number;
  cajas: number;
  kgs: number;
  months: Record<string, { monto: number; cajas: number; kgs: number }>;
}

export interface SellerMonthlyItem {
  vendedor: string;
  mes: string;
  ano: number;
  cajas: number;
  kgs: number;
  montoNeto: number;
  montoFA: number;
  montoDV: number;
  cajasFA: number;
  cajasDV: number;
  facturasCount: number;
}

export interface ParetoRowItem {
  id: string;
  idsList?: string[];
  nombre: string;
  secundario?: string;
  terciario?: string;
  vendedoresList?: string[];
  supervisor?: string;
  zona?: string;
  canal?: string;
  region?: string;
  valor: number;
  pctIndividual: number;
  valorAcumulado: number;
  pctAcumulado: number;
  pctCumulative: number;
  clasificacion: ABCClass;
  ranking: number;
  facturasCount?: number;
  insightStatus: InsightStatus;
  dropPct?: number;
  growthPct?: number;
  months?: Record<string, { monto: number; cajas: number; kgs: number }>;
  avgMonthly?: number;
  lastMonthVal?: number;
}

export interface ParetoSummaryStats {
  totalEntities: number;
  totalSum: number;
  countA: number;
  countB: number;
  countC: number;
  valueA: number;
  valueB: number;
  valueC: number;
  valuePctA: string;
  valuePctB: string;
  valuePctC: string;
  paretoRatio: string;
}

export interface ParetoInsightsData {
  vipAtRiskCount: number;
  vipAtRiskList: ParetoRowItem[];
  growthOpportunityCount: number;
  growthOpportunityList: ParetoRowItem[];
  topAnchorCount: number;
  topAnchorList: ParetoRowItem[];
  top1Pct: number;
  top3Pct: number;
  top5Pct: number;
  top10Pct: number;
  concentrationLevel: 'ALTA' | 'MEDIA' | 'SALUDABLE';
  concentrationDescription: string;
}

export const CHRONOLOGICAL_MONTHS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export const MONTH_LABELS: Record<string, string> = {
  ALL: 'Todo el Año (2026)',
  ENERO: 'Enero',
  FEBRERO: 'Febrero',
  MARZO: 'Marzo',
  ABRIL: 'Abril',
  MAYO: 'Mayo',
  JUNIO: 'Junio',
  JULIO: 'Julio',
  AGOSTO: 'Agosto',
  SEPTIEMBRE: 'Septiembre',
  OCTUBRE: 'Octubre',
  NOVIEMBRE: 'Noviembre',
  DICIEMBRE: 'Diciembre',
};
