import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { MapPin, CheckSquare, Layers, ClipboardList, UserCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { OfflineIndicator } from '../ui/offline-indicator';

export const MobileLayout: React.FC = () => {
  const { profile } = useAuth();

  const navItems = [
    { to: '/portal', icon: MapPin, label: 'Ruta', end: true },
    { to: '/portal/checkin', icon: CheckSquare, label: 'Check-In' },
    { to: '/portal/merchandising', icon: Layers, label: 'Merchandising' },
    { to: '/portal/encuestas', icon: ClipboardList, label: 'Auditoría' },
    { to: '/portal/perfil', icon: UserCircle, label: 'Perfil' }
  ];

  return (
    <div className="flex h-screen flex-col bg-gray-50 overflow-hidden">
      <OfflineIndicator />
      
      {/* Header */}
      <header className="flex h-14 items-center justify-center border-b border-gray-200 bg-white px-4 shadow-sm shrink-0 z-10">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">Codizulca Portal</h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16 relative">
        <div className="mx-auto max-w-md w-full h-full p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-gray-200 bg-white pb-safe z-20">
        <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
                  isActive ? "text-primary-600" : "text-gray-500 hover:text-gray-900"
                )
              }
            >
              <item.icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
