import React from 'react';
import { ShieldAlert, Users, Database, Settings2, Activity, Key, Save } from 'lucide-react';

export const Administracion: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 font-sans text-zinc-100 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          PANEL DE ADMINISTRACIÓN
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Configuración global del sistema, roles y acceso de seguridad.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Security & Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Kill Switch Card */}
          <div className="bg-zinc-950/60 border border-red-900/50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-4 border-b border-red-900/50 bg-red-950/20 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-red-500 tracking-wider uppercase">Seguridad (Kill Switch)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-400">
                Bloquea inmediatamente el acceso a todos los promotores y vendedores en caso de emergencia.
              </p>
              <div className="flex items-center justify-between p-4 bg-black/50 border border-white/5 rounded-lg">
                <div>
                  <p className="font-bold text-white uppercase text-sm">Estado del Sistema</p>
                  <p className="text-xs text-green-500 font-medium mt-1 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    Operativo
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-950/50 hover:bg-red-900 border border-red-900/50 text-red-500 hover:text-white rounded-md text-xs font-bold uppercase tracking-wider transition-colors">
                  Bloquear
                </button>
              </div>
            </div>
          </div>

          {/* System Config */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-zinc-400" />
              <h3 className="font-bold text-white tracking-wider uppercase">Parámetros</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Tasa de Cambio Oficial (BCV)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Bs.</span>
                  <input 
                    type="number" 
                    defaultValue="36.54"
                    className="w-full bg-black/50 border border-white/10 rounded-md pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Días de Gracia (Facturas)</label>
                <input 
                  type="number" 
                  defaultValue="30"
                  className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <button className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-bold tracking-wider uppercase py-2 rounded-md transition-colors text-xs flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Roles and Users */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-zinc-400" />
                <h3 className="font-bold text-white tracking-wider uppercase">Usuarios & Accesos</h3>
              </div>
              <button className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors uppercase tracking-wider">
                + Nuevo
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuario / Email</th>
                    <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol</th>
                    <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Último Acceso</th>
                    <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">Administrador Codi</p>
                      <p className="text-xs text-zinc-500">admin@codi.com</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border border-red-900/50 bg-red-950/30 text-red-500">
                        Admin
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">Hace 2 minutos</td>
                    <td className="p-4 text-right">
                      <button className="text-zinc-500 hover:text-white transition-colors">
                        <Key className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">Careliz Reyes</p>
                      <p className="text-xs text-zinc-500">REYESCARELIZ3@GMAIL.COM</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border border-blue-900/50 bg-blue-950/30 text-blue-400">
                        Impulsadora
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">Hace 1 hora</td>
                    <td className="p-4 text-right">
                      <button className="text-zinc-500 hover:text-white transition-colors">
                        <Key className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">Maria de los Ángeles Almarza</p>
                      <p className="text-xs text-zinc-500">Mariaalmarza16@gmail.com</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border border-green-900/50 bg-green-950/30 text-green-400">
                        Impulsadora
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">Hace 3 horas</td>
                    <td className="p-4 text-right">
                      <button className="text-zinc-500 hover:text-white transition-colors">
                        <Key className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
