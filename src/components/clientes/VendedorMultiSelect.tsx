import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Users, ChevronDown, Check, X, Search, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SellerOption {
  name: string;
  total?: number;
  withGps?: number;
  color?: string;
}

interface VendedorMultiSelectProps {
  sellers: SellerOption[];
  selectedSellers: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  compact?: boolean;
  placeholder?: string;
}

export const VendedorMultiSelect: React.FC<VendedorMultiSelectProps> = ({
  sellers,
  selectedSellers,
  onChange,
  className,
  compact = false,
  placeholder = 'Vendedores'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredSellers = useMemo(() => {
    if (!search.trim()) return sellers;
    const q = search.toLowerCase().trim();
    return sellers.filter(s => s.name.toLowerCase().includes(q));
  }, [sellers, search]);

  const isAllSelected = selectedSellers.length === 0;

  const handleToggle = (sellerName: string) => {
    if (selectedSellers.includes(sellerName)) {
      const next = selectedSellers.filter(s => s !== sellerName);
      onChange(next);
    } else {
      onChange([...selectedSellers, sellerName]);
    }
  };

  const handleSelectAll = () => {
    // Empty array signifies "All Sellers" (no filter restriction)
    onChange([]);
  };

  const handleClear = () => {
    onChange([]);
  };

  // Label text for button
  const buttonLabel = useMemo(() => {
    if (isAllSelected) {
      return compact ? `Vendedores: Todos (${sellers.length})` : `Todos los Vendedores (${sellers.length})`;
    }
    if (selectedSellers.length === 1) {
      return selectedSellers[0];
    }
    return `${selectedSellers.length} Vendedores seleccionados`;
  }, [isAllSelected, selectedSellers, sellers.length, compact]);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border transition-all text-xs font-semibold cursor-pointer",
          compact
            ? "px-2.5 py-1 bg-black/60 border-white/10 hover:border-white/20 text-zinc-200"
            : "px-3 py-2 bg-black/60 border-white/10 hover:border-red-500/50 text-zinc-200",
          selectedSellers.length > 0 && "border-red-500/60 bg-red-950/20 text-white"
        )}
        title="Filtrar por uno o varios vendedores"
      >
        <div className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-[240px]">
          <Users className={cn("shrink-0", compact ? "w-3 h-3 text-red-400" : "w-3.5 h-3.5 text-red-400")} />
          <span className="truncate">{buttonLabel}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedSellers.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
              title="Restablecer a todos"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl bg-zinc-950 border border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar vendedor..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between px-1 py-1 mb-1.5 border-b border-white/5 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className={cn(
                "px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer",
                isAllSelected
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              ✓ Todos ({sellers.length})
            </button>

            {selectedSellers.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
              >
                Limpiar selección ({selectedSellers.length})
              </button>
            )}
          </div>

          {/* Sellers List with Checkboxes */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
            {filteredSellers.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500">
                No hay vendedores con "{search}"
              </div>
            ) : (
              filteredSellers.map((seller) => {
                const isChecked = selectedSellers.includes(seller.name);
                return (
                  <div
                    key={seller.name}
                    onClick={() => handleToggle(seller.name)}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer select-none",
                      isChecked
                        ? "bg-red-950/40 text-white font-bold border border-red-500/30"
                        : "text-zinc-300 hover:bg-zinc-900/80 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors",
                        isChecked
                          ? "bg-red-600 border-red-500 text-white"
                          : "border-white/20 bg-zinc-900 text-transparent"
                      )}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>

                      {seller.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: seller.color }}
                        />
                      )}

                      <span className="truncate">{seller.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-zinc-400">
                      {seller.withGps !== undefined && (
                        <span className="text-white font-bold" title="Geocercas GPS sincronizadas">
                          {seller.withGps} GPS
                        </span>
                      )}
                      {seller.total !== undefined && (
                        <span className="text-zinc-500">
                          / {seller.total}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 px-1">
            <span>Multiselección activa</span>
            <span className="font-bold text-zinc-400">
              {isAllSelected ? 'Mostrando todos' : `${selectedSellers.length} filtrados`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
