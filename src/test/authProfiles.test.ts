import { describe, it, expect } from 'vitest';
import {
  DASHBOARD_CORPORATE_PROFILES,
  canAccessDashboardRoute,
  canAccessModule,
  checkCanAccessTrazabilidad,
  resolveCorporateProfile,
} from '../lib/auth';

describe('Perfiles asignados: nadie entra como Administrador General por defecto', () => {
  it('un correo desconocido recibe un perfil sin asignar con acceso mínimo (no admin)', () => {
    const p = resolveCorporateProfile('alguien.desconocido@correo.com');
    expect(p.roleKey).not.toBe('admin');
    expect(p.roleLabel).toBe('Perfil sin asignar');
    expect(p.canViewTrazabilidad).toBe(false);
    expect(p.modules).toEqual(['Resumen Ejecutivo']);
  });

  it('sin correo ni rol tampoco se concede Administrador General', () => {
    expect(resolveCorporateProfile(null, null).roleKey).not.toBe('admin');
    expect(resolveCorporateProfile('', '').roleKey).not.toBe('admin');
  });

  it('un correo que solo contiene "ali" (ej. valeria) no hereda el perfil de Ali Perez', () => {
    expect(resolveCorporateProfile('valeria@correo.com').roleLabel).toBe('Perfil sin asignar');
    expect(resolveCorporateProfile('ali.perez@codizulca.com').roleLabel).toBe('Supervisor Comercial');
  });

  it('cada perfil oficial se resuelve por su correo exacto', () => {
    expect(resolveCorporateProfile('admin@codi.com').roleKey).toBe('admin');
    expect(resolveCorporateProfile('gerencia@codizulca.com').roleKey).toBe('gerente_nacional');
    expect(resolveCorporateProfile('Grecia01@codizulca.com').roleKey).toBe('trade_marketing');
    expect(resolveCorporateProfile('johnatan.soto@codizulca.com').roleKey).toBe('supervisor');
  });

  it('el perfil sin asignar no puede ver Trazabilidad', () => {
    const p = resolveCorporateProfile('x@y.com');
    expect(checkCanAccessTrazabilidad({ role: p.roleLabel, email: p.email, fullName: p.name })).toBe(false);
  });
});

describe('Acceso a módulos del Dashboard según el perfil asignado', () => {
  const byKey = (k: string) => DASHBOARD_CORPORATE_PROFILES.find((p) => p.roleKey === k)!;

  it('la Coordinadora de Trade Marketing solo accede a sus módulos', () => {
    const trade = byKey('trade_marketing');
    expect(canAccessDashboardRoute(trade, '/dashboard')).toBe(true);
    expect(canAccessDashboardRoute(trade, '/dashboard/trade')).toBe(true);
    expect(canAccessDashboardRoute(trade, '/dashboard/productos')).toBe(true);
    expect(canAccessDashboardRoute(trade, '/dashboard/inventario')).toBe(true);
    expect(canAccessDashboardRoute(trade, '/dashboard/cuotas')).toBe(false);
    expect(canAccessDashboardRoute(trade, '/dashboard/ventas')).toBe(false);
    expect(canAccessDashboardRoute(trade, '/dashboard/clientes')).toBe(false);
  });

  it('los supervisores no acceden a Inventario ni al Portal Móvil', () => {
    const sup = byKey('supervisor');
    expect(canAccessDashboardRoute(sup, '/dashboard/cuotas')).toBe(true);
    expect(canAccessDashboardRoute(sup, '/dashboard/inventario')).toBe(false);
    expect(canAccessModule(sup, 'Portal Móvil PWA')).toBe(false);
  });

  it('Administrador General y Gerente Nacional acceden a todos los módulos', () => {
    for (const key of ['admin', 'gerente_nacional']) {
      const p = byKey(key);
      for (const route of ['cuotas', 'ventas', 'clientes', 'productos', 'inventario', 'trade', 'geofence-review']) {
        expect(canAccessDashboardRoute(p, `/dashboard/${route}`)).toBe(true);
      }
    }
  });

  it('el perfil sin asignar solo accede al Resumen Ejecutivo', () => {
    const none = resolveCorporateProfile('x@y.com');
    expect(canAccessDashboardRoute(none, '/dashboard')).toBe(true);
    expect(canAccessDashboardRoute(none, '/dashboard/trade')).toBe(false);
    expect(canAccessDashboardRoute(none, '/dashboard/ventas')).toBe(false);
  });
});
