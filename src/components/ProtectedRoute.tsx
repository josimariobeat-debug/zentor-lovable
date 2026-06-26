import { Navigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { ReactNode } from 'react';

export default function ProtectedRoute({ children }: {children: ReactNode;}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div data-ev-id="ev_cffee3ed3e" className="min-h-screen grid place-items-center text-neutral-500 text-sm">
        <div data-ev-id="ev_f4ed649d4d" className="flex flex-col items-center gap-3">
          <div data-ev-id="ev_65bbac37bd" className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          Carregando…
        </div>
      </div>);

  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}