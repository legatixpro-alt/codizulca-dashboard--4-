import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  FileText,
  ChevronRight,
  ArrowDownLeft,
  Filter,
  RefreshCw,
  Calendar,
  Building,
  User,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SalesTransaction, SalesSummaryKPIs } from '../components/ventas/types';
import { VentasKPIHeader } from '../components/ventas/VentasKPIHeader';
import { InvoiceDetailModal } from '../components/ventas/InvoiceDetailModal';
import { ClientPurchaseHistoryModal } from '../components/ventas/ClientPurchaseHistoryModal';
import { MultiMonthSelector } from '../components/ventas/MultiMonthSelector';
import { getSellerMetadata, OFFICIAL_SUPERVISORS } from '../components/cuotas/sellerSupervisorMap';

export const Ventas: React.FC = () => {
  // Estados de datos
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [summary, setSummary] = useState<SalesSummaryKPIs | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [months, setMonths] = useState<string[]>(['OCTUBRE', 'SEPTIEMBRE', 'AGOSTO', 'JULIO', 'JUNIO', 'MAYO', 'ABRIL', 'MARZO', 'FEBRERO', 'ENERO']);
  const [sellers, setSellers] = useState<string[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');
  const [selectedSeller, setSelectedSeller] = useState<string>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<'ALL' | 'FA' | 'DV'>('ALL');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['OCTUBRE']);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Vendedores filtrados según supervisor seleccionado
  const filteredSellers = useMemo(() => {
    if (selectedSupervisor === 'ALL') return sellers;
    return sellers.filter((s) => getSellerMetadata(s).supervisor === selectedSupervisor);
  }, [sellers, selectedSupervisor]);

  // Modales
  const [selectedInvoice, setSelectedInvoice] = useState<SalesTransaction | null>(null);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<string | null>(null);

  // Cargar metadatos (vendedores y meses)
  useEffect(() => {
    fetch('/api/sales/meta')
      .then((res) => res.json())
      .then((meta) => {
        if (meta.months) setMonths(meta.months);
        if (meta.sellers) setSellers(meta.sellers);
        if (meta.latestMonth) setSelectedMonths([meta.latestMonth]);
      })
      .catch((err) => console.error('Error fetching sales meta:', err));
  }, []);

  // Cargar transacciones de ventas y devoluciones desde Supabase
  const fetchTransactions = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (selectedMonths.length > 0 && selectedMonths.length < months.length) {
      params.append('mes', selectedMonths.join(','));
    } else {
      params.append('mes', 'ALL');
    }
    if (selectedDocType) params.append('tipo_doc', selectedDocType);
    if (selectedSupervisor && selectedSupervisor !== 'ALL') params.append('supervisor', selectedSupervisor);
    if (selectedSeller && selectedSeller !== 'ALL') params.append('vendedor', selectedSeller);
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    params.append('page', String(page));
    params.append('pageSize', '35');

    fetch(`/api/sales/transactions?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.documents) {
          setTransactions(json.documents);
          setSummary(json.summary || null);
          setHasMore(Boolean(json.hasMore));
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching sales transactions:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonths, selectedDocType, selectedSupervisor, selectedSeller, page]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTransactions();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatCurrency = (val: number) => {
    return (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Subtítulo del período seleccionado
  const getPeriodSubtitle = () => {
    if (selectedMonths.length === 0 || selectedMonths.length === months.length) {
      return 'todos los meses de 2026';
    }
    if (selectedMonths.length === 1) {
      return `${selectedMonths[0]} 2026`;
    }
    return `${selectedMonths.join(', ')} 2026 (${selectedMonths.length} meses seleccionados)`;
  };

  // Exportar lista actual a Excel (.xlsx)
  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      const periodLabel = selectedMonths.length === 0 || selectedMonths.length === months.length
        ? 'Todos los Meses 2026'
        : `${selectedMonths.join(' - ')} 2026`;

      // Hoja de Resumen
      const summaryRows = [
        { Concepto: 'Módulo', Valor: 'Ventas y Facturación Oficial' },
        { Concepto: 'Fuente de Datos', Valor: 'Supabase history_sales (Transacciones Reales)' },
        { Concepto: 'Período', Valor: periodLabel },
        { Concepto: 'Meses Seleccionados', Valor: selectedMonths.length === 0 || selectedMonths.length === months.length ? 'Todos' : selectedMonths.join(', ') },
        { Concepto: 'Filtro Tipo Documento', Valor: selectedDocType === 'ALL' ? 'Facturas (FA) y Devoluciones (DV)' : selectedDocType },
        { Concepto: 'Filtro Vendedor', Valor: selectedSeller },
        { Concepto: 'Facturación Bruta (FA $)', Valor: summary?.totalFA || 0 },
        { Concepto: 'Devoluciones Aplicadas (DV $)', Valor: summary?.totalDV || 0 },
        { Concepto: 'Venta Neta Real ($)', Valor: summary?.netTotal || 0 },
        { Concepto: 'Cajas Netas', Valor: summary?.totalBoxes || 0 },
        { Concepto: 'Tasa de Devolución (%)', Valor: `${summary?.returnRate.toFixed(2)}%` },
        { Concepto: 'Fecha de Generación', Valor: new Date().toLocaleString('es-VE') },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Gerencial');

      // Hoja de Facturas y Devoluciones
      const docRows = transactions.map((t) => ({
        Documento: t.invoice,
        Tipo: t.tipo_doc === 'FA' ? 'Factura' : 'Devolución',
        Número: t.numero,
        Período: t.date,
        Vendedor: t.seller,
        Cliente: t.client,
        Producto_Top: t.topProduct,
        Renglones: t.itemsCount,
        Cajas: t.boxes,
        Total_USD: t.total,
      }));
      const wsDocs = XLSX.utils.json_to_sheet(docRows);
      XLSX.utils.book_append_sheet(wb, wsDocs, 'Facturas y Devoluciones');

      const fileNameMonthSuffix = selectedMonths.length === 0 || selectedMonths.length === months.length
        ? 'Todos_Meses'
        : selectedMonths.join('_');
      XLSX.writeFile(wb, `Ventas_Facturacion_${fileNameMonthSuffix}_2026_Codizulca.xlsx`);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 font-sans text-zinc-100 max-w-[1600px] mx-auto pb-10">
      {/* 1. Header Oficial de Ventas y Facturación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
              SUPABASE OFICIAL
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              267,148 Transacciones Conectadas
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] mt-1">
            VENTAS & FACTURACIÓN
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Registro oficial de facturas (FA) y devoluciones (DV) aplicadas a los clientes en <strong className="text-zinc-200">{getPeriodSubtitle()}</strong>.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
            <span>Datos en Vivo Supabase</span>
          </div>

          <button
            type="button"
            onClick={fetchTransactions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors"
            title="Recargar datos de Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-500' : 'text-zinc-400'}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI de Resumen de Facturación y Devoluciones */}
      <VentasKPIHeader
        summary={summary}
        selectedMonths={selectedMonths}
      />

      {/* 3. Barra de Filtros Multifuncional */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, N° factura (FA), vendedor o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Tipo Documento */}
            <div className="inline-flex rounded-lg p-0.5 bg-zinc-900 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => { setSelectedDocType('ALL'); setPage(1); }}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  selectedDocType === 'ALL' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos (FA + DV)
              </button>
              <button
                type="button"
                onClick={() => { setSelectedDocType('FA'); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-bold transition-all ${
                  selectedDocType === 'FA' ? 'bg-red-600 text-white shadow' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>Facturas (FA)</span>
              </button>
              <button
                type="button"
                onClick={() => { setSelectedDocType('DV'); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-bold transition-all ${
                  selectedDocType === 'DV' ? 'bg-zinc-800 text-white border border-white/20 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-red-400" />
                <span>Devoluciones (DV)</span>
              </button>
            </div>

            {/* Filtro Mes Multiselección */}
            <MultiMonthSelector
              availableMonths={months}
              selectedMonths={selectedMonths}
              onChange={(newMonths) => {
                setSelectedMonths(newMonths);
                setPage(1);
              }}
              year={2026}
            />

            {/* Filtro Supervisor */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg text-xs">
              <Building className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <select
                value={selectedSupervisor}
                onChange={(e) => {
                  setSelectedSupervisor(e.target.value);
                  setSelectedSeller('ALL');
                  setPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer py-1 max-w-[165px] truncate"
              >
                <option value="ALL" className="bg-zinc-900">Todos los Supervisores</option>
                {OFFICIAL_SUPERVISORS.map((sup) => (
                  <option key={sup} value={sup} className="bg-zinc-900">
                    Sup: {sup}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Vendedor */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedSeller}
                onChange={(e) => { setSelectedSeller(e.target.value); setPage(1); }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer py-1 max-w-[160px] truncate"
              >
                <option value="ALL" className="bg-zinc-900">Todos los Vendedores ({filteredSellers.length})</option>
                {filteredSellers.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Exportar a Excel */}
            <button
              type="button"
              onClick={handleExportToExcel}
              disabled={isExporting || transactions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors disabled:opacity-50"
              title="Descargar listado oficial a Excel"
            >
              <Download className="h-3.5 w-3.5 text-red-500" />
              <span>{isExporting ? 'Exportando...' : 'Exportar a Excel'}</span>
            </button>
          </div>
        </div>

        {/* Chips de Meses Activos cuando no están todos seleccionados */}
        {selectedMonths.length > 0 && selectedMonths.length < months.length && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              Meses Filtrados:
            </span>
            {selectedMonths.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-950/50 border border-red-500/30 text-red-300 font-bold shadow-sm"
              >
                <span>{m}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedMonths.filter((x) => x !== m);
                    setSelectedMonths(next.length === 0 ? ['AGOSTO'] : next);
                    setPage(1);
                  }}
                  className="hover:text-white transition-colors"
                  title={`Quitar filtro de ${m}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedMonths([...months]);
                setPage(1);
              }}
              className="text-zinc-400 hover:text-white underline text-[10px] ml-1.5 transition-colors font-medium"
            >
              Seleccionar todos los meses ({months.length})
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabla de Facturas y Devoluciones */}
      <div className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px] text-xs">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10 text-[11px] select-none">
                <th className="p-3.5 border-r border-white/10 min-w-[140px]">Factura / Dev</th>
                <th className="p-3.5 border-r border-white/10 min-w-[110px]">Período</th>
                <th className="p-3.5 border-r border-white/10 min-w-[160px]">Vendedor</th>
                <th className="p-3.5 border-r border-white/10 min-w-[260px]">
                  Cliente (Click para Historial 360°)
                </th>
                <th className="p-3.5 border-r border-white/10 min-w-[200px]">Producto (Top)</th>
                <th className="p-3.5 text-right border-r border-white/10 min-w-[80px]">Cajas</th>
                <th className="p-3.5 text-right border-r border-white/10 min-w-[110px]">Total ($)</th>
                <th className="p-3.5 text-center min-w-[80px]">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-zinc-400 space-y-3">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-bold">Cargando facturas y devoluciones de Supabase...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-zinc-500">
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                transactions.map((row) => {
                  const isDV = row.tipo_doc === 'DV';

                  return (
                    <tr
                      key={row.invoice}
                      className={`hover:bg-white/[0.03] transition-colors group ${
                        isDV ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Documento (FA / DV) */}
                      <td className="p-3.5 border-r border-white/10">
                        <div
                          onClick={() => setSelectedInvoice(row)}
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              isDV
                                ? 'bg-zinc-900 text-zinc-300 border border-white/20'
                                : 'bg-red-950/80 text-white border border-red-600/60'
                            }`}
                          >
                            {row.tipo_doc}
                          </span>
                          <span className="font-mono font-bold text-white tracking-wider text-xs">
                            {row.invoice}
                          </span>
                        </div>
                      </td>

                      {/* Fecha / Período */}
                      <td className="p-3.5 font-mono text-zinc-400 border-r border-white/10">
                        {row.date}
                      </td>

                      {/* Vendedor */}
                      <td className="p-3.5 font-bold text-zinc-300 border-r border-white/10">
                        {row.seller}
                      </td>

                      {/* Cliente (Interactivo para Historial 360°) */}
                      <td className="p-3.5 border-r border-white/10">
                        <button
                          type="button"
                          onClick={() => setSelectedClientForHistory(row.client)}
                          className="text-left font-bold text-zinc-200 hover:text-red-400 hover:underline transition-colors block leading-snug"
                          title="Haga clic para ver el historial completo de compras y devoluciones de este cliente"
                        >
                          {row.client}
                        </button>
                      </td>

                      {/* Producto Top */}
                      <td className="p-3.5 border-r border-white/10">
                        <div className="flex flex-col">
                          <span className="text-zinc-300 truncate max-w-[220px]" title={row.topProduct}>
                            {row.topProduct}
                          </span>
                          {row.itemsCount > 1 && (
                            <span className="text-[10px] text-zinc-500">
                              +{row.itemsCount - 1} {row.itemsCount === 2 ? 'producto más' : 'productos más'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cajas */}
                      <td className="p-3.5 text-right font-mono font-bold text-white border-r border-white/10">
                        {row.boxes.toLocaleString('es-VE')}
                      </td>

                      {/* Total */}
                      <td className={`p-3.5 text-right font-mono font-black border-r border-white/10 ${
                        isDV ? 'text-zinc-300' : 'text-white'
                      }`}>
                        {formatCurrency(row.total)}
                      </td>

                      {/* Acción */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(row)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                          title="Ver detalle del documento"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-zinc-500 font-mono">
            Página <strong className="text-white">{page}</strong> • Mostrando {transactions.length} documentos cargados de Supabase
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 font-bold text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!hasMore || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 font-bold text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Detalle de Factura / Devolución */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        transaction={selectedInvoice}
        onOpenClientHistory={(client) => setSelectedClientForHistory(client)}
      />

      {/* Modal 2: Historial de Compras y Devoluciones del Cliente (360°) */}
      <ClientPurchaseHistoryModal
        isOpen={Boolean(selectedClientForHistory)}
        onClose={() => setSelectedClientForHistory(null)}
        clientName={selectedClientForHistory}
        onSelectTransaction={(tx) => setSelectedInvoice(tx)}
      />
    </div>
  );
};
