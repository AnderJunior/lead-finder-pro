import { useState, useEffect, useCallback } from "react";
import {
  fetchLeadsCaptados,
  fetchFunilEtapas,
  fetchBuscasRealizadas,
  type LeadCaptado,
  type FunilEtapa,
  type BuscaRealizada,
} from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  totalLeads: number;
  totalBuscas: number;
  leadsQualificados: number;
  taxaConversao: number;
  changeLeads: string;
  changeLeadsPositive: boolean;
  changeBuscas: string;
  changeBuscasPositive: boolean;
  changeQualificados: string;
  changeQualificadosPositive: boolean;
  changeTaxa: string;
  changeTaxaPositive: boolean;
  buscasRecentes: BuscaRealizada[];
  leadsRecentes: LeadCaptado[];
  loading: boolean;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function percentChange(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0 && current === 0) return { text: "Sem dados", positive: true };
  if (previous === 0) return { text: `+${current} novo${current > 1 ? "s" : ""}`, positive: true };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(0)}% vs mês anterior`, positive: pct >= 0 };
}

export function useDashboardStats(): DashboardStats {
  const { dbUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalBuscas: 0,
    leadsQualificados: 0,
    taxaConversao: 0,
    changeLeads: "",
    changeLeadsPositive: true,
    changeBuscas: "",
    changeBuscasPositive: true,
    changeQualificados: "",
    changeQualificadosPositive: true,
    changeTaxa: "",
    changeTaxaPositive: true,
    buscasRecentes: [],
    leadsRecentes: [],
    loading: true,
  });

  const load = useCallback(async () => {
    if (!dbUser) return;

    try {
      const [leads, etapas, buscas] = await Promise.all([
        fetchLeadsCaptados(),
        fetchFunilEtapas(dbUser.id),
        fetchBuscasRealizadas(),
      ]);

      const now = new Date();
      const mesAtualInicio = startOfMonth(now);
      const mesAnteriorInicio = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const semanaAtualInicio = startOfWeek(now);
      const semanaAnteriorInicio = new Date(semanaAtualInicio);
      semanaAnteriorInicio.setDate(semanaAnteriorInicio.getDate() - 7);

      // --- Etapas qualificadas ---
      const etapaClienteRespondeu = etapas.find(
        (e) => e.nome.toLowerCase().includes("cliente respondeu")
      );
      const ordemMinQualificado = etapaClienteRespondeu?.ordem ?? 2;

      const etapaPerdido = etapas.find(
        (e) => e.nome.toLowerCase().includes("perdido")
      );
      const qualifiedEtapaIds = new Set(
        etapas
          .filter((e) => e.ordem >= ordemMinQualificado && e.id !== etapaPerdido?.id)
          .map((e) => e.id)
      );

      const etapaFechado = etapas.find(
        (e) => e.nome.toLowerCase().includes("fechado") || e.nome.toLowerCase().includes("ganho")
      );

      // --- Contagens ---
      const totalLeads = leads.length;
      const leadsQualificados = leads.filter(
        (l) => l.etapa_id != null && qualifiedEtapaIds.has(l.etapa_id)
      ).length;
      const leadsFechados = etapaFechado
        ? leads.filter((l) => l.etapa_id === etapaFechado.id).length
        : 0;
      const taxaConversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;

      // --- Comparações mensais (leads) ---
      const leadsMesAtual = leads.filter(
        (l) => new Date(l.data_captacao) >= mesAtualInicio
      ).length;
      const leadsMesAnterior = leads.filter((l) => {
        const d = new Date(l.data_captacao);
        return d >= mesAnteriorInicio && d < mesAtualInicio;
      }).length;
      const changeLeadsData = percentChange(leadsMesAtual, leadsMesAnterior);

      // --- Comparações semanais (buscas) ---
      const buscasSemanaAtual = buscas.filter(
        (b) => new Date(b.created_at) >= semanaAtualInicio
      ).length;
      const buscasSemanaAnterior = buscas.filter((b) => {
        const d = new Date(b.created_at);
        return d >= semanaAnteriorInicio && d < semanaAtualInicio;
      }).length;
      const changeBuscasSign = buscasSemanaAtual >= buscasSemanaAnterior ? "+" : "";
      const diffBuscas = buscasSemanaAtual - buscasSemanaAnterior;

      // --- Comparações mensais (qualificados) ---
      const qualMesAtual = leads.filter((l) => {
        if (!l.etapa_id || !qualifiedEtapaIds.has(l.etapa_id)) return false;
        return new Date(l.data_captacao) >= mesAtualInicio;
      }).length;
      const qualMesAnterior = leads.filter((l) => {
        if (!l.etapa_id || !qualifiedEtapaIds.has(l.etapa_id)) return false;
        const d = new Date(l.data_captacao);
        return d >= mesAnteriorInicio && d < mesAtualInicio;
      }).length;
      const changeQualData = percentChange(qualMesAtual, qualMesAnterior);

      // --- Taxa de conversão change ---
      const leadsAntigos = leads.filter((l) => new Date(l.data_captacao) < mesAtualInicio);
      const fechadosAntigos = etapaFechado
        ? leadsAntigos.filter((l) => l.etapa_id === etapaFechado.id).length
        : 0;
      const taxaAnterior = leadsAntigos.length > 0
        ? (fechadosAntigos / leadsAntigos.length) * 100
        : 0;
      const diffTaxa = taxaConversao - taxaAnterior;

      setStats({
        totalLeads,
        totalBuscas: buscas.length,
        leadsQualificados,
        taxaConversao,
        changeLeads: changeLeadsData.text,
        changeLeadsPositive: changeLeadsData.positive,
        changeBuscas: `${changeBuscasSign}${diffBuscas} esta semana`,
        changeBuscasPositive: diffBuscas >= 0,
        changeQualificados: changeQualData.text,
        changeQualificadosPositive: changeQualData.positive,
        changeTaxa: `${diffTaxa >= 0 ? "+" : ""}${diffTaxa.toFixed(1)}%`,
        changeTaxaPositive: diffTaxa >= 0,
        buscasRecentes: buscas.slice(0, 6),
        leadsRecentes: leads.slice(0, 5),
        loading: false,
      });
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [dbUser]);

  useEffect(() => {
    load();
  }, [load]);

  return stats;
}
