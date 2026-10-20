import React from 'react';
import { useAuth } from '../../lib/auth';
import { Calendar, UserCircle, Menu, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';
import { CodiBotPillBadge } from '../chat/CodiBotWidget';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle }) => {
  const { profile, corporateProfile } = useAuth();
  
  // Optional: check kill switch to display badge if needed (or just rely on KillSwitchGuard)
  // For now, let's just show standard info.
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data: settings } = useSupabaseQuery(
    ['system_settings_topbar'],
    () => supabase.from('system_settings').select('*').limit(1).single(),
    {
      refetchInterval: 60000,
    }
  );

  const settingsRecord = settings as any;

  const handleOpenCodiBot = () => {
    window.dispatchEvent(new CustomEvent('open-codibot'));
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#0a0a0a] px-4 md:px-6">
      <div className="flex items-center gap-3 md:gap-4">
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 -ml-1.5 mr-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <div className="flex flex-col">
           <span className="hidden sm:block text-xs font-bold text-zinc-500 tracking-[0.2em] uppercase">SECTOR ASIGNADO</span>
           <div className="flex items-center gap-2 sm:mt-0.5">
             <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
             <span className="text-sm sm:text-base font-bold text-white tracking-wide">{corporateProfile?.zone || profile?.zone || 'Zulia Corporativo'}</span>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">

        <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
          <Badge variant="outline" className="bg-zinc-900/50 border-white/10 text-zinc-300 font-mono tracking-widest text-[10px] px-2 py-0.5 uppercase">
            Radar ON
          </Badge>
        </div>

        <div className="flex items-center gap-3 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-zinc-200 leading-none mb-1">
              {corporateProfile?.name || profile?.full_name || 'Usuario'}
            </p>
            <p className="text-xs text-red-500 font-medium tracking-wider uppercase leading-none">
              {corporateProfile?.roleLabel || profile?.role || 'Sin perfil'}
            </p>
          </div>
          {profile?.avatar_url && profile.full_name === corporateProfile?.name ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name} 
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <UserCircle className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-600" />
          )}
        </div>
      </div>
    </header>
  );
};
