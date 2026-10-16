export interface SalesItem {
  articulo: string;
  cajas: number;
  monto: number;
  kgs_lts: number;
}

export interface SalesTransaction {
  invoice: string;
  numero: number;
  tipo_doc: 'FA' | 'DV';
  mes: string;
  ano: number;
  date: string;
  seller: string;
  client: string;
  boxes: number;
  total: number;
  kgs_lts: number;
  itemsCount: number;
  topProduct: string;
  topProductMonto?: number;
  items: SalesItem[];
}

export interface SalesSummaryKPIs {
  totalFA: number;
  totalDV: number;
  netTotal: number;
  totalBoxes: number;
  returnRate: number;
  faCount: number;
  dvCount: number;
}

export interface ClientMonthlyStats {
  mes: string;
  faMonto: number;
  dvMonto: number;
  netMonto: number;
  faCajas: number;
  dvCajas: number;
}

export interface ClientTopProduct {
  articulo: string;
  totalComprado: number;
  totalDevuelto: number;
  cajasCompradas: number;
  cajasDevueltas: number;
}

export interface ClientPurchaseHistoryResponse {
  clientName: string;
  sellerName: string;
  summary: {
    totalFA: number;
    totalDV: number;
    netSpent: number;
    totalBoxesFA: number;
    totalBoxesDV: number;
    netBoxes: number;
    returnRate: number;
    faCount: number;
    dvCount: number;
    totalDocs: number;
  };
  monthlyEvolution: ClientMonthlyStats[];
  topProducts: ClientTopProduct[];
  documents: SalesTransaction[];
}
