import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { campoService, PROMOTERS_LIST, PromoterProfile } from '../../lib/campoService';
import { staffService, StaffMember } from '../../lib/staffService';
import { trazabilidadService } from '../../lib/trazabilidadService';

export const PortalLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickSelector, setShowQuickSelector] = useState(false);
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Cargar lista actualizada de promotoras para el selector rápido
  useEffect(() => {
    staffService.getAll().then((data) => {
      if (data && data.length > 0) {
        setStaffList(data);
      }
    }).catch(() => {
      // fallback
    });

    // Si viene parámetro en URL (?user=... o ?email=...)
    const emailParam = searchParams.get('email');
    const userParam = searchParams.get('user') || searchParams.get('promoter');

    if (emailParam) {
      setEmail(emailParam);
    } else if (userParam) {
      const match = PROMOTERS_LIST.find(p => p.name.toLowerCase().includes(userParam.toLowerCase()));
      if (match) {
        setEmail(match.email);
      }
    }
  }, [searchParams]);

  // Si ya está autenticado, redirigir directo a la ruta
  useEffect(() => {
    if (campoService.isAuthenticatedPromoter()) {
      navigate('/portal/ruta', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await campoService.loginPromoter(email, password);
      if (result.success && result.promoter) {
        trazabilidadService.logConnection({
          name: result.promoter.name,
          email: result.promoter.email,
          role: result.promoter.role,
          photoUrl: result.promoter.photoUrl
        }, true);
        navigate('/portal/ruta', { replace: true });
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas.');
        trazabilidadService.logEvent({
          user: {
            name: email.split('@')[0] || 'Desconocido',
            email,
            role: 'Promotora / Impulsadora'
          },
          action: {
            type: 'failed_login',
            label: 'Intento de Acceso Rechazado en App Móvil',
            details: result.error || 'Contraseña o correo inválido',
            status: 'warning',
            module: 'Portal Campo (PWA)'
          },
          device: {
            ip: '186.93.' + Math.floor(Math.random() * 200 + 10) + '.45',
            browser: 'Chrome Mobile 128.0',
            os: 'Android 14',
            deviceType: 'Móvil',
            connection: '4G LTE (Móvil)',
            locationCity: 'Maracaibo, Zulia',
            gpsVerified: true
          }
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de conexión al iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickPromoter = (p: StaffMember | PromoterProfile) => {
    setEmail(p.email);
    setPassword(p.password || 'codi123');
    setShowQuickSelector(false);
  };

  const filteredQuickList = (staffList.length > 0 ? staffList : PROMOTERS_LIST).filter(p => {
    if (!quickSearchTerm.trim()) return true;
    const term = quickSearchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || (p.email && p.email.toLowerCase().includes(term)) || (p.role && p.role.toLowerCase().includes(term));
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between font-sans selection:bg-red-600 selection:text-white px-4 py-8 relative overflow-hidden">
      
      {/* Luces de Fondo y Acento Neón */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-rose-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="w-full max-w-[420px] mx-auto z-10 space-y-6">
        <div className="text-center space-y-3">
          {/* Logo animado */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center relative">
            <img 
              src="https://i.postimg.cc/W19QG233/logo.jpg" 
              alt="Codizulca Logo" 
              className="h-full w-full rounded-2xl object-cover shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 border-red-600/80"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
              Trade Marketing & Campo
            </span>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mt-1.5 flex items-center justify-center gap-1.5">
              <span>Codizulca</span>
              <span className="text-red-500">Campo</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Acceso Exclusivo para Promotoras e Impulsadoras
            </p>
          </div>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-[#121316]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Error Feedback */}
          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong>Error de Acceso:</strong> {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Campo Correo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span>Correo Electrónico Registrado</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. scarmichell22@gmail.com"
                  className="w-full bg-[#1a1b1f] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-red-500" />
                  <span>Contraseña</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Default: codi123
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1b1f] border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Botón Principal Iniciar Sesión */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Validando Perfil...' : 'Ingresar a la App'}</span>
            </button>
          </form>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-mono uppercase">
              O Selección Rápida
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Botón de Selector Rápido de Perfiles */}
          <div>
            <button
              type="button"
              onClick={() => setShowQuickSelector(!showQuickSelector)}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                <span>Seleccionar mi Perfil de la Lista</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {showQuickSelector ? 'Ocultar ▲' : 'Ver 22 Perfiles ▼'}
              </span>
            </button>

            {/* Lista Desplegable Rápida */}
            {showQuickSelector && (
              <div className="mt-3 p-3 bg-black/60 border border-white/10 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickSearchTerm}
                    onChange={(e) => setQuickSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o zona..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#17181c] border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredQuickList.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectQuickPromoter(p)}
                      className="w-full p-2 rounded-lg bg-[#141518] hover:bg-red-950/40 hover:border-red-500/40 border border-white/5 flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-bold text-white group-hover:text-red-400 truncate">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">
                            {p.email} • {p.role}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-1.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Información y Validación del Sistema */}
          <div className="bg-[#17181c] border border-white/5 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validación de Perfil & Degustaciones</span>
            </div>
            <p className="leading-tight">
              Al iniciar sesión, el sistema cargará automáticamente tu cronograma de degustaciones, metas por PDV y registro de asistencia.
            </p>
          </div>
        </div>

        {/* Acceso para Administradores / Coordinadores */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="text-xs text-zinc-500 hover:text-zinc-300 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <span>¿Eres Coordinador o Gerente? Ir a Portal Gerencia</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-zinc-600 font-mono mt-6">
        Codizulca Trade Marketing • Sistema de Promoción y Campo 2026
      </div>
    </div>
  );
};
