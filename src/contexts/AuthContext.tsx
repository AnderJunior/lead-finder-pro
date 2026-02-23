import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User as AuthUser, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface DbUser {
  id: number;
  email: string;
  nome: string | null;
  status: string;
  plano: string;
  role: string | null;
  auth_id: string | null;
  empresa_id: number;
  avatar_url: string | null;
  telefone: string | null;
}

interface AuthContextType {
  session: Session | null;
  authUser: AuthUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function fetchProfile(): Promise<DbUser | null> {
  // Usa RPC get_my_profile (contorna problema com tabela "user" - palavra reservada)
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("get_my_profile"),
      4000
    );
    if (!error && data) return data as DbUser;
  } catch {
    // RPC não existe ou timeout
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const profile = await fetchProfile();
    setDbUser(profile);
  }, []);

  useEffect(() => {
    let ignore = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (ignore) return;

      setSession(newSession);
      setAuthUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession?.user) {
        loadProfile();
      } else {
        setDbUser(null);
      }
    });

    // Segurança: se onAuthStateChange não disparar em 3s, libera
    const safety = setTimeout(() => {
      if (!ignore) setLoading(false);
    }, 3000);

    return () => {
      ignore = true;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
    setDbUser(null);
  }, []);

  const value: AuthContextType = {
    session,
    authUser,
    dbUser,
    loading,
    signIn,
    signOut,
    reloadProfile: loadProfile,
    isAdmin: dbUser?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
