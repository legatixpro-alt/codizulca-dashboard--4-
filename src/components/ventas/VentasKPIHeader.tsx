import React from 'react';
import { TrendingUp, ArrowDownLeft, FileText, Package, Percent, Calendar } from 'lucide-react';
import { SalesSummaryKPIs } from './types';

interface VentasKPIHeaderProps {
  summary: SalesSummaryKPIs | null;
  selectedMonth?: string;
  selectedMonths?: string[];
}

export const VentasKPIHeader: React.FC<VentasKPIHeaderProps> = ({
  summary,
  selectedMonth,
  selectedMonths
}) => {
  const formatUSD = (val: number) => {
    return '$' + Math.round(val).toLocaleString('es-VE');
  };

  const totalFA = summary?.totalFA || 0;
  const totalDV = summary?.totalDV || 0;
  const netTotal = summary?.netTotal || 0;
  const totalBoxes = summary?.totalBoxes || 0;
  const returnRate = summary?.returnRate || 0;
  const faCount = summary?.faCount || 0;
  const dvCount = summary?.dvCount || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. Facturación Bruta (FA) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-red-500" /> Facturación Bruta (FA)
        </span>
        <div className="text-lg sm:text-2xl font-black font-mono text-white truncate">
          {formatUSD(totalFA)}
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">
          {faCount.toLocaleString('es-VE')} renglones facturados
        </div>
      </div>

      {/* 2. Devoluciones Aplicadas (DV) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
          <ArrowDownLeft className="w-3.5 h-3.5 text-red-400" /> Devoluciones Aplicadas (DV)
        </span>
        <div className="text-lg sm:text-2xl font-black font-mono text-zinc-200 truncate">
          {totalDV > 0 ? formatUSD(totalDV) : '$0'}
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">
          {dvCount.toLocaleString('es-VE')} notas de devolución
        </div>
      </div>

      {/* 3. Venta Neta Real */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 border border-red-500/30 shadow-lg space-y-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-red-400 uppercase tracking-wider block flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-red-500" /> Venta Neta Real
        </span>
        <div className="text-lg sm:text-2xl font-black font-mono text-white truncate">
          {formatUSD(netTotal)}
        </div>
        <div className="text-[10px] text-zinc-400">
          Facturación menos devoluciones
        </div>
      </div>

      {/* 4. Cajas Netas */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-zinc-400" /> Cajas Netas
        </span>
        <div className="text-lg sm:text-2xl font-black font-mono text-white truncate">
          {Math.round(totalBoxes).toLocaleString('es-VE')} <span className="text-xs font-normal text-zinc-500">cj</span>
        </div>
        <div className="text-[10px] text-zinc-500">
          Volumen neto despachado
        </div>
      </div>

      {/* 5. Tasa de Devolución */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1 col-span-2 sm:col-span-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
          <Percent className="w-3.5 h-3.5 text-red-500" /> Tasa de Devolución
        </span>
        <div className={`text-lg sm:text-2xl font-black font-mono truncate ${
          returnRate > 15 ? 'text-red-500' : 'text-zinc-200'
        }`}>
          {returnRate.toFixed(1)}%
        </div>
        <div className="text-[10px] text-zinc-500">
          {returnRate > 15 ? 'Alerta de merma alta' : 'Rango operacional normal'}
        </div>
      </div>
    </div>
  );
};
