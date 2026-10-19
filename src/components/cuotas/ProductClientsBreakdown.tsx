import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Users,
  Search,
  Download,
  X,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Target,
  Sparkles,
  PieChart as PieChartIcon,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  Truck,
  FileDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ParetoRowItem,
  ParetoMetric,
  ABCClass,
  MONTH_LABELS,
  CHRONOLOGICAL_MONTHS,
} from './paretoTypes';
import { formatParetoValue, getParetoMetricLabel } from './paretoExportUtils';
import { ClientLimitFilter, ClientLimit } from './ClientLimitFilter';
import { MultiMonthSelect } from './MultiMonthSelect';
import { AIDistributionModal } from './AIDistributionModal';

interface ProductClientItem {
  id_cliente: string;
  cliente: string;
  vendedor: string;
  monto: number;
  cajas: number;
  kgs: number;
  months?: Record<string, { monto: number; cajas: number; kgs: number }>;
}

interface ProductClientsApiResponse {
  id_articulo: number;
  articulo: string;
  totalMonto: number;
  totalCajas: number;
  totalKgs: number;
  clientsCount: number;
  clients: ProductClientItem[];
}

interface ProductClientsBreakdownProps {
  product: ParetoRowItem;
  selectedMonth?: string;
  selectedMonths?: string[];
  onMonthChange?: (months: string[]) => void;
  metric: ParetoMetric;
  portfolioTotalSum: number;
  onClose: () => void;
}

