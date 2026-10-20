import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';
import { campoService } from './campoService';

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
    name: 'Grecia (Coordinación Trade Marketing)',
    email: 'Grecia01@codizulca.com',
    passwordHint: 'Codi.02',
    roleKey: 'trade_marketing',
    roleLabel: 'Coordinadora Trade Marketing',
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
  if (
    emailNorm.includes('grecia') ||
    emailNorm.includes('trade') ||
    (role || '').toLowerCase().includes('trade') ||
    (role || '').toLowerCase().includes('coordinador')
  ) {
    return DASHBOARD_CORPORATE_PROFILES[2]; // Coordinación Trade Marketing (Grecia)
  }
  if (emailNorm.includes('johnatan')) {
    return DASHBOARD_CORPORATE_PROFILES[3];
  }
  if (emailNorm.includes('ali.perez')) {
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

  // Perfil sin asignar: acceso mínimo (NUNCA se concede Administrador General por defecto)
  return {
    id: 'CORP-NA',
    name: email ? email.split('@')[0] : 'Usuario sin perfil',
    email: email || '',
    passwordHint: '',
    roleKey: 'vendedor',
    roleLabel: 'Perfil sin asignar',
    zone: 'Sin zona asignada',
    canViewTrazabilidad: false,
    modules: ['Resumen Ejecutivo'],
  };
}

/**
 * Módulos del Dashboard protegidos por perfil. Cada ruta exige que el módulo figure en la lista
 * `modules` del perfil corporativo asignado. Trazabilidad se valida aparte (checkCanAccessTrazabilidad).
 */
const ROUTE_MODULE_RULES: Array<{ prefix: string; module: string }> = [
  { prefix: '/dashboard/cuotas', module: 'Cuotas & Metas' },
  { prefix: '/dashboard/ventas', module: 'Ventas & Facturación' },
  { prefix: '/dashboard/clientes', module: 'Clientes & Geocercas' },
  { prefix: '/dashboard/geofence-review', module: 'Clientes & Geocercas' },
  { prefix: '/dashboard/productos', module: 'Catálogo de Productos' },
  { prefix: '/dashboard/inventario', module: 'Inventario & Stock' },
  { prefix: '/dashboard/trade', module: 'Trade Marketing (IA)' },
];

export function canAccessModule(profile: Pick<DashboardCorporateProfile, 'modules'>, moduleName: string): boolean {
  return profile.modules.includes(moduleName);
}

export function canAccessDashboardRoute(
  profile: Pick<DashboardCorporateProfile, 'modules'>,
  pathname: string
): boolean {
  const path = pathname.replace(/\/+$/, '').toLowerCase();
  const rule = ROUTE_MODULE_RULES.find((r) => path === r.prefix || path.startsWith(r.prefix + '/'));
  if (!rule) return true;
  return canAccessModule(profile, rule.module);
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

const NO_PROFILE_DEFAULT = resolveCorporateProfile(null, null);

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  corporateProfile: NO_PROFILE_DEFAULT,
  canAccessTrazabilidad: false,
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
      // Una sesión de Supabase heredada SIN perfil corporativo asignado no concede acceso:
      // cada usuario debe iniciar sesión y recibir su propio perfil.
      let hasAssignedProfile = false;
      try {
        hasAssignedProfile = Boolean(localStorage.getItem(STORAGE_KEY_DASHBOARD_PROFILE));
      } catch {
        hasAssignedProfile = false;
      }
      if (session?.user && !hasAssignedProfile) {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

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
    // Cerrar también la sesión de Codizulca Campo para no dejar perfiles activos al salir
    try {
      campoService.logoutPromoter();
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
  };

  // El perfil asignado en el inicio de sesión es la única fuente de identidad y permisos.
  // Sin perfil asignado NO existe sesión válida (no se concede Administrador General por defecto).
  const corporateProfile = storedCorpProfile
    ? storedCorpProfile
    : resolveCorporateProfile(user?.email, profile?.role);

  const effectiveUser: User | null = storedCorpProfile
    ? ({
        ...(user ?? {}),
        id: user?.id ?? storedCorpProfile.id,
        email: storedCorpProfile.email,
        app_metadata: user?.app_metadata ?? {},
        user_metadata: {
          ...(user?.user_metadata ?? {}),
          full_name: storedCorpProfile.name,
          role: storedCorpProfile.roleLabel,
        },
        aud: user?.aud ?? 'authenticated',
        created_at: user?.created_at ?? new Date().toISOString(),
      } as User)
    : null;

  const canAccessTrazabilidad = effectiveUser
    ? checkCanAccessTrazabilidad({
        role: storedCorpProfile?.roleLabel || corporateProfile.roleLabel,
        email: storedCorpProfile?.email || corporateProfile.email,
        fullName: storedCorpProfile?.name || corporateProfile.name,
      })
    : false;

  return (
    <AuthContext.Provider value={{ session, user: effectiveUser, profile, corporateProfile, canAccessTrazabilidad, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
