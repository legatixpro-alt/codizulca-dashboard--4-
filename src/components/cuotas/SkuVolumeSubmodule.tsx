import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Eye,
  X,
  RefreshCw,
  Layers,
  Award,
  AlertOctagon,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CUOTAS_VOLUMEN_CSV_SEED,
  OFFICIAL_SKU_SELLERS,
  SkuVolumeItem,
  classifySkuCategory,
  parseCuotasVolumenCsv,
} from './skuVolumeSeedData';

export type SkuDiagnosticStatus =
  | 'VA_BIEN'
  | 'REGULAR'
  | 'VA_MAL'
  | 'SIN_VENTA'
  | 'ACTIVO_SIN_META'
  | 'SIN_MOVIMIENTO';

export interface EvaluatedSkuRow {
  item: SkuVolumeItem;
  cuotaKg: number;
  ventaKg: number;
  pct: number;
  brechaKg: number;
  cajas: number;
  monto: number;
  clientesCount: number;
  histKg: number;
  histMonto: number;
  status: SkuDiagnosticStatus;
  statusLabel: string;
  statusDetail: string;
}

export function evaluateSkuPerformance(
  cuotaKg: number,
  ventaKg: number,
  histKg: number = 0
): {
  pct: number;
  brechaKg: number;
  status: SkuDiagnosticStatus;
  statusLabel: string;
  statusDetail: string;
} {
  const pct = cuotaKg > 0 ? (ventaKg / cuotaKg) * 100 : ventaKg > 0 ? 100 : 0;
  const brechaKg = ventaKg - cuotaKg;

  if (cuotaKg > 0) {
    if (ventaKg <= 0) {
      return {
        pct: ventaKg < 0 ? pct : 0,
        brechaKg,
        status: 'SIN_VENTA',
        statusLabel: ventaKg < 0 ? 'VA MAL • DEVOLUCIÓN' : 'VA MAL • 0 KG',
        statusDetail:
          ventaKg < 0
            ? `Devolución neta (${ventaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg)`
            : `Faltan ${cuotaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg (Sin facturar)`,
      };
    }
    if (pct >= 80) {
      return {
        pct,
        brechaKg,
        status: 'VA_BIEN',
        statusLabel: pct >= 100 ? 'VA MUY BIEN • META SUPERADA' : 'VA BIEN • EN RANGO',
        statusDetail:
          brechaKg >= 0
            ? `+${brechaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg sobre la cuota`
            : `A solo ${Math.abs(brechaKg).toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg del 100%`,
      };
    }
    if (pct >= 50) {
      return {
        pct,
        brechaKg,
        status: 'REGULAR',
        statusLabel: 'REGULAR • EN RIESGO',
        statusDetail: `Faltan ${Math.abs(brechaKg).toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg para meta`,
      };
    }
    return {
      pct,
      brechaKg,
      status: 'VA_MAL',
      statusLabel: 'VA MAL • BAJO META',
      statusDetail: `Déficit de ${Math.abs(brechaKg).toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg (${pct.toFixed(1)}%)`,
    };
  }

  // Products without explicit quota
  if (ventaKg > 0) {
    return {
      pct: 100,
      brechaKg: ventaKg,
      status: 'ACTIVO_SIN_META',
      statusLabel: 'VA BIEN • VENTA ACTIVA',
      statusDetail: `${ventaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg vendidos`,
    };
  }

  if (histKg > 0) {
    return {
      pct: 0,
      brechaKg: -Math.round(histKg / 8),
      status: 'SIN_VENTA',
      statusLabel: 'VA MAL • CAÍDA VS HISTÓRICO',
      statusDetail: `0 Kg este mes (Histórico 2026: ${histKg.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Kg)`,
    };
  }

  return {
    pct: 0,
    brechaKg: 0,
    status: 'SIN_MOVIMIENTO',
    statusLabel: 'SIN MOVIMIENTO',
    statusDetail: 'Sin cuota ni facturación en el periodo',
  };
}

interface SkuVolumeSubmoduleProps {
  initialSeller?: string;
  initialSupervisor?: string;
}