export const ProductClientsBreakdown: React.FC<ProductClientsBreakdownProps> = ({
  product,
  selectedMonth = 'ALL',
  selectedMonths = [],
  onMonthChange,
  metric,
  portfolioTotalSum,
  onClose,
}) => {
  const [data, setData] = useState<ProductClientsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientLimit, setClientLimit] = useState<ClientLimit>(50);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'consolidated' | 'comparative'>('consolidated');

  // Unified active months list
  const activeMonths = useMemo(() => {
    if (selectedMonths && selectedMonths.length > 0) {
      if (selectedMonths.includes('ALL')) return [];
      return selectedMonths;
    }
    if (selectedMonth && selectedMonth !== 'ALL') {
      return [selectedMonth];
    }
    return [];
  }, [selectedMonths, selectedMonth]);

  // Chronologically sorted active months
  const sortedActiveMonths = useMemo(() => {
    return [...activeMonths].sort(
      (a, b) => CHRONOLOGICAL_MONTHS.indexOf(a) - CHRONOLOGICAL_MONTHS.indexOf(b)
    );
  }, [activeMonths]);

  // Fetch product client data from backend
  useEffect(() => {
    let isMounted = true;
    const fetchProductClients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let res: Response;
        try {
          res = await fetch(`/api/pareto/product-clients?id_articulo=${product.id}`);
          if (!res.ok) {
            res = await fetch(`/data/product_clients/${product.id}.json`);
          }
        } catch {
          res = await fetch(`/data/product_clients/${product.id}.json`);
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}: Error al obtener clientes del producto`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        try {
          const fb = await fetch(`/data/product_clients/${product.id}.json`);
          if (fb.ok) {
            const fbJson = await fb.json();
            if (isMounted) {
              setData(fbJson);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {}
        console.error('Error fetching product clients:', err);
        if (isMounted) {
          setError(err?.message || 'Error al conectar con la base de datos de ventas.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProductClients();
    return () => {
      isMounted = false;
    };
  }, [product.id]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [clientLimit, searchTerm, activeMonths, metric]);

  // Extract metric value for a specific client according to activeMonths
  const getClientValue = (client: ProductClientItem): number => {
    if (activeMonths.length === 0) {
      if (metric === 'cajas') return client.cajas || 0;
      if (metric === 'kgs') return client.kgs || 0;
      return client.monto || 0;
    }
    let sum = 0;
    for (const m of activeMonths) {
      const monthData = client.months?.[m];
      if (monthData) {
        if (metric === 'cajas') sum += monthData.cajas || 0;
        else if (metric === 'kgs') sum += monthData.kgs || 0;
        else sum += monthData.monto || 0;
      }
    }
    return sum;
  };

  // Helper to extract value of a specific single month
  const getClientSingleMonthVal = (client: ProductClientItem, monthKey: string): number => {
    const monthData = client.months?.[monthKey];
    if (!monthData) return 0;
    if (metric === 'cajas') return monthData.cajas || 0;
    if (metric === 'kgs') return monthData.kgs || 0;
    return monthData.monto || 0;
  };

  // Process and rank buying clients for this product
  const { clientsRanked, totalProductValue, countBuyers } = useMemo(() => {
    if (!data?.clients) {
      return { clientsRanked: [], totalProductValue: 0, countBuyers: 0 };
    }

    // 1. Calculate values for active months and metric
    const list = data.clients
      .map((c) => {
        const val = getClientValue(c);

        // Calculate month breakdown for active months
        const monthlyBreakdown: Record<string, number> = {};
        for (const m of sortedActiveMonths) {
          monthlyBreakdown[m] = getClientSingleMonthVal(c, m);
        }

        return {
          ...c,
          val,
          monthlyBreakdown,
        };
      })
      .filter((c) => c.val > 0)
      .sort((a, b) => b.val - a.val);

    const sumVal = list.reduce((acc, c) => acc + c.val, 0);

    // 2. Compute Pareto % and cumulative %
    let cumulative = 0;
    const ranked = list.map((c, index) => {
      cumulative += c.val;
      const pctIndividual = sumVal > 0 ? parseFloat(((c.val / sumVal) * 100).toFixed(2)) : 0;
      const pctCumulative = sumVal > 0 ? parseFloat(((cumulative / sumVal) * 100).toFixed(2)) : 0;

      let clasificacion: ABCClass = 'C';
      if (pctCumulative <= 80 || (pctCumulative > 80 && index === 0)) {
        clasificacion = 'A';
      } else if (pctCumulative <= 95) {
        clasificacion = 'B';
      } else {
        clasificacion = 'C';
      }

      return {
        ...c,
        ranking: index + 1,
        pctIndividual,
        pctCumulative,
        clasificacion,
      };
    });

    return {
      clientsRanked: ranked,
      totalProductValue: sumVal,
      countBuyers: ranked.length,
    };
  }, [data, activeMonths, sortedActiveMonths, metric]);

  // Apply search and client limit (Top 20, 50, 100, or ALL)
  const filteredClients = useMemo(() => {
    let list = clientsRanked;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.cliente.toLowerCase().includes(term) ||
          c.id_cliente.toLowerCase().includes(term) ||
          c.vendedor.toLowerCase().includes(term)
      );
    }

    // Client Limit filter (Top 20, Top 50, Top 100, or Todos)
    if (clientLimit !== 'ALL') {
      list = list.slice(0, clientLimit);
    }

    return list;
  }, [clientsRanked, searchTerm, clientLimit]);

  // Dynamic Pagination: when a Top limit is chosen (Top 20, Top 50, Top 100), show ALL of them directly in the table!
  const effectiveItemsPerPage = clientLimit !== 'ALL' ? clientLimit : 50;
  const totalPages = Math.ceil(filteredClients.length / effectiveItemsPerPage) || 1;
  const paginatedClients = useMemo(() => {
    if (clientLimit !== 'ALL') {
      return filteredClients; // Muestra exactamente los 20, 50 o 100 clientes compradores solicitados
    }
    const start = (currentPage - 1) * effectiveItemsPerPage;
    return filteredClients.slice(start, start + effectiveItemsPerPage);
  }, [filteredClients, currentPage, effectiveItemsPerPage, clientLimit]);

  // Top buyer statistics
  const top1Buyer = clientsRanked[0];
  const top5Share = useMemo(() => {
    const top5Sum = clientsRanked.slice(0, 5).reduce((acc, c) => acc + c.val, 0);
    return totalProductValue > 0 ? parseFloat(((top5Sum / totalProductValue) * 100).toFixed(1)) : 0;
  }, [clientsRanked, totalProductValue]);

  // Portfolio share
  const portfolioSharePct = useMemo(() => {
    return portfolioTotalSum > 0 ? parseFloat(((totalProductValue / portfolioTotalSum) * 100).toFixed(2)) : 0;
  }, [totalProductValue, portfolioTotalSum]);

  // Text label for active period
  const periodLabelText = useMemo(() => {
    if (activeMonths.length === 0) return 'Todo el Año (Acumulado 2026)';
    if (activeMonths.length === 1) return `Mes: ${MONTH_LABELS[activeMonths[0]] || activeMonths[0]}`;
    return `Meses: ${activeMonths.map((m) => MONTH_LABELS[m] || m).join(', ')}`;
  }, [activeMonths]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredClients.length === 0) return;

    const rows = filteredClients.map((c) => {
      const baseObj: any = {
        Ranking: c.ranking,
        'Código Cliente': c.id_cliente,
        'Nombre Cliente': c.cliente,
        Vendedor: c.vendedor,
        [`Total Comprado (${getParetoMetricLabel(metric)})`]: c.val,
        '% Compras del Producto': `${c.pctIndividual}%`,
        '% Acumulado': `${c.pctCumulative}%`,
        'Clasificación ABC': `Clase ${c.clasificacion}`,
        Período: periodLabelText,
      };

      // Add individual month columns if multiple months selected
      if (sortedActiveMonths.length >= 2) {
        sortedActiveMonths.forEach((m) => {
          baseObj[MONTH_LABELS[m] || m] = c.monthlyBreakdown[m] || 0;
        });
      }

      return baseObj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes Compradores');
    const safeName = product.nombre.replace(/[/\\?%*:|"<>]/g, '').slice(0, 25);
    XLSX.writeFile(wb, `Clientes_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredClients.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const metricLabel = getParetoMetricLabel(metric);

    doc.setFillColor(220, 38, 38);
    doc.rect(14, 10, 3.5, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `CODIZULCA - CLIENTES COMPRADORES DE PRODUCTO (SKU #${product.id})`,
      21,
      14.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Producto: ${product.nombre}  |  Periodo: ${periodLabelText}  |  Metrica: ${metricLabel}`,
      21,
      19.5
    );

    const filterParts: string[] = [
      `Limite: ${clientLimit === 'ALL' ? 'Todos' : `Top ${clientLimit}`}`,
    ];
    if (searchTerm.trim()) filterParts.push(`Busqueda: "${searchTerm.trim()}"`);
    doc.setFontSize(7.5);
    doc.text(
      `Mostrando ${filteredClients.length} de ${countBuyers} compradores  |  Filtros: ${filterParts.join(' | ')}  |  Exportado: ${new Date().toLocaleString('es-VE')}`,
      21,
      24
    );

    const isComparative = sortedActiveMonths.length >= 2 && viewMode === 'comparative';

    const headRow: string[] = ['#', 'CODIGO', 'CLIENTE / RAZON SOCIAL', 'VENDEDOR'];
    if (isComparative) {
      sortedActiveMonths.forEach((m) => {
        headRow.push((MONTH_LABELS[m] || m).slice(0, 3).toUpperCase());
      });
    }
    headRow.push(`TOTAL (${metricLabel})`, '% PROD.', '% ACUM.', 'CLASE ABC');

    const bodyRows = filteredClients.map((c) => {
      const row: any[] = [c.ranking, c.id_cliente, c.cliente, c.vendedor];
      if (isComparative) {
        sortedActiveMonths.forEach((m) => {
          row.push(formatParetoValue(c.monthlyBreakdown[m] || 0, metric));
        });
      }
      row.push(
        formatParetoValue(c.val, metric),
        `${c.pctIndividual.toFixed(2)}%`,
        `${c.pctCumulative.toFixed(2)}%`,
        `CLASE ${c.clasificacion}`
      );
      return row;
    });

    const filteredSum = filteredClients.reduce((acc, c) => acc + c.val, 0);
    const filteredPct = filteredClients.reduce((acc, c) => acc + c.pctIndividual, 0);
    const footRow: any[] = ['TOTAL', '', `${filteredClients.length} Clientes Exportados`, ''];
    if (isComparative) {
      sortedActiveMonths.forEach((m) => {
        const mSum = filteredClients.reduce((acc, c) => acc + (c.monthlyBreakdown[m] || 0), 0);
        footRow.push(formatParetoValue(mSum, metric));
      });
    }
    footRow.push(
      formatParetoValue(filteredSum, metric),
      `${Math.min(100, filteredPct).toFixed(1)}%`,
      '',
      ''
    );

    autoTable(doc, {
      startY: 27,
      head: [headRow],
      body: bodyRows,
      foot: [footRow],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'left', cellWidth: 70 },
        3: { halign: 'left', cellWidth: 45 },
      },
    });

    const safeName = product.nombre.replace(/[/\\?%*:|"<>]/g, '').slice(0, 25);
    doc.save(`Clientes_Producto_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="bg-[#0c0c0e] border-2 border-red-500/50 rounded-2xl p-4 sm:p-5 shadow-[0_8px_40px_rgba(220,38,38,0.2)] space-y-5 animate-in fade-in-50 duration-300 relative overflow-hidden">
      {/* Top accent light */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />

      {/* Header with Title, AI Button and Close Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-red-400 bg-red-950/80 border border-red-700/60 px-2 py-0.5 rounded">
                SKU #{product.id}
              </span>
              <span className="text-xs font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-white/10">
                Ranking General: #{product.ranking}
              </span>
              <span className="text-xs font-black text-white bg-red-900/60 border border-red-500 px-2 py-0.5 rounded">
                CLASE {product.clasificacion}
              </span>
              {sortedActiveMonths.length >= 2 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  Comparativa de {sortedActiveMonths.length} Meses Activa
                </span>
              )}
            </div>

            <h3 className="text-lg md:text-xl font-black text-white mt-1 uppercase tracking-wide">
              {product.nombre}
            </h3>

            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Análisis de clientes compradores • Período:</span>
              <strong className="text-white">{periodLabelText}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons: AI Distribution, Export, and Close */}
        <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
          {/* AI MERCHANDISE DISTRIBUTION BUTTON */}
          <button
            type="button"
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-red-600/30 cursor-pointer transform hover:-translate-y-0.5"
            title="Analizar con IA la variación del Top y generar plan de distribución de mercancía"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Plan Distribución IA</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Exportar clientes compradores filtrados a PDF"
          >
            <FileDown className="w-4 h-4" />
            <span>Exportar PDF ({filteredClients.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 hover:border-red-500/50 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span>({filteredClients.length})</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Cerrar detalle del producto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards of the Selected Product */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Venta del Producto
          </span>
          <p className="text-xl font-black text-white">
            {formatParetoValue(totalProductValue, metric)}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">
            {metric === 'monto'
              ? 'Total facturado neto'
              : metric === 'cajas'
              ? 'Total cajas vendidas'
              : 'Total kilos despachados'}
          </span>
        </div>

        <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Clientes Compradores
          </span>
          <p className="text-xl font-black text-white">{countBuyers}</p>
          <span className="text-[10px] text-zinc-400">
            {countBuyers === 1 ? '1 cliente único' : 'Clientes activos en período'}
          </span>
        </div>

        <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Participación Cartera
          </span>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-black text-white">{portfolioSharePct}%</p>
            <span className="text-[10px] text-amber-400 font-bold">del total</span>
          </div>
          <span className="text-[10px] text-zinc-400">Peso sobre la venta global</span>
        </div>

        <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Concentración Top 5
          </span>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-black text-white">{top5Share}%</p>
            <span className="text-[10px] text-red-400 font-bold">Top 5</span>
          </div>
          <span className="text-[10px] text-zinc-400 truncate block">
            {top1Buyer ? `Líder: ${top1Buyer.cliente}` : 'Sin compras'}
          </span>
        </div>
      </div>

      {/* Control Bar: Multi-Month Select Desplegable, Client Limit Filter (Top 20, 50, 100, Todos) and Search */}
      <div className="flex flex-col gap-3.5 bg-zinc-950/90 border border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Direct Multi-Month Filter Desplegable right in Product View */}
            {onMonthChange && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider select-none">
                  MESES A COMPARAR
                </span>
                <MultiMonthSelect
                  selectedMonths={activeMonths}
                  onChange={(m) => onMonthChange(m)}
                />
              </div>
            )}

            {/* Exact Client Limit control requested by the user */}
            <ClientLimitFilter
              value={clientLimit}
              onChange={setClientLimit}
              label="LÍMITE DE CLIENTES"
              totalAvailable={countBuyers}
            />

            {/* Toggle view mode when multiple months selected */}
            {sortedActiveMonths.length >= 2 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider select-none">
                  VISTA COMPARATIVA
                </span>
                <div className="inline-flex items-center gap-1 bg-black/80 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setViewMode('consolidated')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'consolidated'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Consolidado
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('comparative')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'comparative'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Mes a Mes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Input for buying clients */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              BUSCAR CLIENTE O VENDEDOR
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, ID o vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 w-full transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI DISTRIBUTION CALLOUT BANNER */}
        <div className="bg-gradient-to-r from-red-950/40 via-zinc-900 to-amber-950/30 border border-red-500/30 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 text-white shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>Asistente IA de Distribución & Cuotas</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-red-600/30 text-red-300 border border-red-500/40 font-mono">
                  Gemini 3.8 Flash
                </span>
              </h4>
              <p className="text-xs text-zinc-300 mt-0.5">
                SKU #{product.id} seleccionado con período <strong>{periodLabelText}</strong> y{' '}
                <strong>Top {clientLimit === 'ALL' ? countBuyers : clientLimit}</strong> clientes. La IA evalúa la variación de compra y calcula la distribución óptima de mercancía.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Generar Plan de Distribución IA</span>
          </button>
        </div>

        {/* Informative indicator of displayed vs buyers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-zinc-400">
          <div>
            Mostrando <strong className="text-white">{filteredClients.length}</strong> de{' '}
            <strong className="text-white">{countBuyers}</strong> clientes compradores de este producto
            {clientLimit !== 'ALL' ? ` (Filtro Top ${clientLimit} activo)` : ''}
          </div>

          {sortedActiveMonths.length >= 2 && (
            <div className="text-[11px] text-blue-300 flex items-center gap-1 font-mono">
              <span>Períodos evaluados:</span>
              <strong className="text-white">
                {sortedActiveMonths.map((m) => (MONTH_LABELS[m] || m).slice(0, 3)).join(' ➔ ')}
              </strong>
            </div>
          )}
        </div>

        {/* Banner explicativo si el producto tiene menos compradores en su historial que el Top solicitado */}
        {clientLimit !== 'ALL' && countBuyers < clientLimit && !isLoading && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">ℹ️</span>
              <span>
                Este artículo registra un total de <strong>{countBuyers} clientes compradores</strong> en su historial (cubren el <strong>100%</strong> de las ventas de este producto). Por ello se muestran los {countBuyers} clientes disponibles.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-200 transition-colors whitespace-nowrap cursor-pointer self-start sm:self-auto"
            >
              Ver Top {clientLimit} en Cartera General
            </button>
          </div>
        )}
      </div>

      {/* Table of Buying Clients */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-300 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Cliente / Razón Social</th>
                <th className="py-3 px-3">Vendedor Asignado</th>
                <th className="py-3 px-3 text-right">
                  {metric === 'monto'
                    ? 'Total Compra ($)'
                    : metric === 'cajas'
                    ? 'Total Cajas'
                    : 'Total Kilos'}
                </th>

                {/* Optional month columns if comparative mode is on */}
                {viewMode === 'comparative' &&
                  sortedActiveMonths.map((m) => (
                    <th key={m} className="py-3 px-2 text-right font-mono text-zinc-400">
                      {MONTH_LABELS[m] || m}
                    </th>
                  ))}

                <th className="py-3 px-4 text-left w-44">% de Compras</th>
                <th className="py-3 px-3 text-right">% Acum.</th>
                <th className="py-3 px-3 text-center">Clase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500 mb-2" />
                    Cargando historial de clientes compradores de {product.nombre}...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-red-400">
                    {error}
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-zinc-400">
                    <p className="font-semibold text-zinc-300">
                      {countBuyers === 0
                        ? `No se registraron compras de este producto en ${periodLabelText}.`
                        : 'No se encontraron clientes para los filtros aplicados.'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {countBuyers === 0
                        ? 'Prueba seleccionando "Todo el Año" u otros meses en el selector.'
                        : 'Prueba cambiando el límite a "Todos" o limpiando el término de búsqueda.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  const maxIndividualPct = clientsRanked[0]?.pctIndividual || 1;
                  const barWidth = Math.max(
                    Math.min((client.pctIndividual / maxIndividualPct) * 100, 100),
                    4
                  );

                  return (
                    <tr key={client.id_cliente} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-400">
                        #{client.ranking}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/50">
                            #{client.id_cliente}
                          </span>
                          <span
                            className="font-bold text-white max-w-sm truncate"
                            title={client.cliente}
                          >
                            {client.cliente}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-zinc-300 font-medium">
                        {client.vendedor || 'SIN ASIGNAR'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {formatParetoValue(client.val, metric)}
                      </td>

                      {/* Month breakdown columns when in comparative mode */}
                      {viewMode === 'comparative' &&
                        sortedActiveMonths.map((m) => (
                          <td
                            key={m}
                            className="py-2.5 px-2 text-right font-mono text-zinc-300 text-[11px]"
                          >
                            {formatParetoValue(client.monthlyBreakdown[m] || 0, metric)}
                          </td>
                        ))}

                      {/* % de Compras con barra de progreso visual proporcional al líder */}
                      <td className="py-2.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-black text-red-400">
                              {client.pctIndividual}%
                            </span>
                            <span className="text-[10px] text-zinc-500 font-sans">
                              del producto
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-red-600 via-red-500 to-amber-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-300">
                        {client.pctCumulative}%
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            client.clasificacion === 'A'
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : client.clasificacion === 'B'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          CLASE {client.clasificacion}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {paginatedClients.length > 0 && (() => {
              const pageVal = paginatedClients.reduce((acc, c) => acc + (c.val || 0), 0);
              const pagePct = paginatedClients.reduce((acc, c) => acc + Number(c.pctIndividual || 0), 0);
              const pageEndAcum = paginatedClients[paginatedClients.length - 1]?.pctCumulative || '0.0';
              const filteredVal = filteredClients.reduce((acc, c) => acc + (c.val || 0), 0);
              const filteredPct = filteredClients.reduce((acc, c) => acc + Number(c.pctIndividual || 0), 0);

              return (
                <tfoot className="bg-zinc-900/95 border-t-2 border-red-500/40 text-xs">
                  {/* Subtotal Página Actual */}
                  <tr className="border-b border-white/10 bg-zinc-900/70">
                    <td colSpan={3} className="py-2.5 px-4 font-bold text-zinc-300 uppercase tracking-wider">
                      Subtotal Página {currentPage} / {totalPages} ({paginatedClients.length} clientes)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-200">
                      {formatParetoValue(pageVal, metric)}
                    </td>
                    {viewMode === 'comparative' &&
                      sortedActiveMonths.map((m) => {
                        const mPageSum = paginatedClients.reduce(
                          (acc, c) => acc + (c.monthlyBreakdown[m] || 0),
                          0
                        );
                        return (
                          <td key={m} className="py-2.5 px-2 text-right font-mono font-semibold text-zinc-300 text-[11px]">
                            {formatParetoValue(mPageSum, metric)}
                          </td>
                        );
                      })}
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-300">
                      {pagePct.toFixed(1)}% del producto
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">
                      {pageEndAcum}%
                    </td>
                    <td className="py-2.5 px-3 text-center text-[10px] text-zinc-400">
                      Subtotal Pág
                    </td>
                  </tr>

                  {/* Total Global del Producto */}
                  <tr className="bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900">
                    <td colSpan={3} className="py-3 px-4 font-black text-white uppercase tracking-wider">
                      TOTAL GLOBAL DEL PRODUCTO ({filteredClients.length} clientes compradores)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white text-sm">
                      {formatParetoValue(filteredVal, metric)}
                    </td>
                    {viewMode === 'comparative' &&
                      sortedActiveMonths.map((m) => {
                        const mTotalSum = filteredClients.reduce(
                          (acc, c) => acc + (c.monthlyBreakdown[m] || 0),
                          0
                        );
                        return (
                          <td key={m} className="py-3 px-2 text-right font-mono font-black text-white text-[11px]">
                            {formatParetoValue(mTotalSum, metric)}
                          </td>
                        );
                      })}
                    <td className="py-3 px-4 font-mono font-black text-emerald-400">
                      {Math.min(100, filteredPct).toFixed(1)}% total
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-red-400">
                      100.0%
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[10px] font-bold text-white">
                      100% Global
                    </td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>

        {/* Pagination controls for buying clients */}
        {filteredClients.length > 0 && (() => {
          const pageVal = paginatedClients.reduce((acc, c) => acc + (c.val || 0), 0);
          const filteredVal = filteredClients.reduce((acc, c) => acc + (c.val || 0), 0);
          return (
            <div className="p-3 border-t border-white/10 bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Mostrando{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * effectiveItemsPerPage + 1}
                  </strong>{' '}
                  a{' '}
                  <strong className="text-white">
                    {Math.min(currentPage * effectiveItemsPerPage, filteredClients.length)}
                  </strong>{' '}
                  de <strong className="text-white">{filteredClients.length}</strong> clientes
                </span>
                <span className="hidden sm:inline text-zinc-600">|</span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-white/10 text-zinc-300 font-mono text-[11px]">
                  Subtotal Pág {currentPage}: <strong className="text-white">{formatParetoValue(pageVal, metric)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-red-950/30 border border-red-500/30 text-zinc-200 font-mono text-[11px]">
                  Total Global Producto: <strong className="text-white font-black">{formatParetoValue(filteredVal, metric)}</strong>
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/40 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="font-bold text-white px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/40 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* AI DISTRIBUTION MODAL */}
      {isAIModalOpen && (
        <AIDistributionModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          product={product}
          selectedMonths={activeMonths}
          metric={metric}
          clientLimit={clientLimit}
          clients={filteredClients}
          totalProductValue={totalProductValue}
        />
      )}
    </div>
  );
};
