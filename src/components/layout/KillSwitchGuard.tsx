import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { AlertTriangle } from 'lucide-react';

type SystemSettings = Database['public']['Tables']['system_settings']['Row'];

export const KillSwitchGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState<string | null>('Mantenimiento programado');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (data) {
        const settings = data as SystemSettings;
        setIsActive(settings.kill_switch_active);
        setMessage(settings.kill_switch_message);
      }
      setIsLoading(false);
    };

    fetchSettings();

    // Subscribe to changes in system_settings using Realtime
    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
        },
        (payload) => {
          const newData = payload.new as SystemSettings;
          setIsActive(newData.kill_switch_active);
          setMessage(newData.kill_switch_message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600"></div>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="flex max-w-md flex-col items-center space-y-4 rounded-xl border border-red-100 bg-red-50 p-8 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-red-900">Sistema Suspendido</h1>
          <p className="text-sm text-red-700">
            {message || 'La aplicación se encuentra en mantenimiento. Por favor intente más tarde.'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
