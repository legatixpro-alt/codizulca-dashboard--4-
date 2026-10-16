import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export const AuthGuard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600"></div>
          <p className="text-sm font-medium text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // TEMPORARY: Bypass login screen while editing
    // return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
