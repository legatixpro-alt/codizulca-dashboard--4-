/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { AuthGuard } from './components/layout/AuthGuard';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { DashboardOverview } from './pages/DashboardOverview';
import { Cuotas } from './pages/Cuotas';
import { Ventas } from './pages/Ventas';
import { Clientes } from './pages/Clientes';
import { Productos } from './pages/Productos';
import { Inventario } from './pages/Inventario';
import { TradeMarketing } from './pages/TradeMarketing';
import { GeofenceReview } from './pages/GeofenceReview';
import { Administracion } from './pages/Administracion';
import { Trazabilidad } from './pages/Trazabilidad';
import { CampoLayout } from './components/layout/CampoLayout';
import { PortalLogin } from './pages/mobile/PortalLogin';
import { CampoRuta } from './pages/mobile/CampoRuta';
import { CampoAsistencia } from './pages/mobile/CampoAsistencia';
import { CampoEncuestas } from './pages/mobile/CampoEncuestas';
import { CampoPrecios } from './pages/mobile/CampoPrecios';
import { CampoInventario } from './pages/mobile/CampoInventario';
import { CampoMerchandising } from './pages/mobile/CampoMerchandising';
import { PortalPerfil } from './pages/mobile/PortalPerfil';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

            {/* Codizulca Campo PWA Mobile Portal Routes */}
            <Route path="/portal" element={<CampoLayout />}>
              <Route index element={<Navigate to="/portal/ruta" replace />} />
              <Route path="ruta" element={<CampoRuta />} />
              <Route path="checkin" element={<CampoAsistencia />} />
              <Route path="asistencia" element={<CampoAsistencia />} />
              <Route path="encuestas" element={<CampoEncuestas />} />
              <Route path="precios" element={<CampoPrecios />} />
              <Route path="inventario" element={<CampoInventario />} />
              <Route path="merchandising" element={<CampoMerchandising />} />
              <Route path="perfil" element={<PortalPerfil />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
