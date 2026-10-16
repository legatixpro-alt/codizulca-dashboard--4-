export interface ProductMonthData {
  monto: number;
  cajas: number;
  kgs: number;
}

export interface InventoryProduct {
  id_articulo: number;
  codigo: string;
  articulo: string;
  category: string;
  isPesable: boolean;
  modalidad: 'PESABLE' | 'EMPACADO';
  unit: 'kg' | 'cj';
  unitLabel: string;
  unitName: string;
  cajasDisplay: string;
  totalFA: number;
  totalDV: number;
  totalMonto: number;
  totalCajas: number;
  totalKgs: number;
  primaryVolume: number;
  avgPricePerUnit: number;
  avgPricePerBox: number;
  returnRate: number;
  peakMonth: string;
  rotation: 'ALTA' | 'MEDIA' | 'BAJA';
  months: Record<string, ProductMonthData>;
}

export interface MonthlyEvolutionItem {
  mes: string;
  montoFA: number;
  montoDV: number;
  monto: number;
  cajas: number;
  kgs: number;
  primaryVolume: number;
  share: number;
  momGrowth: number;
  avgPriceUnit: number;
  avgPriceBox: number;
  avgPriceKg: number;
}

export interface ProductClientBuyer {
  cliente: string;
  canal?: string;
  zona?: string;
  totalFA: number;
  totalDV: number;
  netMonto: number;
  boxes: number;
  kgs: number;
  avgPrice: number;
}

export interface ChannelDistributionItem {
  channel: string;
  monto: number;
  pct: number;
  clientsCount: number;
  volume: number;
}

export interface ProductSellerSeller {
  vendedor: string;
  zona?: string;
  totalFA: number;
  totalDV: number;
  netMonto: number;
  boxes: number;
  kgs: number;
  avgPrice: number;
}

export interface StoreInventoryAudit {
  id: string;
  date: string;
  store: string;
  product: string;
  initialQuantity: number;
  finalQuantity: number;
  degustations: number | null;
  comments: string;
  creatorId: string;
  promoter: string;
  created_at: string;
}

export interface Product360Dossier {
  product: InventoryProduct;
  monthlyEvolution: MonthlyEvolutionItem[];
  liveStats: {
    totalFA: number;
    totalDV: number;
    netTotal: number;
    totalBoxesFA: number;
    totalBoxesDV: number;
    netBoxes: number;
    totalKgsFA: number;
    totalKgsDV: number;
    netKgs: number;
    returnRate: number;
    activeClientsCount: number;
    totalTransactions: number;
  };
  topClients: ProductClientBuyer[];
  topSellers: ProductSellerSeller[];
  channelDistribution?: ChannelDistributionItem[];
  storeAudits: StoreInventoryAudit[];
}

