import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Camera, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';

export const PortalAuditoria: React.FC = () => {
  const { profile } = useAuth();
  const [surveyType, setSurveyType] = useState<'breve' | 'profunda' | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Form State
  const [responses, setResponses] = useState({
    stock_status: '',
    competitor_presence: '',
    pos_material_condition: '',
    comments: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      const { error } = await supabase.from('surveys').insert({
        promoter_id: profile?.id || 'PROMOTER-LIVE',
        client_id: profile?.id || 'PDV-DEFAULT',
        survey_type: surveyType || 'breve',
        responses: responses,
        offline_created_at: new Date().toISOString()
      } as any);

      if (error) throw error;

      setStatus('success');
      setMessage('Auditoría guardada exitosamente.');
      setSurveyType(null); // Reset form
      setResponses({ stock_status: '', competitor_presence: '', pos_material_condition: '', comments: '' });
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage('Error al guardar la auditoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 pb-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Auditoría / Encuestas</h2>
        <p className="text-sm text-gray-500">Recopilación de información del PDV.</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {!surveyType ? (
        <div className="grid gap-4">
          <Card className="cursor-pointer hover:border-primary-500 transition-colors" onClick={() => setSurveyType('breve')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Encuesta Breve</h3>
                <p className="text-xs text-gray-500">Revisión rápida de stock y precios principales.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary-500 transition-colors" onClick={() => setSurveyType('profunda')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Camera className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Auditoría Profunda</h3>
                <p className="text-xs text-gray-500">Share of shelf, material POP y análisis visual.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">
                {surveyType === 'breve' ? 'Encuesta Breve' : 'Auditoría Profunda'}
              </h3>
              <button 
                onClick={() => setSurveyType(null)}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Volver
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Nivel de Stock (Estimado)</Label>
                <select 
                  id="stock"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={responses.stock_status}
                  onChange={(e) => setResponses({...responses, stock_status: e.target.value})}
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="alto">Alto (Anaqueles llenos)</option>
                  <option value="medio">Medio (Normal)</option>
                  <option value="bajo">Bajo (Requiere reposición)</option>
                  <option value="quiebre">Quiebre (Out of Stock)</option>
                </select>
              </div>

              {surveyType === 'profunda' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pos">Estado del Material POP</Label>
                    <select 
                      id="pos"
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={responses.pos_material_condition}
                      onChange={(e) => setResponses({...responses, pos_material_condition: e.target.value})}
                    >
                      <option value="">Seleccione...</option>
                      <option value="excelente">Excelente / Nuevo</option>
                      <option value="bueno">Bueno / Aceptable</option>
                      <option value="deteriorado">Deteriorado</option>
                      <option value="ausente">No hay material POP</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <Label>Evidencia Fotográfica (Anaquel)</Label>
                    <Button type="button" variant="outline" className="w-full gap-2 border-dashed border-2">
                      <Camera className="h-4 w-4" />
                      Tomar Foto
                    </Button>
                    <p className="text-[10px] text-gray-500 mt-1">La foto será enviada para análisis de IA (Share of Shelf).</p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="comments">Comentarios / Observaciones</Label>
                <Input 
                  id="comments"
                  placeholder="Novedades de la competencia..."
                  value={responses.comments}
                  onChange={(e) => setResponses({...responses, comments: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Auditoría'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
