import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";

export interface DbUser {
  id: number;
  email: string;
  nome: string | null;
  status: string;
  plano?: string;
  role: string | null;
  empresa_id: number | null;
  avatar_url: string | null;
  telefone: string | null;
  onboarding_video_watched: boolean;
  empresa_ativo?: boolean;
  empresa_nome?: string | null;
  assinatura_status?: string | null;
  assinatura_vencimento?: string | null;
  fatura_url?: string | null;
}

interface AuthSession {
  userId: number;
  email: string;
}

interface AuthContextType {
  session: AuthSession | null;
  authUser: AuthSession | null;
  dbUser: DbUser | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSubscriptionBlocked: boolean;
  /** Super admin optou por visualizar as telas da plataforma (fora do backoffice). */
  platformPreview: boolean;
  enterPlatformPreview: () => void;
  exitPlatformPreview: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Flag (por aba) que libera o super admin a navegar pela plataforma como um usuário. */
const PLATFORM_PREVIEW_KEY = "leadradar_admin_platform_preview";

function normalizeUser(raw: any): DbUser | null {
  if (!raw) return null;
  const empresa = raw.empresa;
  const ultimaAss = empresa?.assinaturas?.[0];
  return {
    id: Number(raw.id),
    email: raw.email,
    nome: raw.nome ?? null,
    status: raw.status ?? "ativo",
    plano: raw.plano ?? "básico",
    role: raw.role ?? "user",
    empresa_id: raw.empresa_id != null ? Number(raw.empresa_id) : null,
    avatar_url: raw.avatar_url ?? null,
    telefone: raw.telefone ?? null,
    onboarding_video_watched: !!raw.onboarding_video_watched,
    empresa_ativo: empresa?.ativo,
    empresa_nome: empresa?.nome ?? null,
    assinatura_status: ultimaAss?.status ?? null,
    assinatura_vencimento: ultimaAss?.data_vencimento ?? null,
    fatura_url: ultimaAss?.pagamentos?.[0]?.asaas_invoice_url ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [platformPreview, setPlatformPreview] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(PLATFORM_PREVIEW_KEY) === "1";
  });

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const enterPlatformPreview = useCallback(() => {
    sessionStorage.setItem(PLATFORM_PREVIEW_KEY, "1");
    setPlatformPreview(true);
  }, []);

  const exitPlatformPreview = useCallback(() => {
    sessionStorage.removeItem(PLATFORM_PREVIEW_KEY);
    setPlatformPreview(false);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: any }>("/api/auth/me");
      const normalized = normalizeUser(user);
      setDbUser(normalized);
      if (normalized) {
        setSession({ userId: normalized.id, email: normalized.email });
      } else {
        setSession(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setDbUser(null);
        setSession(null);
      } else {
        console.warn("Erro ao carregar perfil:", err);
      }
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      await loadProfile();
      if (!ignore) setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { user } = await api.post<{ user: any }>("/api/auth/login", { email, password });
      const normalized = normalizeUser(user);
      setDbUser(normalized);
      if (normalized) setSession({ userId: normalized.id, email: normalized.email });
      // recarrega perfil completo (com empresa/assinatura)
      await loadProfile();
      return { error: null };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Erro ao entrar";
      return { error: new Error(message) };
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem(PLATFORM_PREVIEW_KEY);
    setPlatformPreview(false);
    setSession(null);
    setDbUser(null);
  }, []);

  const isSuperAdmin = dbUser?.role === "super_admin";
  const assStatus = dbUser?.assinatura_status;
  const isSubscriptionBlocked =
    !isSuperAdmin &&
    !!dbUser &&
    !!assStatus &&
    (assStatus === "vencida" || assStatus === "suspensa");

  const value: AuthContextType = {
    session,
    authUser: session,
    dbUser,
    loading,
    isPasswordRecovery,
    clearPasswordRecovery,
    signIn,
    signOut,
    reloadProfile: loadProfile,
    isAdmin: dbUser?.role === "admin" || isSuperAdmin,
    isSuperAdmin,
    isSubscriptionBlocked,
    platformPreview,
    enterPlatformPreview,
    exitPlatformPreview,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
