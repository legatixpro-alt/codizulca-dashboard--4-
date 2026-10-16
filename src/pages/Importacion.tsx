import React, { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle, Save, Cpu } from 'lucide-react';

export const Importacion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'excel'>('ai');
  const [textInput, setTextInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const mockExtract = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      setExtractedData({
        client_name: "Supermercado El Sol",
        matched_client_name: "INVERSIONES EL SOL C.A.",
        date: "2026-09-15",
        invoice_number: "OCR-00129",
        items: [
          { product_name: "Harina PAN", matched_product_name: "HARINA PRECOCIDA BLANCA 1KG", quantity_boxes: 20, matched_price: 23.00 },
          { product_name: "Arroz Mary", matched_product_name: "ARROZ BLANCO GRANO ENTERO 1KG", quantity_boxes: 10, matched_price: 30.00 }
        ]
      });
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 font-sans text-zinc-100 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          CARGA & AUTOMATIZACIÓN
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Carga de pedidos con Inteligencia Artificial o importación masiva por Excel.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-px">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-6 py-3 text-sm font-bold tracking-wider uppercase transition-colors relative flex items-center gap-2 ${activeTab === 'ai' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Cpu className="w-4 h-4" />
          Extracción con IA
          {activeTab === 'ai' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-6 py-3 text-sm font-bold tracking-wider uppercase transition-colors relative flex items-center gap-2 ${activeTab === 'excel' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <FileText className="w-4 h-4" />
          Plantillas Excel
          {activeTab === 'excel' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          )}
        </button>
      </div>

      {activeTab === 'ai' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Card */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-bold text-white tracking-wider uppercase">Entrada de Datos</h3>
            </div>
            <div className="p-6 space-y-6 flex-1">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Texto libre (Ej. WhatsApp)</label>
                <textarea
                  className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors min-h-[120px] resize-none"
                  placeholder="Ej: Pedido para el supermercado sol. 20 cajas de harina y 10 de arroz..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isExtracting}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-xs font-bold tracking-widest text-zinc-600 uppercase">O ADJUNTA UNA FOTO</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <div className="space-y-2">
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp"
                  disabled={isExtracting}
                  className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-900 file:text-zinc-300 hover:file:bg-zinc-800 file:cursor-pointer transition-colors"
                />
              </div>

              <button 
                onClick={mockExtract}
                disabled={isExtracting}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white font-bold tracking-wider uppercase py-3 rounded-md transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:shadow-none mt-auto"
              >
                {isExtracting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cpu className="h-5 w-5" />}
                {isExtracting ? 'Analizando...' : 'Procesar con IA'}
              </button>
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-bold text-white tracking-wider uppercase">Previsualización de Estructura</h3>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              {!extractedData ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-lg p-6 bg-black/20">
                  <Cpu className="h-12 w-12 text-zinc-700 mb-4" />
                  <p className="text-sm text-zinc-500 text-center font-medium">
                    La IA extraerá el cliente, los productos y las cantidades automáticamente desde el texto o la imagen.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Match Info */}
                  <div className="bg-black/40 border border-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente Detectado:</span>
                      <span className="text-sm font-medium text-white">{extractedData.client_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Match en BD:</span>
                      <span className="text-sm font-bold text-green-400 bg-green-950/30 px-2 py-0.5 rounded border border-green-900/50">
                        {extractedData.matched_client_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Ref. OCR:</span>
                      <span className="text-sm text-zinc-300 font-mono">{extractedData.invoice_number}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-white/5 rounded-lg overflow-hidden bg-black/40 flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                          <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Producto (Detección / Match)</th>
                          <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Cant.</th>
                          <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Precio Ref.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {extractedData.items.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="p-3">
                              <p className="text-xs text-zinc-400 italic mb-0.5">"{item.product_name}"</p>
                              <p className="text-xs font-bold text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {item.matched_product_name}
                              </p>
                            </td>
                            <td className="p-3 text-right font-black text-white">{item.quantity_boxes}</td>
                            <td className="p-3 text-right text-sm text-zinc-400 font-mono">{formatCurrency(item.matched_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black font-black tracking-wider uppercase py-3 rounded-md transition-colors mt-auto">
                    <Save className="h-5 w-5" />
                    Guardar Pedido
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'excel' && (
        <div className="bg-zinc-950/60 border border-white/5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <div className="h-20 w-20 bg-blue-950/30 border border-blue-900/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] text-blue-500 rounded-full flex items-center justify-center">
            <FileText className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-widest uppercase">Carga Masiva</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Descarga la plantilla Excel, complétala con la estructura requerida y súbela para importar clientes, productos o presupuestos de forma masiva.
            </p>
          </div>
          <button className="px-6 py-3 rounded-md bg-zinc-900 border border-white/10 text-sm font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition-colors">
            Descargar Plantilla CSV
          </button>
        </div>
      )}
    </div>
  );
};