export const SkuVolumeSubmodule: React.FC<SkuVolumeSubmoduleProps> = ({
  initialSeller = 'TODOS',
  initialSupervisor = 'TODOS',
}) => {
  // Initialize immediately with the 49 Google Sheet seed rows so there is never an empty state
  const [items, setItems] = useState<SkuVolumeItem[]>(() =>
    parseCuotasVolumenCsv(CUOTAS_VOLUMEN_CSV_SEED)
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('');

  // Filters & View Controls
  const [selectedSeller, setSelectedSeller] = useState<string>(initialSeller || 'TODOS');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>(initialSupervisor || 'TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'VA_BIEN' | 'REGULAR' | 'VA_MAL' | 'SIN_VENTA'>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'sheet' | 'cuota_desc' | 'kg_desc' | 'pct_desc' | 'pct_asc' | 'brecha_asc'>('sheet');

  // Modal for inspecting all 23 sellers on a single SKU
  const [inspectingRow, setInspectingRow] = useState<EvaluatedSkuRow | null>(null);

  const loadFullSkuDatabase = async (force: boolean = false) => {
    if (force) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/cuotas/sku-volume${force ? '?refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
          setLastSync(data.lastSync || new Date().toISOString());
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Fallback: strictly the 49 official Google Sheet items from seed
    try {
      const baseSheetItems = parseCuotasVolumenCsv(CUOTAS_VOLUMEN_CSV_SEED);
      setItems(baseSheetItems);
    } catch {
      // Keep existing items
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFullSkuDatabase(false);
  }, []);

  // Available sellers filtered by supervisor if selected
  const filteredSellersList = useMemo(() => {
    if (selectedSupervisor === 'TODOS') return OFFICIAL_SKU_SELLERS;
    return OFFICIAL_SKU_SELLERS.filter((s) => s.supervisor === selectedSupervisor);
  }, [selectedSupervisor]);

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.categoria) set.add(i.categoria);
    });
    return Array.from(set).sort();
  }, [items]);

  // Evaluate every SKU row for the active filter (TODOS, Supervisor, or specific Seller)
  const evaluatedRows = useMemo<EvaluatedSkuRow[]>(() => {
    const activeSellerNames =
      selectedSeller !== 'TODOS'
        ? [selectedSeller]
        : selectedSupervisor !== 'TODOS'
        ? OFFICIAL_SKU_SELLERS.filter((s) => s.supervisor === selectedSupervisor).map((s) => s.name)
        : null; // null = global all sellers

    return items.map((item) => {
      let cuotaKg = 0;
      let ventaKg = 0;
      let cajas = 0;
      let monto = 0;
      let clientesCount = 0;
      let histKg = 0;
      let histMonto = 0;

      if (!activeSellerNames) {
        cuotaKg = item.totalCuotaKg;
        ventaKg = item.totalVentaKg;
        cajas = item.totalCajas;
        monto = item.totalMonto;
        clientesCount = item.totalClientesCount;
        histKg = item.totalHistKg;
        histMonto = item.totalHistMonto;
      } else {
        for (const sName of activeSellerNames) {
          const m = item.bySeller?.[sName];
          if (m) {
            cuotaKg += m.cuotaKg || 0;
            ventaKg += m.ventaKg || 0;
            cajas += m.cajas || 0;
            monto += m.monto || 0;
            clientesCount += m.clientesCount || 0;
            histKg += m.histKg || 0;
            histMonto += m.histMonto || 0;
          }
        }
      }

      cuotaKg = Math.round(cuotaKg * 100) / 100;
      ventaKg = Math.round(ventaKg * 100) / 100;
      cajas = Math.round(cajas * 100) / 100;
      monto = Math.round(monto * 100) / 100;
      histKg = Math.round(histKg * 100) / 100;
      histMonto = Math.round(histMonto * 100) / 100;

      const diag = evaluateSkuPerformance(cuotaKg, ventaKg, histKg);

      return {
        item,
        cuotaKg,
        ventaKg,
        pct: diag.pct,
        brechaKg: diag.brechaKg,
        cajas,
        monto,
        clientesCount,
        histKg,
        histMonto,
        status: diag.status,
        statusLabel: diag.statusLabel,
        statusDetail: diag.statusDetail,
      };
    });
  }, [items, selectedSeller, selectedSupervisor]);

  // Apply Category, Search, Status, and Sort filters
  const filteredRows = useMemo<EvaluatedSkuRow[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    const matching = evaluatedRows.filter((r) => {
      if (selectedCategory !== 'TODAS' && r.item.categoria !== selectedCategory) return false;

      if (statusFilter === 'VA_BIEN' && r.status !== 'VA_BIEN' && r.status !== 'ACTIVO_SIN_META') {
        return false;
      }
      if (statusFilter === 'REGULAR' && r.status !== 'REGULAR') return false;
      if (statusFilter === 'VA_MAL' && r.status !== 'VA_MAL' && r.status !== 'SIN_VENTA') return false;
      if (statusFilter === 'SIN_VENTA' && r.status !== 'SIN_VENTA') return false;

      if (q) {
        const matchCod = r.item.cod.toLowerCase().includes(q) || r.item.rawCod.toLowerCase().includes(q);
        const matchArt = r.item.articulo.toLowerCase().includes(q);
        const matchCat = r.item.categoria.toLowerCase().includes(q);
        if (!matchCod && !matchArt && !matchCat) return false;
      }

      return true;
    });

    const sorted = [...matching];
    if (sortBy === 'cuota_desc') {
      sorted.sort((a, b) => b.cuotaKg - a.cuotaKg || b.ventaKg - a.ventaKg);
    } else if (sortBy === 'kg_desc') {
      sorted.sort((a, b) => b.ventaKg - a.ventaKg || b.cuotaKg - a.cuotaKg);
    } else if (sortBy === 'pct_desc') {
      sorted.sort((a, b) => b.pct - a.pct || b.ventaKg - a.ventaKg);
    } else if (sortBy === 'pct_asc') {
      sorted.sort((a, b) => {
        // Put items with quota > 0 first when sorting by lowest %
        const aHasQuota = a.cuotaKg > 0 ? 0 : 1;
        const bHasQuota = b.cuotaKg > 0 ? 0 : 1;
        if (aHasQuota !== bHasQuota) return aHasQuota - bHasQuota;
        return a.pct - b.pct || b.cuotaKg - a.cuotaKg;
      });
    } else if (sortBy === 'brecha_asc') {
      sorted.sort((a, b) => a.brechaKg - b.brechaKg);
    } else {
      // Default: exact order of the Google Sheet tab Cuotas Volumen (rows 1 to 49)
      sorted.sort((a, b) => a.item.sheetOrder - b.item.sheetOrder);
    }

    return sorted;
  }, [evaluatedRows, selectedCategory, statusFilter, searchQuery, sortBy]);

  // Summary metrics & Seller SKU Diagnostic ("en qué SKU puntual va bien o va mal")
  const diagnosticSummary = useMemo(() => {
    // Calculate on rows matching current category
    const baseRows = evaluatedRows.filter((r) => {
      if (selectedCategory !== 'TODAS' && r.item.categoria !== selectedCategory) return false;
      return true;
    });

    // Separate specific SKUs vs Macro Rubros so totals don't double-count if needed, and compute exact counts
    let totalCuotaKg = 0;
    let totalVentaKg = 0;
    let vaBienCount = 0;
    let regularCount = 0;
    let vaMalCount = 0;
    let sinVentaCount = 0;

    const skusWithQuotaOrSales = baseRows.filter(
      (r) => r.cuotaKg > 0 || r.ventaKg > 0 || r.histKg > 0
    );

    for (const r of baseRows) {
      // Sum official individual SKUs (or all displayed rows)
      if (!r.item.isMacroRubro) {
        totalCuotaKg += r.cuotaKg;
        totalVentaKg += r.ventaKg;
      }
      if (r.status === 'VA_BIEN' || r.status === 'ACTIVO_SIN_META') vaBienCount++;
      else if (r.status === 'REGULAR') regularCount++;
      else if (r.status === 'VA_MAL') vaMalCount++;
      else if (r.status === 'SIN_VENTA') {
        vaMalCount++;
        sinVentaCount++;
      }
    }

    const globalPct = totalCuotaKg > 0 ? (totalVentaKg / totalCuotaKg) * 100 : 0;

    // Top 4 SKUs where seller/team VA BIEN
    const topBienSkus = [...skusWithQuotaOrSales]
      .filter((r) => (r.status === 'VA_BIEN' || r.status === 'ACTIVO_SIN_META') && r.ventaKg > 0)
      .sort((a, b) => b.pct - a.pct || b.ventaKg - a.ventaKg)
      .slice(0, 4);

    // Top 4 Critical SKUs where seller/team VA MAL (largest Kg deficit)
    const topMalSkus = [...skusWithQuotaOrSales]
      .filter((r) => (r.status === 'VA_MAL' || r.status === 'SIN_VENTA') && r.cuotaKg > 0)
      .sort((a, b) => a.brechaKg - b.brechaKg || a.pct - b.pct)
      .slice(0, 4);

    return {
      totalSkusInScope: baseRows.length,
      activeSkusCount: skusWithQuotaOrSales.length,
      totalCuotaKg,
      totalVentaKg,
      globalPct,
      vaBienCount,
      regularCount,
      vaMalCount,
      sinVentaCount,
      topBienSkus,
      topMalSkus,
    };
  }, [evaluatedRows, selectedCategory]);

  // Export PDF handler (also listens to global 'cuotas-export-pdf' event)
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const sellerLabel =
      selectedSeller !== 'TODOS'
        ? selectedSeller
        : selectedSupervisor !== 'TODOS'
        ? `SUPERVISOR: ${selectedSupervisor}`
        : 'TODOS LOS VENDEDORES';

    doc.setFillColor(18, 18, 18);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 72, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CODIZULCA — AUDITORÍA DE VOLUMEN POR SKU', 32, 30);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 220, 220);
    doc.text(
      `Usuario / Filtro: ${sellerLabel}   |   Categoría: ${selectedCategory}   |   SKUs Listados: ${filteredRows.length}   |   Va Bien: ${diagnosticSummary.vaBienCount}   |   Regular: ${diagnosticSummary.regularCount}   |   Va Mal: ${diagnosticSummary.vaMalCount}`,
      32,
      50
    );

    const tableBody = filteredRows.map((r) => [
      r.item.cod,
      r.item.articulo,
      r.item.categoria,
      r.cuotaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 }),
      r.ventaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 }),
      `${r.pct.toFixed(1)}%`,
      r.brechaKg.toLocaleString('es-VE', { maximumFractionDigits: 1 }),
      r.statusLabel,
    ]);

    autoTable(doc, {
      startY: 84,
      head: [['COD', 'ARTICULO / SKU', 'CATEGORIA', 'CUOTA (KG)', 'VENTA (KG)', '% CUMPL.', 'BRECHA (KG)', 'DIAGNÓSTICO']],
      body: tableBody,
      styles: { fontSize: 7.5, cellPadding: 4 },
      headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 7) {
          const text = String(hookData.cell.raw || '');
          if (text.includes('VA BIEN') || text.includes('MUY BIEN')) {
            hookData.cell.styles.textColor = [5, 150, 105];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (text.includes('REGULAR')) {
            hookData.cell.styles.textColor = [217, 119, 6];
            hookData.cell.styles.fontStyle = 'bold';
          } else if (text.includes('VA MAL')) {
            hookData.cell.styles.textColor = [220, 38, 38];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    const cleanSeller = sellerLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Volumen_SKU_${cleanSeller}_Oct2026.pdf`);
  };

  const handleExportCsv = () => {
    const headers = [
      'COD',
      'ARTICULO',
      'CATEGORIA',
      'TIPO_REGISTRO',
      'VENDEDOR_FILTRO',
      'CUOTA_KG',
      'VENTA_KG',
      'CUMPLIMIENTO_PCT',
      'BRECHA_KG',
      'DIAGNOSTICO',
      'DETALLE_DIAGNOSTICO',
      'HISTORICO_2026_KG',
    ];
    const sellerLabel =
      selectedSeller !== 'TODOS'
        ? selectedSeller
        : selectedSupervisor !== 'TODOS'
        ? `SUP_${selectedSupervisor}`
        : 'TODOS_LOS_VENDEDORES';

    const rowsCsv = filteredRows.map((r) =>
      [
        `"${r.item.cod}"`,
        `"${r.item.articulo.replace(/"/g, '""')}"`,
        `"${r.item.categoria}"`,
        `"${r.item.isOfficialQuotaRow ? 'META_SHEET' : 'CATALOGO_BD'}"`,
        `"${sellerLabel}"`,
        r.cuotaKg.toFixed(2),
        r.ventaKg.toFixed(2),
        r.pct.toFixed(2),
        r.brechaKg.toFixed(2),
        `"${r.statusLabel}"`,
        `"${r.statusDetail.replace(/"/g, '""')}"`,
        r.histKg.toFixed(2),
      ].join(',')
    );

    const blob = new Blob(['\uFEFF' + [headers.join(','), ...rowsCsv].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Volumen_Por_SKU_${sellerLabel.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onGlobalPdfExport = () => {
      handleExportPdf();
    };
    window.addEventListener('cuotas-export-pdf', onGlobalPdfExport);
    return () => window.removeEventListener('cuotas-export-pdf', onGlobalPdfExport);
  });

  const formatNum = (val: number, maxDecimals: number = 1) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* CABECERA PRINCIPAL IDÉNTICA A CAPTURA + CONTROLES DE FILTRADO          */}
      {/* ===================================================================== */}
      <div className="bg-[#111318] border border-red-900/40 rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase">
                VOLUMEN POR SKU
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
                {items.length} Productos Oficiales Cuotas Volumen
              </span>
              {selectedSeller !== 'TODOS' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Vendedor: {selectedSeller}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Vista individual por usuario. Columnas idénticas a Google Sheets:{' '}
              <span className="text-slate-300 font-semibold">Cod | Articulo | CUOTA | KG | %</span> + Diagnóstico puntual por SKU.
            </p>
          </div>

          {/* Controles Superiores: Modo Focus + Selector USUARIO + Exportación */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setFocusMode((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                focusMode
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/30'
                  : 'bg-[#1a1d24] text-red-400 border-red-800/60 hover:bg-red-950/40'
              }`}
              title="Alternar entre vista compacta Google Sheets (5 columnas) y vista detallada con diagnóstico"
            >
              {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>Modo Focus</span>
            </button>

            {/* Selector USUARIO (Vendedor) idéntico al diseño de la captura */}
            <div className="flex items-center gap-2 bg-[#171a21] border border-red-900/60 rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                USUARIO:
              </span>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="bg-transparent text-white text-xs font-black uppercase tracking-wide focus:outline-none cursor-pointer pr-2"
              >
                <option value="TODOS" className="bg-[#14171f] text-white font-bold">
                  TODOS LOS VENDEDORES ({filteredSellersList.length})
                </option>
                {filteredSellersList.map((s) => (
                  <option key={s.name} value={s.name} className="bg-[#14171f] text-white">
                    {s.name} ({s.supervisor.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadFullSkuDatabase(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[#1a1d24] hover:bg-slate-800 text-slate-300 border border-slate-700/70 transition-colors cursor-pointer"
              title="Sincronizar con Google Sheets y Base de Datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md transition-all cursor-pointer"
              title="Exportar vista filtrada actual en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-md transition-all cursor-pointer"
              title="Exportar vista filtrada actual en Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BARRA DE FILTROS AVANZADOS (BUSCADOR, SUPERVISOR, CATEGORÍA, ALCANCE) */}
        {/* ================================================================= */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5">
          {/* Buscador por código o nombre de SKU */}
          <div className="xl:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (ej. 629, 21, AZUCAR) o producto..."
              className="w-full bg-[#171a21] border border-slate-700/80 focus:border-red-500 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Supervisor */}
          <div className="xl:col-span-3">
            <select
              value={selectedSupervisor}
              onChange={(e) => {
                setSelectedSupervisor(e.target.value);
                setSelectedSeller('TODOS');
              }}
              className="w-full bg-[#171a21] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="TODOS">SUPERVISOR: TODOS</option>
              <option value="NELSON FINOL">SUP: NELSON FINOL</option>
              <option value="JOHNATAN SOTO">SUP: JOHNATAN SOTO</option>
              <option value="ALI PEREZ">SUP: ALI PEREZ</option>
            </select>
          </div>

          {/* Filtro Categoría */}
          <div className="xl:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#171a21] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="TODAS">CATEGORÍA: TODAS</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div className="xl:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-[#171a21] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="sheet">ORDEN ORIGINAL SHEET (1 - 49)</option>
              <option value="pct_asc">ORDEN: PEOR % PRIMERO (VA MAL)</option>
              <option value="pct_desc">ORDEN: MEJOR % PRIMERO (VA BIEN)</option>
              <option value="brecha_asc">ORDEN: MAYOR BRECHA KG FALTANTE</option>
              <option value="kg_desc">ORDEN: MAYOR VENTA KG</option>
              <option value="cuota_desc">ORDEN: MAYOR CUOTA KG</option>
            </select>
          </div>
        </div>

        {/* ================================================================= */}
        {/* PÍLDORAS DE FILTRO POR DIAGNÓSTICO (VA BIEN / REGULAR / VA MAL)    */}
        {/* ================================================================= */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-red-400" />
              Diagnóstico por SKU:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                statusFilter === 'TODOS'
                  ? 'bg-slate-200 text-slate-900 shadow-sm'
                  : 'bg-[#171a21] text-slate-300 border border-slate-700 hover:bg-slate-800'
              }`}
            >
              Todos ({diagnosticSummary.totalSkusInScope})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('VA_BIEN')}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'VA_BIEN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-900/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Va Bien ({diagnosticSummary.vaBienCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('REGULAR')}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'REGULAR'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-900/40'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-700/50 hover:bg-amber-900/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Regular ({diagnosticSummary.regularCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('VA_MAL')}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'VA_MAL'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'bg-red-950/40 text-red-400 border border-red-700/50 hover:bg-red-900/40'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Va Mal / Crítico ({diagnosticSummary.vaMalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('SIN_VENTA')}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'SIN_VENTA'
                  ? 'bg-rose-700 text-white shadow-md'
                  : 'bg-rose-950/30 text-rose-300 border border-rose-800/50 hover:bg-rose-900/40'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Sin Venta 0 Kg ({diagnosticSummary.sinVentaCount})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Mostrando <strong className="text-white">{filteredRows.length}</strong> de{' '}
            <strong className="text-white">{items.length}</strong> productos
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PANEL DE DIAGNÓSTICO PUNTUAL DEL VENDEDOR / EQUIPO (BIEN VS MAL)      */}
      {/* ===================================================================== */}
      {!focusMode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Resumen Numérico */}
          <div className="lg:col-span-4 bg-[#111318] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Resumen SKU •{' '}
                {selectedSeller !== 'TODOS'
                  ? selectedSeller
                  : selectedSupervisor !== 'TODOS'
                  ? `SUP. ${selectedSupervisor}`
                  : 'EQUIPO GENERAL'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  diagnosticSummary.globalPct >= 80
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : diagnosticSummary.globalPct >= 50
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {diagnosticSummary.globalPct.toFixed(1)}% Global
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-3">
              <div className="bg-emerald-950/25 border border-emerald-800/40 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-emerald-400">
                  {diagnosticSummary.vaBienCount}
                </div>
                <div className="text-[10px] font-bold uppercase text-emerald-300/80">
                  SKUs Va Bien
                </div>
              </div>
              <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-amber-300">
                  {diagnosticSummary.regularCount}
                </div>
                <div className="text-[10px] font-bold uppercase text-amber-300/80">
                  SKUs Regular
                </div>
              </div>
              <div className="bg-red-950/25 border border-red-800/40 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-red-400">
                  {diagnosticSummary.vaMalCount}
                </div>
                <div className="text-[10px] font-bold uppercase text-red-300/80">
                  SKUs Va Mal
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
              <span>
                Cuota SKU:{' '}
                <strong className="text-slate-200 font-mono">
                  {formatNum(diagnosticSummary.totalCuotaKg, 0)} Kg
                </strong>
              </span>
              <span>
                Venta Real:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatNum(diagnosticSummary.totalVentaKg, 0)} Kg
                </strong>
              </span>
            </div>
          </div>

          {/* SKUs donde VA BIEN */}
          <div className="lg:col-span-4 bg-[#111318] border border-emerald-900/40 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                SKUs Puntuales Donde Va Bien
              </span>
              <span className="text-[10px] text-emerald-300/80 font-mono font-bold">
                Top Cumplimiento
              </span>
            </div>
            {diagnosticSummary.topBienSkus.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">
                No hay SKUs en rango óptimo (≥80%) con los filtros actuales.
              </p>
            ) : (
              <div className="space-y-1.5">
                {diagnosticSummary.topBienSkus.map((r) => (
                  <div
                    key={r.item.id}
                    onClick={() => setInspectingRow(r)}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 hover:bg-emerald-900/30 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[10px] font-black font-mono text-amber-400 shrink-0">
                        {r.item.cod}
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {r.item.articulo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatNum(r.ventaKg, 0)} Kg
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black">
                        {r.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SKUs donde VA MAL */}
          <div className="lg:col-span-4 bg-[#111318] border border-red-900/40 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                SKUs Puntuales Donde Va Mal (Foco Crítico)
              </span>
              <span className="text-[10px] text-red-300/80 font-mono font-bold">
                Mayor Brecha Kg
              </span>
            </div>
            {diagnosticSummary.topMalSkus.length === 0 ? (
              <p className="text-xs text-emerald-400 font-semibold py-4">
                ¡Excelente! No tiene SKUs críticos bajo meta en esta selección.
              </p>
            ) : (
              <div className="space-y-1.5">
                {diagnosticSummary.topMalSkus.map((r) => (
                  <div
                    key={r.item.id}
                    onClick={() => setInspectingRow(r)}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-red-950/25 border border-red-800/30 hover:bg-red-900/30 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[10px] font-black font-mono text-amber-400 shrink-0">
                        {r.item.cod}
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {r.item.articulo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-bold text-red-400">
                        {formatNum(r.ventaKg, 0)} / {formatNum(r.cuotaKg, 0)} Kg
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px] font-black">
                        {r.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TABLA OFICIAL VOLUMEN POR SKU (DISEÑO IDÉNTICO A CAPTURA 2)           */}
      {/* ===================================================================== */}
      <div className="bg-[#0d0f14] border border-red-900/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[720px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gradient-to-r from-[#881313] via-[#991b1b] to-[#7f1d1d] text-white text-[11px] font-black uppercase tracking-wider border-b border-red-700/60">
                <th className="py-3.5 px-4 w-28">COD</th>
                <th className="py-3.5 px-4">ARTICULO</th>
                {!focusMode && <th className="py-3.5 px-3 text-center">CATEGORÍA</th>}
                <th className="py-3.5 px-4 text-right">CUOTA</th>
                <th className="py-3.5 px-4 text-right">KG</th>
                <th className="py-3.5 px-4 text-center w-36">%</th>
                <th className="py-3.5 px-4 text-center">DIAGNÓSTICO PUNTUAL SKU</th>
                {!focusMode && (
                  <>
                    <th className="py-3.5 px-3 text-right">BRECHA (KG)</th>
                    <th className="py-3.5 px-3 text-right">HIST. 2026</th>
                    <th className="py-3.5 px-3 text-center">AUDITAR</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={focusMode ? 6 : 10}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No se encontraron productos SKU con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const { item, cuotaKg, ventaKg, pct, brechaKg, histKg, status, statusLabel, statusDetail } =
                    row;

                  // Progress bar & % badge styling matching screenshot 2
                  const barWidth = Math.min(100, Math.max(0, pct));
                  const isGood = status === 'VA_BIEN' || status === 'ACTIVO_SIN_META';
                  const isRegular = status === 'REGULAR';
                  const isBad = status === 'VA_MAL' || status === 'SIN_VENTA';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setInspectingRow(row)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* COD */}
                      <td className="py-3 px-4 font-mono font-black text-amber-400 whitespace-nowrap text-xs">
                        {item.cod}
                      </td>

                      {/* ARTICULO */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-amber-300 transition-colors">
                            {item.articulo}
                          </span>
                        </div>
                      </td>

                      {/* CATEGORÍA (oculto en Modo Focus) */}
                      {!focusMode && (
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800/80 text-slate-300 border border-slate-700/60">
                            {item.categoria}
                          </span>
                        </td>
                      )}

                      {/* CUOTA */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-300 whitespace-nowrap">
                        {cuotaKg > 0 ? formatNum(cuotaKg, 1) : '—'}
                      </td>

                      {/* KG */}
                      <td
                        className={`py-3 px-4 text-right font-mono font-black whitespace-nowrap ${
                          ventaKg > 0
                            ? 'text-emerald-400'
                            : ventaKg < 0
                            ? 'text-red-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatNum(ventaKg, 1)}
                      </td>

                      {/* % con barra inferior idéntica a la captura 2 */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center w-24">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] font-black w-full text-center ${
                              pct >= 80
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50'
                                : pct >= 50
                                ? 'bg-amber-950/90 text-amber-300 border border-amber-600/50'
                                : cuotaKg > 0 || ventaKg < 0
                                ? 'bg-[#3b1219] text-red-400 border border-red-800/60'
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {pct.toFixed(1)}%
                          </span>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 80
                                  ? 'bg-emerald-400'
                                  : pct >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* DIAGNÓSTICO PUNTUAL SKU (VA BIEN / REGULAR / VA MAL) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${
                              isGood
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isRegular
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : isBad
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isGood && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {isRegular && <AlertTriangle className="w-3 h-3 text-amber-300" />}
                            {isBad && <XCircle className="w-3 h-3 text-red-400" />}
                            <span>{statusLabel}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {statusDetail}
                          </span>
                        </div>
                      </td>

                      {!focusMode && (
                        <>
                          {/* BRECHA KG */}
                          <td
                            className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              brechaKg >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {cuotaKg > 0
                              ? `${brechaKg >= 0 ? '+' : ''}${formatNum(brechaKg, 1)} Kg`
                              : '—'}
                          </td>

                          {/* HISTÓRICO 2026 KG */}
                          <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                            {histKg > 0 ? `${formatNum(histKg, 0)} Kg` : '—'}
                          </td>

                          {/* BOTÓN AUDITAR VENDEDORES EN ESTE SKU */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingRow(row);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ver qué vendedores van bien o mal en este SKU"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Vendedores</span>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL DE AUDITORÍA POR SKU: DESGLOSE DE LOS 23 VENDEDORES EN EL SKU   */}
      {/* ===================================================================== */}
      {inspectingRow && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectingRow(null)}
        >
          <div
            className="bg-[#12151c] border border-red-800/50 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#7f1d1d] to-[#171a21] border-b border-red-800/50 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black text-xs">
                    COD: {inspectingRow.item.cod}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-black uppercase">
                    {inspectingRow.item.categoria}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  {inspectingRow.item.articulo}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Auditoría individual de los 23 vendedores en este SKU puntual (Quién va bien vs Quién va mal)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRow(null)}
                className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabla de Vendedores para este SKU */}
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 font-black uppercase text-[10px] border-b border-slate-800">
                    <th className="py-2.5 px-3">VENDEDOR</th>
                    <th className="py-2.5 px-3">SUPERVISOR</th>
                    <th className="py-2.5 px-3 text-right">CUOTA SKU (KG)</th>
                    <th className="py-2.5 px-3 text-right">VENTA REAL (KG)</th>
                    <th className="py-2.5 px-3 text-center">% CUMPL.</th>
                    <th className="py-2.5 px-3 text-right">BRECHA (KG)</th>
                    <th className="py-2.5 px-3 text-center">DIAGNÓSTICO EN ESTE SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {OFFICIAL_SKU_SELLERS.map((s) => {
                    const m = inspectingRow.item.bySeller?.[s.name] || {
                      cuotaKg: 0,
                      ventaKg: 0,
                      cajas: 0,
                      monto: 0,
                      clientesCount: 0,
                      histKg: 0,
                      histCajas: 0,
                      histMonto: 0,
                    };
                    const diag = evaluateSkuPerformance(m.cuotaKg, m.ventaKg, m.histKg);
                    return {
                      seller: s,
                      metrics: m,
                      diag,
                    };
                  })
                    .sort((a, b) => b.metrics.ventaKg - a.metrics.ventaKg || b.metrics.cuotaKg - a.metrics.cuotaKg)
                    .map(({ seller, metrics, diag }) => {
                      const isGood = diag.status === 'VA_BIEN' || diag.status === 'ACTIVO_SIN_META';
                      const isRegular = diag.status === 'REGULAR';
                      const isBad = diag.status === 'VA_MAL' || diag.status === 'SIN_VENTA';

                      return (
                        <tr
                          key={seller.name}
                          onClick={() => {
                            setSelectedSeller(seller.name);
                            setInspectingRow(null);
                          }}
                          className={`hover:bg-white/[0.04] cursor-pointer ${
                            selectedSeller === seller.name ? 'bg-red-950/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-black text-white">{seller.name}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-semibold">
                            {seller.supervisor}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {metrics.cuotaKg > 0 ? formatNum(metrics.cuotaKg, 1) : '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black ${
                              metrics.ventaKg > 0 ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {formatNum(metrics.ventaKg, 1)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                diag.pct >= 80
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : diag.pct >= 50
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : metrics.cuotaKg > 0
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {diag.pct.toFixed(1)}%
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              diag.brechaKg >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {metrics.cuotaKg > 0
                              ? `${diag.brechaKg >= 0 ? '+' : ''}${formatNum(diag.brechaKg, 1)} Kg`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isGood
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : isRegular
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : isBad
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {diag.statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
