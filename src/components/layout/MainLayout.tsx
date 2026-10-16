import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { KillSwitchGuard } from './KillSwitchGuard';
import { X } from 'lucide-react';
import { CodiBotWidget } from '../chat/CodiBotWidget';

export const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <KillSwitchGuard>
      <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden text-zinc-100 font-sans relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Overlay & Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-72 max-w-[80vw] flex-col bg-[#0a0a0a] animate-in slide-in-from-left duration-300 shadow-2xl">
              <Sidebar />
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 p-2 bg-black/50 rounded-full text-zinc-400 hover:text-white transition-colors border border-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden w-full relative z-0">
          <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#050505]">
            <Outlet />
          </main>
        </div>

        {/* Global CodiBot Assistant */}
        <CodiBotWidget />
      </div>
    </KillSwitchGuard>
  );
};
