import React, { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import {
  getAllAvailableStores,
  addCustomStoreToCatalog
} from '../../lib/campoService';
import { STORAGE_KEY_ACTIVE_STORE } from '../../lib/checkinsService';

interface CampoStoreSelectorProps {
  value: string;
  onChange: (newStore: string) => void;
  label?: string;
}

export const CampoStoreSelector: React.FC<CampoStoreSelectorProps> = ({
  value,
  onChange,
  label = 'Punto de Venta / Sucursal:'
}) => {
  const [stores, setStores] = useState<string[]>(() => getAllAvailableStores());
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newStoreInput, setNewStoreInput] = useState<string>('');

  useEffect(() => {
    const refreshStores = () => {
      setStores(getAllAvailableStores());
    };
    window.addEventListener('codizulca_stores_updated', refreshStores);
    return () => window.removeEventListener('codizulca_stores_updated', refreshStores);
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW_STORE__') {
      setIsAddingNew(true);
      return;
    }
    onChange(val);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_STORE, val);
    } catch {}
  };

  const handleConfirmNewStore = () => {
    const cleaned = newStoreInput.trim().toUpperCase();
    if (!cleaned) return;
    const updatedList = addCustomStoreToCatalog(cleaned);
    setStores(updatedList);
    onChange(cleaned);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_STORE, cleaned);
    } catch {}
    setNewStoreInput('');
    setIsAddingNew(false);
  };

  const allOptions = stores.includes(value) || !value ? stores : [value, ...stores];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsAddingNew((prev) => !prev)}
          className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
        >
          {isAddingNew ? (
            <>
              <X className="w-3 h-3" />
              <span>Cancelar</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span>Agregar Cliente</span>
            </>
          )}
        </button>
      </div>

      {isAddingNew ? (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
          <input
            type="text"
            value={newStoreInput}
            onChange={(e) => setNewStoreInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmNewStore();
              }
            }}
            placeholder="Escribir nombre del cliente / sucursal..."
            autoFocus
            className="flex-1 bg-[#171717] border border-red-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
          <button
            type="button"
            onClick={handleConfirmNewStore}
            className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={handleSelectChange}
          className="w-full bg-[#171717] border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
        >
          {allOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="__ADD_NEW_STORE__">➕ AGREGAR NUEVO CLIENTE / PDV...</option>
        </select>
      )}
    </div>
  );
};
