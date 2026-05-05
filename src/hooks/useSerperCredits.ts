import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeCreditsChanged } from "@/lib/credits-bus";

interface CreditsData {
  credits: number;
  totalCredits: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Saldo de créditos da empresa logada (vindo do nosso backend).
 * 1 crédito = 1 busca, 1 lead captado = 1 crédito, enriquecimento = 2 créditos.
 * Atualiza automaticamente quando `notifyCreditsChanged()` é chamado em qualquer lugar.
 */
export function useSerperCredits(): CreditsData {
  const { dbUser } = useAuth();
  const [credits, setCredits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const planoTotalRef = useRef<number | null>(null);

  const empresaId = dbUser?.empresa_id;

  const refresh = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const credRes = await api.get<{ creditos: number }>(`/api/empresas/${empresaId}/creditos`);
      setCredits(credRes.creditos);

      // Total do plano (cacheia para não buscar toda vez que créditos mudam)
      if (planoTotalRef.current == null) {
        try {
          const empresa = await api.get<any>(`/api/empresas/${empresaId}`);
          const plano = empresa?.assinaturas?.[0]?.plano;
          planoTotalRef.current = plano?.creditos_iniciais ?? credRes.creditos;
        } catch {
          planoTotalRef.current = credRes.creditos;
        }
      }
      setTotalCredits(Math.max(planoTotalRef.current ?? 0, credRes.creditos));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao carregar créditos");
      }
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    planoTotalRef.current = null;
    refresh();
  }, [refresh]);

  // Atualiza em tempo real quando alguém chama notifyCreditsChanged()
  useEffect(() => {
    const unsubscribe = subscribeCreditsChanged(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return { credits, totalCredits, loading, error, refresh };
}
