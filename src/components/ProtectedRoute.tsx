import { Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

const ContaBloqueada = lazy(() => import("@/pages/ContaBloqueada"));

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, isSuperAdmin, isPasswordRecovery, isSubscriptionBlocked, dbUser, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isPasswordRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (dbUser && dbUser.empresa_ativo === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Empresa Desativada</h1>
          <p className="text-sm text-muted-foreground">
            O acesso da sua empresa foi desativado. Favor contatar o suporte para mais informações.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-4 px-6 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (isSubscriptionBlocked) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <ContaBloqueada />
      </Suspense>
    );
  }

  return <>{children}</>;
}
