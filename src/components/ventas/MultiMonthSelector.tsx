import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, X, RotateCcw } from 'lucide-react';

interface MultiMonthSelectorProps {
  availableMonths: string[];
  selectedMonths: string[];
  onChange: (months: string[]) => void;
  year?: number;
}

export const MultiMonthSelector: React.FC<MultiMonthSelectorProps> = ({
  availableMonths,
  selectedMonths,
  onChange,
  year = 2026
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allSelected = availableMonths.length > 0 && selectedMonths.length === availableMonths.length;
  const isNoneSelected = selectedMonths.length === 0;

  // Manejador para alternar un mes individual
  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      const next = selectedMonths.filter((m) => m !== month);
      onChange(next);
    } else {
      onChange([...selectedMonths, month]);
    }
  };

  // Seleccionar todos los meses
  const selectAll = () => {
    onChange([...availableMonths]);
  };

  // Limpiar selección
  const clearAll = () => {
    onChange([]);
  };

  // Seleccionar solo el mes más reciente (generalmente AGOSTO o el primero de la lista)
  const selectLatestOnly = () => {
    if (availableMonths.length > 0) {
      // Priorizar AGOSTO si existe, sino el primer elemento
      const latest = availableMonths.includes('AGOSTO') ? 'AGOSTO' : availableMonths[0];
      onChange([latest]);
    }
  };

  // Seleccionar los últimos 3 meses (p. ej. JUNIO, JULIO, AGOSTO)
  const selectLast3Months = () => {
    const last3 = ['JUNIO', 'JULIO', 'AGOSTO'].filter((m) => availableMonths.includes(m));
    if (last3.length > 0) {
      onChange(last3);
    } else {
      onChange(availableMonths.slice(-3));
    }
  };

  // Texto resumido para el botón principal
  const getButtonLabel = () => {
    if (isNoneSelected || allSelected) {
      return `Todos los Meses (${availableMonths.length})`;
    }
    if (selectedMonths.length === 1) {
      return `${selectedMonths[0]} ${year}`;
    }
    if (selectedMonths.length === 2) {
      return `${selectedMonths[0]}, ${selectedMonths[1]}`;
    }
    return `${selectedMonths.length} Meses Seleccionados`;
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Botón Disparador del Menú Multiselección */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${
          isOpen
            ? 'bg-zinc-800 border-red-500 text-white ring-2 ring-red-500/20'
            : 'bg-zinc-900 border-white/10 hover:border-white/20 text-zinc-100 hover:bg-zinc-800/80'
        }`}
        title="Haga clic para seleccionar uno o varios meses simultáneamente"
      >
        <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
        <span className="truncate max-w-[170px] sm:max-w-[210px] text-left">
          {getButtonLabel()}
        </span>

        {/* Badge de cantidad si hay más de 1 mes seleccionado pero no todos */}
        {!allSelected && !isNoneSelected && selectedMonths.length > 1 && (
          <span className="px-1.5 py-0.2 rounded-full bg-red-600/30 text-red-400 text-[10px] font-mono font-bold border border-red-500/30">
            {selectedMonths.length}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Popover Desplegable con Checkboxes y Atajos Rápidos */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 rounded-xl bg-zinc-950 border border-white/15 shadow-2xl p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-150 backdrop-blur-md">
          {/* Header del Menú */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
            <div>
              <span className="font-black text-white uppercase tracking-wider text-[11px] block">
                Filtrar por Meses
              </span>
              <span className="text-[10px] text-zinc-400">
                {selectedMonths.length === 0 || allSelected
                  ? `Mostrando todos (${availableMonths.length} meses)`
                  : `${selectedMonths.length} de ${availableMonths.length} meses activos`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Atajos Rápidos */}
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            <button
              type="button"
              onClick={selectAll}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                allSelected
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5'
              }`}
            >
              Todos ({availableMonths.length})
            </button>
            <button
              type="button"
              onClick={selectLatestOnly}
              className="px-2 py-1 rounded text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 transition-colors"
            >
              Solo Actual
            </button>
            <button
              type="button"
              onClick={selectLast3Months}
              className="px-2 py-1 rounded text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 transition-colors"
            >
              Últimos 3M
            </button>
          </div>

          {/* Lista de Meses con Checkboxes */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {availableMonths.map((m) => {
              const isChecked = selectedMonths.includes(m);
              const isLatest = m === 'AGOSTO';

              return (
                <div
                  key={m}
                  onClick={() => toggleMonth(m)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer select-none transition-colors text-xs ${
                    isChecked
                      ? 'bg-red-950/40 border border-red-500/40 text-white'
                      : 'hover:bg-zinc-900 border border-transparent text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Checkbox Cuadrado Estilizado */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-red-600 border-red-500 text-white shadow-sm'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className="font-bold tracking-wide">
                      {m} <span className="text-zinc-500 font-normal">{year}</span>
                    </span>
                  </div>

                  {isLatest && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-red-950/80 text-white border border-red-600/60">
                      ACTUAL
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer del Popover */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors py-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow"
            >
              Aplicar ({selectedMonths.length === 0 ? 'Todos' : selectedMonths.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
