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
import { campoService, PROMOTERS_LIST, TRADE_COORDINATOR_PROFILE, PromoterProfile } from '../../lib/campoService';
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

  useEffect(() => {
    // Si viene parámetro en URL (?user=... o ?email=...)
    const emailParam = searchParams.get('email');
    const userParam = searchParams.get('user') || searchParams.get('promoter');

    if (emailParam) {
      setEmail(emailParam);
    } else if (userParam) {
      if (userParam.toLowerCase().includes('grecia') || userParam.toLowerCase().includes('coordinador')) {
        setEmail(TRADE_COORDINATOR_PROFILE.email);
      } else {
        const match = PROMOTERS_LIST.find(p => p.name.toLowerCase().includes(userParam.toLowerCase()));
        if (match) {
          setEmail(match.email);
        }
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
        // Registrar conexión con telemetría GPS e IP real (sin bloquear la navegación)
        trazabilidadService.logConnection({
          name: result.promoter.name,
          email: result.promoter.email,
          role: result.promoter.role,
          photoUrl: result.promoter.photoUrl
        }, true);
        navigate('/portal/ruta', { replace: true });
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas.');
        trazabilidadService.logFailedLogin({
          email,
          role: 'Promotora / Impulsadora',
          details: result.error || 'Contraseña o correo inválido',
          module: 'Portal Campo (PWA)'
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de conexión al iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between font-sans selection:bg-red-600 selection:text-white px-4 py-8 relative overflow-hidden">
      
      {/* Luces de Fondo y Acento Neón */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-rose-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Cabecera Principal */}
      <div className="w-full max-w-[420px] mx-auto z-10 space-y-6 my-auto">
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
              Acceso Personal para Coordinación, Promotoras e Impulsadoras
            </p>
          </div>
        </div>

        {/* Tarjeta de Formulario Personal */}
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
                <span>Correo Electrónico Asignado</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo electrónico personal"
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
              <span>{isSubmitting ? 'Validando Credenciales...' : 'Ingresar a la App'}</span>
            </button>
          </form>
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
