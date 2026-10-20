/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { AuthGuard } from './components/layout/AuthGuard';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { CampoLayout } from './components/layout/CampoLayout';
import { PortalLogin } from './pages/mobile/PortalLogin';

const DashboardOverview = lazy(() => import('./pages/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const Cuotas = lazy(() => import('./pages/Cuotas').then(m => ({ default: m.Cuotas })));
const Ventas = lazy(() => import('./pages/Ventas').then(m => ({ default: m.Ventas })));
const Clientes = lazy(() => import('./pages/Clientes').then(m => ({ default: m.Clientes })));
const Productos = lazy(() => import('./pages/Productos').then(m => ({ default: m.Productos })));
const Inventario = lazy(() => import('./pages/Inventario').then(m => ({ default: m.Inventario })));
const TradeMarketing = lazy(() => import('./pages/TradeMarketing').then(m => ({ default: m.TradeMarketing })));
const GeofenceReview = lazy(() => import('./pages/GeofenceReview').then(m => ({ default: m.GeofenceReview })));
const Trazabilidad = lazy(() => import('./pages/Trazabilidad').then(m => ({ default: m.Trazabilidad })));

const CampoRuta = lazy(() => import('./pages/mobile/CampoRuta').then(m => ({ default: m.CampoRuta })));
const CampoAsistencia = lazy(() => import('./pages/mobile/CampoAsistencia').then(m => ({ default: m.CampoAsistencia })));
const CampoEncuestas = lazy(() => import('./pages/mobile/CampoEncuestas').then(m => ({ default: m.CampoEncuestas })));
const CampoInventario = lazy(() => import('./pages/mobile/CampoInventario').then(m => ({ default: m.CampoInventario })));
const CampoMerchandising = lazy(() => import('./pages/mobile/CampoMerchandising').then(m => ({ default: m.CampoMerchandising })));
const PortalPerfil = lazy(() => import('./pages/mobile/PortalPerfil').then(m => ({ default: m.PortalPerfil })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] text-zinc-400 text-sm">
    Cargando módulo...
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Login de Administración / Gerencia */}
            <Route path="/login" element={<Login />} />
            
            {/* Login Móvil Oficial para Promotoras e Impulsadoras de Campo */}
            <Route path="/portal/login" element={<PortalLogin />} />

            <Route element={<AuthGuard />}>
              <Route path="/dashboard" element={<MainLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="cuotas" element={<Cuotas />} />
                <Route path="ventas" element={<Ventas />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="productos" element={<Productos />} />
                <Route path="inventario" element={<Inventario />} />
                <Route path="trade" element={<TradeMarketing />} />
                <Route path="geofence-review" element={<GeofenceReview />} />
                <Route path="trazabilidad" element={<Trazabilidad />} />
                <Route path="admin" element={<Trazabilidad />} />
              </Route>
            </Route>

            {/* Codizulca Campo PWA Mobile Portal Routes (CampoLayout valida su propia sesión y redirige a /portal/login) */}
            <Route path="/portal" element={<CampoLayout />}>
              <Route index element={<Navigate to="/portal/ruta" replace />} />
              <Route path="ruta" element={<CampoRuta />} />
              <Route path="checkin" element={<CampoAsistencia />} />
              <Route path="asistencia" element={<CampoAsistencia />} />
              <Route path="encuestas" element={<CampoEncuestas />} />
              <Route path="precios" element={<Navigate to="/portal/ruta" replace />} />
              <Route path="inventario" element={<CampoInventario />} />
              <Route path="merchandising" element={<CampoMerchandising />} />
              <Route path="perfil" element={<PortalPerfil />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
