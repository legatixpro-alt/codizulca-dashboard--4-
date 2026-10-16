import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { MapPin, Navigation, Layers, ChevronRight, CheckCircle2, Camera, PenTool } from 'lucide-react';
import { PWAInstallButton } from '../../components/ui/pwa-install-button';
import { useAuth } from '../../lib/auth';

export const PortalHome: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Activación por Rol Especializado o Parámetros de Enlace (/portal?role=merchandising&user=jose)
  useEffect(() => {
    const roleParam = searchParams.get('role');
    const isMerchandisingUser =
      roleParam?.toLowerCase() === 'merchandising' ||
      profile?.role === 'Promotor Merchandising';

    if (isMerchandisingUser) {
      navigate(`/portal/merchandising?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, profile, navigate]);

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-500 pb-6">
      <div className="flex flex-col mb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Hola, {profile?.full_name?.split(' ')[0] || 'Promotor'}</h2>
        <p className="text-sm text-gray-500 capitalize">{today}</p>
      </div>

      <div className="mb-4">
        <PWAInstallButton />
      </div>

      {/* Acceso Directo Prioritario al Submódulo de Merchandising */}
      <Link
        to={`/portal/merchandising${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
        className="block bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl p-4 text-white shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Layers className="w-5 h-5 text-white" />
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full font-bold">
                Rol Merchandising
              </span>
              <h3 className="font-black text-sm text-white mt-0.5">Certificación de Visita en PDV</h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </div>
        <p className="text-xs text-red-100 mt-2.5 leading-relaxed">
          Levantamiento de anaquel, checklist de labores, 6 fotos optimizadas y firma digital táctil del encargado.
        </p>
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-white/20 text-[11px] font-medium text-white/90">
          <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> 6 Fotos</span>
          <span className="flex items-center gap-1"><PenTool className="w-3.5 h-3.5" /> Firma Táctil</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Acta PDF</span>
        </div>
      </Link>

      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider pt-2">Ruta del Día</h3>
      
      <div className="space-y-3">
        {[
          { name: "ALKOSTO DONDE COMPRAR ES GANAR, C.A.", loc: "Av. Bella Vista, Calle 72" },
          { name: "Supermercado Olímpica", loc: "El Bajo, San Francisco" },
          { name: "Hipermercado Viviana", loc: "Bella Vista" }
        ].map((store, idx) => (
          <Card key={idx} className="border-gray-200 shadow-sm">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{store.name}</h4>
                  <p className="text-xs text-gray-500">{store.loc}</p>
                </div>
              </div>
              <Link
                to={`/portal/merchandising?store=${encodeURIComponent(store.name)}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Certificar Visita"
              >
                <Navigation className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
