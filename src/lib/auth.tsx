import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface DashboardCorporateProfile {
  id: string;
  name: string;
  email: string;
  passwordHint: string;
  roleKey: 'admin' | 'gerente_nacional' | 'trade_marketing' | 'supervisor' | 'vendedor';
  roleLabel: string;
  zone: string;
  canViewTrazabilidad: boolean;
  modules: string[];
}

export const DASHBOARD_CORPORATE_PROFILES: DashboardCorporateProfile[] = [
  {
    id: 'CORP-001',
    name: 'Administrador General',
    email: 'admin@codi.com',
    passwordHint: '123',
    roleKey: 'admin',
    roleLabel: 'Administrador General',
    zone: 'Nacional / Zulia Corporativo',
    canViewTrazabilidad: true,
    modules: ['Resumen Ejecutivo', 'Cuotas & Metas', 'Ventas & Facturación', 'Inventario & Stock', 'Clientes & Geocercas', 'Catálogo de Productos', 'Trade Marketing (IA)', 'Portal Móvil PWA', 'Trazabilidad (Exclusivo)'],
  },
  {
    id: 'CORP-002',
    name: 'Gerente Nacional',
    email: 'gerencia@codizulca.com',
    passwordHint: '123',
    roleKey: 'gerente_nacional',
    roleLabel: 'Gerente Nacional',
    zone: 'Nacional / Sede Central',
    canViewTrazabilidad: true,
    modules: ['Resumen Ejecutivo', 'Cuotas & Metas', 'Ventas & Facturación', 'Inventario & Stock', 'Clientes & Geocercas', 'Catálogo de Productos', 'Trade Marketing (IA)', 'Portal Móvil PWA', 'Trazabilidad (Exclusivo)'],
  },
  {
    id: 'CORP-003',
    name: 'Coordinación Trade Marketing',
    email: 'trademarketing@codizulca.com',
    passwordHint: '123',
    roleKey: 'trade_marketing',
    roleLabel: 'Coordinador Trade Marketing',
    zone: 'Zulia / Falcón',
    canViewTrazabilidad: false,
    modules: ['Resumen Ejecutivo', 'Trade Marketing (IA)', 'Catálogo de Productos', 'Inventario & Stock', 'Portal Móvil PWA'],
  },
  {
    id: 'CORP-004',
    name: 'Johnatan Soto',
    email: 'johnatan.soto@codizulca.com',
    passwordHint: '123',
    roleKey: 'supervisor',
    roleLabel: 'Supervisor Comercial',
    zone: 'Maracaibo / San Francisco / Sur del Lago',
    canViewTrazabilidad: false,
    modules: ['Resumen Ejecutivo', 'Cuotas & Metas', 'Ventas & Facturación', 'Clientes & Geocercas', 'Catálogo de Productos', 'Trade Marketing (IA)'],
  },
  {
    id: 'CORP-005',
    name: 'Ali Perez',
    email: 'ali.perez@codizulca.com',
    passwordHint: '123',
    roleKey: 'supervisor',
    roleLabel: 'Supervisor Comercial',
    zone: 'Costa Oriental del Lago (COL) / Falcón',
    canViewTrazabilidad: false,
    modules: ['Resumen Ejecutivo', 'Cuotas & Metas', 'Ventas & Facturación', 'Clientes & Geocercas', 'Catálogo de Productos', 'Trade Marketing (IA)'],
  },
];

export const STORAGE_KEY_DASHBOARD_PROFILE = 'codizulca_dashboard_profile';

/**
 * Valida estrictamente si un usuario/rol tiene permiso para ver el módulo de Trazabilidad.
 * Regla de negocio: SOLO el Gerente Nacional y el Administrador General pueden ver Trazabilidad.
 */
