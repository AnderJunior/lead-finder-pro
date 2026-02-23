import { useState, useEffect, useCallback } from "react";
import {
  fetchLeadsCaptados,
  fetchFunilEtapas,
  fetchBuscasRealizadas,
  fetchVendedoresRanking,
  fetchMetas,
  fetchMetasVendedor,
  type LeadCaptado,
  type FunilEtapa,
  type BuscaRealizada,
  type Meta,
  type MetaVendedor,
} from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";

export interface VendedorStats {
  id: number;
  nome: string;
  avatar_url: string | null;
  leads: number;
  qualificados: number;
  vendas: number;
  buscas: number;
}

export interface MetaComValor {
  id: number;
  nome: string;
  slug: string;
  periodo: "diario" | "semanal" | "mensal";
  valorGeral: number;
  valorEfetivo: number;
}

export type VendedorPeriodo = "diario" | "semanal" | "mensal";

export interface DashboardStats {
  totalLeads: number;
  totalBuscas: number;
  leadsQualificados: number;
  changeLeads: string;
  changeLeadsPositive: boolean;
  changeBuscas: string;
  changeBuscasPositive: boolean;
  changeQualificados: string;
  changeQualificadosPositive: boolean;
  ganhos: number;
  descartados: number;
  changeGanhos: string;
  changeGanhosPositive: boolean;
  changeDescartados: string;
  changeDescartadosPositive: boolean;
  buscasRecentes: BuscaRealizada[];
  leadsRecentes: LeadCaptado[];
  leadsCaptadosMes: number;
  vendasMes: number;
  contatosMes: number;
  vendedores: VendedorStats[];
  vendedoresPorPeriodo: Record<VendedorPeriodo, VendedorStats[]>;
  metas: MetaComValor[];
  vendedorMetas: Record<number, { vendasMes: number; contatosMes: number; metas: MetaComValor[] }>;
  loading: boolean;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 7 : day));
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
    changeLeads: "",
    changeLeadsPositive: true,
    changeBuscas: "",
    changeBuscasPositive: true,
    changeQualificados: "",
    changeQualificadosPositive: true,
    ganhos: 0,
    descartados: 0,
    changeGanhos: "",
    changeGanhosPositive: true,
    changeDescartados: "",
    changeDescartadosPositive: true,
    buscasRecentes: [],
    leadsRecentes: [],
    leadsCaptadosMes: 0,
    vendasMes: 0,
    contatosMes: 0,
    vendedores: [],
    vendedoresPorPeriodo: { diario: [], semanal: [], mensal: [] },
    metas: [],
    vendedorMetas: {},
    loading: true,
  });

  const load = useCallback(async () => {
    if (!dbUser) return;

    try {
      const now = new Date();
      const hoje = startOfDay(now);
      const mesAtualInicio = startOfMonth(now);
      const mesAnteriorInicio = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const semanaAtualInicio = startOfWeek(now);
      const semanaAnteriorInicio = new Date(semanaAtualInicio);
      semanaAnteriorInicio.setDate(semanaAnteriorInicio.getDate() - 7);

      const [leads, etapas, buscas, metasGerais, metasVend, rankDiario, rankSemanal, rankMensal] = await Promise.all([
        fetchLeadsCaptados(),
        fetchFunilEtapas(),
        fetchBuscasRealizadas(),
        fetchMetas().catch(() => [] as Meta[]),
        fetchMetasVendedor().catch(() => [] as MetaVendedor[]),
        fetchVendedoresRanking(hoje.toISOString()).catch(() => []),
        fetchVendedoresRanking(semanaAtualInicio.toISOString()).catch(() => []),
        fetchVendedoresRanking(mesAtualInicio.toISOString()).catch(() => []),
      ]);

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
      const vendasMes = etapaFechado
        ? leads.filter(
            (l) =>
              l.etapa_id === etapaFechado.id &&
              new Date(l.data_captacao) >= mesAtualInicio
          ).length
        : 0;

      const contatoEtapaIds = new Set(
        etapas.filter((e) => e.ordem >= 1).map((e) => e.id)
      );
      const contatosMes = leads.filter(
        (l) =>
          l.etapa_id != null &&
          contatoEtapaIds.has(l.etapa_id) &&
          new Date(l.data_captacao) >= mesAtualInicio
      ).length;

      const etapaDescartado = etapas.find((e) => e.ordem === 5);
      const descartados = etapaDescartado
        ? leads.filter((l) => l.etapa_id === etapaDescartado.id).length
        : 0;

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

      // --- Comparações mensais (ganhos) ---
      const ganhosMesAtual = etapaFechado
        ? leads.filter(
            (l) =>
              l.etapa_id === etapaFechado.id &&
              new Date(l.data_captacao) >= mesAtualInicio
          ).length
        : 0;
      const ganhosMesAnterior = etapaFechado
        ? leads.filter((l) => {
            const d = new Date(l.data_captacao);
            return l.etapa_id === etapaFechado.id && d >= mesAnteriorInicio && d < mesAtualInicio;
          }).length
        : 0;
      const changeGanhosData = percentChange(ganhosMesAtual, ganhosMesAnterior);

      // --- Comparações mensais (descartados) ---
      const descMesAtual = etapaDescartado
        ? leads.filter(
            (l) =>
              l.etapa_id === etapaDescartado.id &&
              new Date(l.data_captacao) >= mesAtualInicio
          ).length
        : 0;
      const descMesAnterior = etapaDescartado
        ? leads.filter((l) => {
            const d = new Date(l.data_captacao);
            return l.etapa_id === etapaDescartado.id && d >= mesAnteriorInicio && d < mesAtualInicio;
          }).length
        : 0;
      const changeDescData = percentChange(descMesAtual, descMesAnterior);

      // --- Performance por vendedor (via RPC — ignora RLS) ---
      const sortRanking = (arr: VendedorStats[]) =>
        [...arr].sort(
          (a, b) =>
            b.vendas - a.vendas ||
            b.qualificados - a.qualificados ||
            b.leads - a.leads ||
            b.buscas - a.buscas
        );
      const vendedoresPorPeriodo: Record<VendedorPeriodo, VendedorStats[]> = {
        diario: sortRanking(rankDiario as VendedorStats[]),
        semanal: sortRanking(rankSemanal as VendedorStats[]),
        mensal: sortRanking(rankMensal as VendedorStats[]),
      };
      const vendedores = vendedoresPorPeriodo.mensal;

      const metasComValor: MetaComValor[] = metasGerais.map((m) => {
        const override = dbUser
          ? metasVend.find((mv) => mv.meta_id === m.id && mv.user_id === dbUser.id)
          : undefined;
        return {
          id: m.id,
          nome: m.nome,
          slug: m.slug,
          periodo: m.periodo,
          valorGeral: m.valor,
          valorEfetivo: override ? override.valor : m.valor,
        };
      });

      const vendedorMetaData: Record<number, { vendasMes: number; contatosMes: number; metas: MetaComValor[] }> = {};
      for (const vend of vendedoresPorPeriodo.mensal) {
        const vendLeads = leads.filter(l => l.user_id === vend.id);
        const vVendasMes = etapaFechado
          ? vendLeads.filter(l => l.etapa_id === etapaFechado.id && new Date(l.data_captacao) >= mesAtualInicio).length
          : 0;
        const vContatosMes = vendLeads.filter(
          l => l.etapa_id != null && contatoEtapaIds.has(l.etapa_id) && new Date(l.data_captacao) >= mesAtualInicio
        ).length;
        const vMetas: MetaComValor[] = metasGerais.map(m => {
          const override = metasVend.find(mv => mv.meta_id === m.id && mv.user_id === vend.id);
          return {
            id: m.id,
            nome: m.nome,
            slug: m.slug,
            periodo: m.periodo,
            valorGeral: m.valor,
            valorEfetivo: override ? override.valor : m.valor,
          };
        });
        vendedorMetaData[vend.id] = { vendasMes: vVendasMes, contatosMes: vContatosMes, metas: vMetas };
      }

      setStats({
        totalLeads,
        totalBuscas: buscas.length,
        leadsQualificados,
        changeLeads: changeLeadsData.text,
        changeLeadsPositive: changeLeadsData.positive,
        changeBuscas: `${changeBuscasSign}${diffBuscas} esta semana`,
        changeBuscasPositive: diffBuscas >= 0,
        changeQualificados: changeQualData.text,
        changeQualificadosPositive: changeQualData.positive,
        ganhos: leadsFechados,
        descartados,
        changeGanhos: changeGanhosData.text,
        changeGanhosPositive: changeGanhosData.positive,
        changeDescartados: changeDescData.text,
        changeDescartadosPositive: changeDescData.positive,
        buscasRecentes: buscas.slice(0, 6),
        leadsRecentes: leads.slice(0, 5),
        leadsCaptadosMes: leadsMesAtual,
        vendasMes,
        contatosMes,
        vendedores,
        vendedoresPorPeriodo,
        metas: metasComValor,
        vendedorMetas: vendedorMetaData,
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
