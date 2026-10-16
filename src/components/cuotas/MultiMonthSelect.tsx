import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Check, ChevronDown, X, RotateCcw } from 'lucide-react';
import { MONTH_LABELS } from './paretoTypes';

export const SHORT_MONTH_LABELS: Record<string, string> = {
  ALL: 'Todos',
  ENERO: 'Ene',
  FEBRERO: 'Feb',
  MARZO: 'Mar',
  ABRIL: 'Abr',
  MAYO: 'May',
  JUNIO: 'Jun',
  JULIO: 'Jul',
  AGOSTO: 'Ago',
  SEPTIEMBRE: 'Sep',
  OCTUBRE: 'Oct',
  NOVIEMBRE: 'Nov',
  DICIEMBRE: 'Dic',
};

interface MultiMonthSelectProps {
  selectedMonths: string[];
  onChange: (months: string[]) => void;
  availableMonths?: string[];
  title?: string;
  className?: string;
}

export const MultiMonthSelect: React.FC<MultiMonthSelectProps> = ({
  selectedMonths,
  onChange,
  availableMonths = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
  ],
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const isAllSelected =
    selectedMonths.length === 0 ||
    selectedMonths.includes('ALL') ||
    selectedMonths.length === availableMonths.length;

  const toggleMonth = (monthKey: string) => {
    if (monthKey === 'ALL') {
      onChange([]);
      return;
    }

    let next: string[];
    if (isAllSelected) {
      next = [monthKey];
    } else if (selectedMonths.includes(monthKey)) {
      next = selectedMonths.filter((m) => m !== monthKey);
      if (next.length === 0) {
        next = [];
      }
    } else {
      next = [...selectedMonths, monthKey];
      if (next.length === availableMonths.length) {
        next = [];
      }
    }
    onChange(next);
  };

  const selectAll = () => {
    onChange([]);
  };

  const selectLastTwo = () => {
    if (availableMonths.length >= 2) {
      onChange(availableMonths.slice(-2));
    }
  };

  const selectQuarter = (months: string[]) => {
    const valid = months.filter((m) => availableMonths.includes(m));
    onChange(valid);
  };

  // Button label formatting: compact, no long text
  const getButtonLabel = () => {
    if (isAllSelected) {
      return 'Todo el Año';
    }
    if (selectedMonths.length === 1) {
      const m = selectedMonths[0];
      return SHORT_MONTH_LABELS[m] || m;
    }
    if (selectedMonths.length <= 3) {
      return selectedMonths.map((m) => SHORT_MONTH_LABELS[m] || m).join(' + ');
    }
    return `${selectedMonths.length} Meses`;
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 bg-zinc-900 border transition-all rounded-xl px-3 py-1.5 text-xs font-semibold select-none cursor-pointer h-9 ${
          isOpen
            ? 'border-red-500 shadow-[0_0_12px_rgba(224,6,19,0.25)] text-white'
            : !isAllSelected
            ? 'border-red-500/50 bg-red-950/20 text-red-200 hover:border-red-500'
            : 'border-white/10 text-zinc-200 hover:border-white/20 hover:text-white'
        }`}
        title="Filtrar por meses (desplegable multiselección)"
      >
        <div className="flex items-center gap-1.5 truncate max-w-[190px]">
          <Calendar className={`w-3.5 h-3.5 shrink-0 ${!isAllSelected ? 'text-red-500' : 'text-zinc-400'}`} />
          <span className="text-[11px] text-zinc-400 font-normal">Mes:</span>
          <span className="truncate font-bold text-white">{getButtonLabel()}</span>
        </div>

        {!isAllSelected && (
          <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono text-[10px] font-black">
            {selectedMonths.length}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-76 sm:w-80 rounded-2xl bg-zinc-950 border border-white/15 p-3 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Selección de Meses
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className={`px-2 py-0.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                isAllSelected
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20'
              }`}
            >
              Todo el Año
            </button>

            <button
              type="button"
              onClick={selectLastTwo}
              className={`px-2 py-0.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                !isAllSelected &&
                selectedMonths.length === 2 &&
                availableMonths.length >= 2 &&
                selectedMonths.includes(availableMonths[availableMonths.length - 1]) &&
                selectedMonths.includes(availableMonths[availableMonths.length - 2])
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20'
              }`}
            >
              Últimos 2
            </button>

            <button
              type="button"
              onClick={() => selectQuarter(['JULIO', 'AGOSTO', 'SEPTIEMBRE'])}
              className="px-1.5 py-0.5 rounded-lg font-bold border bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20 cursor-pointer"
            >
              Q3
            </button>
            <button
              type="button"
              onClick={() => selectQuarter(['ABRIL', 'MAYO', 'JUNIO'])}
              className="px-1.5 py-0.5 rounded-lg font-bold border bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20 cursor-pointer"
            >
              Q2
            </button>
            <button
              type="button"
              onClick={() => selectQuarter(['ENERO', 'FEBRERO', 'MARZO'])}
              className="px-1.5 py-0.5 rounded-lg font-bold border bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20 cursor-pointer"
            >
              Q1
            </button>

            {!isAllSelected && (
              <button
                type="button"
                onClick={selectAll}
                className="p-1 text-zinc-400 hover:text-white rounded ml-auto"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Month Checkbox Grid (3 columns for compact height) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {availableMonths.map((m) => {
              const checked = isAllSelected || selectedMonths.includes(m);
              const label = SHORT_MONTH_LABELS[m] || m;
              const fullName = MONTH_LABELS[m] || m;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMonth(m)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    checked
                      ? 'bg-red-950/50 border-red-500/70 text-white font-bold shadow-sm'
                      : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={fullName}
                >
                  <span className="truncate">{label}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? 'bg-red-600 border border-red-500 text-white'
                        : 'border border-white/20 bg-black/40'
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer with Summary and Apply */}
          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">
              {isAllSelected
                ? 'Todos los meses'
                : `${selectedMonths.length} de ${availableMonths.length} meses`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