export function checkCanAccessTrazabilidad(input?: {
  role?: string | null;
  email?: string | null;
  fullName?: string | null;
} | null): boolean {
  if (!input) return false;

  const roleNorm = (input.role || '').trim().toLowerCase();
  const emailNorm = (input.email || '').trim().toLowerCase();
  const nameNorm = (input.fullName || '').trim().toLowerCase();

  // Exclusión explícita de roles no autorizados (Supervisores, Trade Marketing, Vendedores, Promotoras, Merchandising)
  const forbiddenKeywords = [
    'supervisor',
    'vendedor',
    'promotor',
    'promotora',
    'merchandising',
    'impulsadora',
    'trade',
    'coordinador',
    'almacen',
    'facturacion',
  ];
  if (forbiddenKeywords.some((kw) => roleNorm.includes(kw))) {
    return false;
  }

  // Roles explícitamente autorizados: Administrador General y Gerente Nacional
  const allowedRoles = [
    'admin',
    'administrador',
    'administrador general',
    'gerente nacional',
    'gerente_nacional',
    'gerencia nacional',
  ];
  if (allowedRoles.includes(roleNorm)) {
    return true;
  }

  // Correos corporativos autorizados de Administrador General y Gerente Nacional
  const allowedEmails = [
    'admin@codi.com',
    'admin@codizulca.com',
    'gerencia@codizulca.com',
    'gerente.nacional@codizulca.com',
    'gerente@codi.com',
  ];
  if (allowedEmails.includes(emailNorm)) {
    return true;
  }

  if (nameNorm === 'administrador general' || nameNorm === 'gerente nacional' || nameNorm === 'admin general') {
    return true;
  }

  return false;
}

export function resolveCorporateProfile(email?: string | null, role?: string | null): DashboardCorporateProfile {
  const emailNorm = (email || '').trim().toLowerCase();
  const byEmail = DASHBOARD_CORPORATE_PROFILES.find((p) => p.email.toLowerCase() === emailNorm);
  if (byEmail) return byEmail;

  if (emailNorm.includes('gerente') || emailNorm.includes('gerencia') || (role || '').toLowerCase().includes('gerente nacional')) {
    return DASHBOARD_CORPORATE_PROFILES[1]; // Gerente Nacional
  }
  if (emailNorm.includes('trade') || (role || '').toLowerCase().includes('trade')) {
    return DASHBOARD_CORPORATE_PROFILES[2]; // Coordinación Trade Marketing
  }
  if (emailNorm.includes('johnatan')) {
    return DASHBOARD_CORPORATE_PROFILES[3];
  }
  if (emailNorm.includes('ali')) {
    return DASHBOARD_CORPORATE_PROFILES[4];
  }
  if ((role || '').toLowerCase().includes('supervisor')) {
    return {
      id: 'CORP-SUP',
      name: email ? email.split('@')[0] : 'Supervisor Comercial',
      email: email || 'supervisor@codizulca.com',
      passwordHint: '123',
      roleKey: 'supervisor',
      roleLabel: 'Supervisor Comercial',
      zone: 'Zulia',
      canViewTrazabilidad: false,
      modules: ['Resumen Ejecutivo', 'Cuotas & Metas', 'Ventas & Facturación', 'Clientes & Geocercas', 'Catálogo de Productos', 'Trade Marketing (IA)'],
    };
  }

  return DASHBOARD_CORPORATE_PROFILES[0]; // Administrador General por defecto para admin@codi.com
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  corporateProfile: DashboardCorporateProfile;
  canAccessTrazabilidad: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  corporateProfile: DASHBOARD_CORPORATE_PROFILES[0],
  canAccessTrazabilidad: true,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedCorpProfile, setStoredCorpProfile] = useState<DashboardCorporateProfile | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD_PROFILE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncLocalCorpProfile = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD_PROFILE);
        setStoredCorpProfile(raw ? JSON.parse(raw) : null);
      } catch {
        setStoredCorpProfile(null);
      }
    };
    window.addEventListener('codizulca_dashboard_profile_changed', syncLocalCorpProfile);

    // SessionManager logic: Get initial session and subscribe to changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('codizulca_dashboard_profile_changed', syncLocalCorpProfile);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_DASHBOARD_PROFILE);
      setStoredCorpProfile(null);
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
  };

  const corporateProfile = storedCorpProfile
    ? storedCorpProfile
    : resolveCorporateProfile(user?.email, profile?.role);

  const canAccessTrazabilidad = checkCanAccessTrazabilidad({
    role: storedCorpProfile?.roleLabel || profile?.role || corporateProfile.roleLabel,
    email: storedCorpProfile?.email || user?.email || corporateProfile.email,
    fullName: storedCorpProfile?.name || profile?.full_name || corporateProfile.name,
  });

  return (
    <AuthContext.Provider value={{ session, user, profile, corporateProfile, canAccessTrazabilidad, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
