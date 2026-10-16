import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  User,
  TrendingUp,
  FileText,
  ArrowDownLeft,
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Percent,
  Download
} from 'lucide-react';
import { ClientPurchaseHistoryResponse, SalesTransaction } from './types';
import * as XLSX from 'xlsx';

interface ClientPurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string | null;
  onSelectTransaction?: (transaction: SalesTransaction) => void;
}

export const ClientPurchaseHistoryModal: React.FC<ClientPurchaseHistoryModalProps> = ({
  isOpen,
  onClose,
  clientName,
  onSelectTransaction
}) => {
  const [data, setData] = useState<ClientPurchaseHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'documentos' | 'evolucion' | 'productos'>('documentos');
  const [docFilter, setDocFilter] = useState<'ALL' | 'FA' | 'DV'>('ALL');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !clientName) {
      setData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/sales/client-history?client=${encodeURIComponent(clientName)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching client purchase history:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, clientName]);

  if (!isOpen || !clientName) return null;

  const formatUSD = (val: number) => {
    return (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filteredDocs = data?.documents?.filter((d) => {
    if (docFilter === 'FA') return d.tipo_doc === 'FA';
    if (docFilter === 'DV') return d.tipo_doc === 'DV';
    return true;
  }) || [];

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const summaryRows = [
      { Parámetro: 'Cliente', Valor: data.clientName },
      { Parámetro: 'Vendedor', Valor: data.sellerName },
      { Parámetro: 'Total Facturado ($)', Valor: data.summary.totalFA },
      { Parámetro: 'Total Devoluciones ($)', Valor: data.summary.totalDV },
      { Parámetro: 'Venta Neta ($)', Valor: data.summary.netSpent },
      { Parámetro: 'Cajas Facturadas', Valor: data.summary.totalBoxesFA },
      { Parámetro: 'Cajas Devueltas', Valor: data.summary.totalBoxesDV },
      { Parámetro: 'Cajas Netas', Valor: data.summary.netBoxes },
      { Parámetro: 'Tasa de Devolución (%)', Valor: `${data.summary.returnRate.toFixed(2)}%` },
      { Parámetro: 'Total Facturas (FA)', Valor: data.summary.faCount },
      { Parámetro: 'Total Devoluciones (DV)', Valor: data.summary.dvCount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Cliente');

    // Hoja 2: Documentos
    const docRows = data.documents.map((d) => ({
      Documento: d.invoice,
      Tipo: d.tipo_doc === 'FA' ? 'Factura' : 'Devolución',
      Número: d.numero,
      Período: d.date,
      Vendedor: d.seller,
      Producto_Top: d.topProduct,
      Renglones: d.itemsCount,
      Cajas: d.boxes,
      Total_USD: d.total,
    }));
    const wsDocs = XLSX.utils.json_to_sheet(docRows);
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Facturas y Devoluciones');

    XLSX.writeFile(wb, `Historial_${data.clientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_Codizulca.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  HISTORIAL 360° DE COMPRAS Y DEVOLUCIONES
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  Cartera Comercial
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide mt-0.5">
                {data?.clientName || clientName}
              </h3>
              {data?.sellerName && (
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Vendedor: <strong className="text-zinc-200">{data.sellerName}</strong></span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300 border border-white/10 transition-colors"
                title="Descargar historial a Excel"
              >
                <Download className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-zinc-300">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-zinc-400">
                Consultando transacciones históricas en Supabase...
              </p>
              <p className="text-xs text-zinc-600">
                Cargando facturas y devoluciones aplicadas al cliente
              </p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-zinc-500">
              No se encontraron registros de ventas para este cliente.
            </div>
          ) : (
            <>
              {/* Executive KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total Facturado */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Total Facturado (FA)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white">
                    {formatUSD(data.summary.totalFA)}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {data.summary.faCount} facturas emitidas
                  </span>
                </div>

                {/* Total Devoluciones */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Devoluciones (DV)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-zinc-200">
                    {formatUSD(data.summary.totalDV)}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {data.summary.dvCount} notas aplicadas
                  </span>
                </div>

                {/* Venta Neta */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-red-500/30 space-y-1">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                    Venta Neta Real
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white">
                    {formatUSD(data.summary.netSpent)}
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    (FA - DV aplicadas)
                  </span>
                </div>

                {/* Cajas Netas */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Cajas Netas
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white">
                    {data.summary.netBoxes.toLocaleString('es-VE')} cj
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {data.summary.totalBoxesFA.toLocaleString('es-VE')} - {data.summary.totalBoxesDV.toLocaleString('es-VE')} dv
                  </span>
                </div>

                {/* Tasa de Devolución */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    % Tasa Devolución
                  </span>
                  <div className={`text-base sm:text-lg font-black font-mono ${
                    data.summary.returnRate > 15 
                      ? 'text-red-500' 
                      : 'text-zinc-200'
                  }`}>
                    {data.summary.returnRate.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    {data.summary.returnRate > 15 ? '🚨 Riesgo Alto' : '✓ Rango Normal'}
                  </span>
                </div>

                {/* Documentos */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Total Operaciones
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white">
                    {data.summary.totalDocs}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Documentos en 2026
                  </span>
                </div>
              </div>

              {/* Subtabs Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2">
                <div className="inline-flex rounded-xl p-1 bg-zinc-900 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('documentos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activeTab === 'documentos' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Facturas y Devoluciones ({data.documents.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('evolucion')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activeTab === 'evolucion' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Evolución Mensual (Mes a Mes)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('productos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      activeTab === 'productos' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Productos Comprados / Devueltos</span>
                  </button>
                </div>

                {activeTab === 'documentos' && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-zinc-500 text-[11px] mr-1">Filtrar:</span>
                    <button
                      type="button"
                      onClick={() => setDocFilter('ALL')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        docFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Todos ({data.documents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocFilter('FA')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        docFilter === 'FA' ? 'bg-red-600 text-white' : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      Solo Facturas ({data.summary.faCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocFilter('DV')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        docFilter === 'DV' ? 'bg-zinc-800 text-white border border-white/20' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Solo Devoluciones ({data.summary.dvCount})
                    </button>
                  </div>
                )}
              </div>

              {/* TAB 1: DOCUMENTOS (FACTURAS Y DEVOLUCIONES) */}
              {activeTab === 'documentos' && (
                <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10 text-[11px]">
                          <th className="p-3 border-r border-white/10 min-w-[130px]">Documento</th>
                          <th className="p-3 border-r border-white/10 min-w-[110px]">Período</th>
                          <th className="p-3 border-r border-white/10 min-w-[160px]">Vendedor</th>
                          <th className="p-3 border-r border-white/10 min-w-[200px]">Producto (Top)</th>
                          <th className="p-3 text-right border-r border-white/10 min-w-[80px]">Cajas</th>
                          <th className="p-3 text-right border-r border-white/10 min-w-[100px]">Total ($)</th>
                          <th className="p-3 text-center min-w-[80px]">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredDocs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-zinc-500">
                              No hay documentos con este filtro.
                            </td>
                          </tr>
                        ) : (
                          filteredDocs.map((doc) => {
                            const isDV = doc.tipo_doc === 'DV';
                            const isExpanded = expandedDoc === doc.invoice;

                            return (
                              <React.Fragment key={doc.invoice}>
                                <tr className={`hover:bg-white/[0.02] transition-colors ${
                                  isDV ? 'bg-red-950/10' : ''
                                }`}>
                                  <td className="p-3 border-r border-white/10">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                        isDV ? 'bg-zinc-900 text-zinc-300 border border-white/20' : 'bg-red-950/80 text-white border border-red-600/60'
                                      }`}>
                                        {doc.tipo_doc}
                                      </span>
                                      <span className="font-mono font-bold text-white tracking-wider">
                                        {doc.invoice}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="p-3 font-mono text-zinc-400 border-r border-white/10">
                                    {doc.date}
                                  </td>

                                  <td className="p-3 font-medium text-zinc-300 border-r border-white/10">
                                    {doc.seller}
                                  </td>

                                  <td className="p-3 border-r border-white/10">
                                    <span className="text-zinc-200 block truncate max-w-[240px]" title={doc.topProduct}>
                                      {doc.topProduct}
                                    </span>
                                    {doc.itemsCount > 1 && (
                                      <span className="text-[10px] text-zinc-500">
                                        +{doc.itemsCount - 1} {doc.itemsCount === 2 ? 'producto más' : 'productos más'}
                                      </span>
                                    )}
                                  </td>

                                  <td className="p-3 text-right font-mono font-bold text-white border-r border-white/10">
                                    {doc.boxes.toLocaleString('es-VE')}
                                  </td>

                                  <td className={`p-3 text-right font-mono font-black border-r border-white/10 ${
                                    isDV ? 'text-zinc-300' : 'text-white'
                                  }`}>
                                    {formatUSD(doc.total)}
                                  </td>

                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedDoc(isExpanded ? null : doc.invoice)}
                                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                      title={isExpanded ? 'Ocultar ítems' : 'Ver todos los ítems'}
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Items Rows */}
                                {isExpanded && (
                                  <tr className="bg-black/40">
                                    <td colSpan={7} className="p-3 pl-8">
                                      <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 space-y-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                          Renglones de {doc.invoice} ({doc.items.length} ítems):
                                        </span>
                                        <div className="space-y-1">
                                          {doc.items.map((it, iIdx) => (
                                            <div key={iIdx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                              <span className="text-zinc-300 font-medium">{it.articulo}</span>
                                              <div className="flex items-center gap-4 font-mono">
                                                <span className="text-zinc-400">{it.cajas.toLocaleString('es-VE')} cj</span>
                                                <span className={`font-bold ${isDV ? 'text-zinc-300' : 'text-white'}`}>
                                                  {formatUSD(it.monto)}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: EVOLUCIÓN MENSUAL */}
              {activeTab === 'evolucion' && (
                <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10">
                          <th className="p-3 border-r border-white/10">Mes (2026)</th>
                          <th className="p-3 text-right border-r border-white/10">Facturado (FA $)</th>
                          <th className="p-3 text-right border-r border-white/10">Devoluciones (DV $)</th>
                          <th className="p-3 text-right border-r border-white/10">Venta Neta ($)</th>
                          <th className="p-3 text-right border-r border-white/10">Cajas Facturadas</th>
                          <th className="p-3 text-right">Cajas Devueltas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.monthlyEvolution.map((m) => (
                          <tr key={m.mes} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 font-bold text-white border-r border-white/10">
                              {m.mes}
                            </td>
                            <td className="p-3 text-right font-mono text-white border-r border-white/10">
                              {formatUSD(m.faMonto)}
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-300 border-r border-white/10">
                              {m.dvMonto > 0 ? formatUSD(-m.dvMonto) : '$0.00'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-white border-r border-white/10">
                              {formatUSD(m.netMonto)}
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-300 border-r border-white/10">
                              {m.faCajas.toLocaleString('es-VE')}
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-400">
                              {m.dvCajas > 0 ? m.dvCajas.toLocaleString('es-VE') : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCTOS COMPRADOS Y DEVUELTOS */}
              {activeTab === 'productos' && (
                <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10">
                          <th className="p-3 border-r border-white/10">Producto / SKU</th>
                          <th className="p-3 text-right border-r border-white/10">Total Comprado ($)</th>
                          <th className="p-3 text-right border-r border-white/10">Cajas Compradas</th>
                          <th className="p-3 text-right border-r border-white/10">Total Devuelto ($)</th>
                          <th className="p-3 text-right">Cajas Devueltas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.topProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 font-medium text-zinc-200 border-r border-white/10">
                              {p.articulo}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-white border-r border-white/10">
                              {formatUSD(p.totalComprado)}
                            </td>
                            <td className="p-3 text-right font-mono text-white border-r border-white/10">
                              {p.cajasCompradas.toLocaleString('es-VE')} cj
                            </td>
                            <td className={`p-3 text-right font-mono border-r border-white/10 ${
                              p.totalDevuelto > 0 ? 'text-zinc-300 font-bold' : 'text-zinc-600'
                            }`}>
                              {p.totalDevuelto > 0 ? formatUSD(-p.totalDevuelto) : '$0.00'}
                            </td>
                            <td className={`p-3 text-right font-mono ${
                              p.cajasDevueltas > 0 ? 'text-zinc-300' : 'text-zinc-600'
                            }`}>
                              {p.cajasDevueltas > 0 ? p.cajasDevueltas.toLocaleString('es-VE') : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            Auditoría de Clientes • Base de Datos Oficial Supabase
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
