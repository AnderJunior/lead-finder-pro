import { useState, useEffect, useCallback } from "react";
import {
  fetchLeadsCaptados,
  fetchFunilEtapas,
  fetchBuscasRealizadas,
  fetchFunilLogs,
  fetchVendedoresRanking,
  fetchMetas,
  fetchMetasVendedor,
  fetchUsuariosEmpresa,
  type LeadCaptado,
  type FunilEtapa,
  type BuscaRealizada,
  type FunilLogMovimentacao,
  type Meta,
  type MetaVendedor,
  type UsuarioEmpresa,
} from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";

// ─── Tipos de dados dos relatórios ───────────────────────────────────

export interface FunilEtapaStats {
  id: number;
  nome: string;
  ordem: number;
  cor: string;
  totalLeads: number;
  valor: number;
  tempoMedioDias: number;
}

export interface TaxaResposta {
  totalContatados: number;
  totalResponderam: number;
  taxa: number;
}

export interface VendedorPerformance {
  id: number;
  nome: string;
  avatar_url: string | null;
  leads: number;
  qualificados: number;
  vendas: number;
  buscas: number;
  valorTotal: number;
  taxaConversao: number;
  metasAtingidas: { nome: string; atual: number; meta: number; percentual: number }[];
}

export interface LeadsPorOrigem {
  origem: string;
  total: number;
}

export interface LeadsPorSegmento {
  segmento: string;
  total: number;
  comWhatsapp: number;
  valorTotal: number;
}

export interface LeadsPorPeriodo {
  periodo: string;
  total: number;
}

export interface LeadsPorLocalizacao {
  localizacao: string;
  total: number;
}

export interface RelatorioData {
  loading: boolean;
  funilEtapas: FunilEtapaStats[];
  taxaResposta: TaxaResposta;
  taxaConversaoGeral: number;
  valorTotalPipeline: number;
  tempoMedioFechamento: number;
  leadsPerdidosPorEtapa: { etapa: string; total: number }[];

  vendedores: VendedorPerformance[];

  leadsPorOrigem: LeadsPorOrigem[];
  leadsPorSegmento: LeadsPorSegmento[];
  leadsPorPeriodo: LeadsPorPeriodo[];
  leadsPorLocalizacao: LeadsPorLocalizacao[];
  whatsappStats: { total: number; comWhatsapp: number; semWhatsapp: number; naoVerificado: number };
  ratingMedio: number;
  totalLeads: number;
  leadsComValor: number;
  leadsSemValor: number;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function diffDays(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function useRelatorios(): RelatorioData {
  const { dbUser } = useAuth();
  const [data, setData] = useState<RelatorioData>({
    loading: true,
    funilEtapas: [],
    taxaResposta: { totalContatados: 0, totalResponderam: 0, taxa: 0 },
    taxaConversaoGeral: 0,
    valorTotalPipeline: 0,
    tempoMedioFechamento: 0,
    leadsPerdidosPorEtapa: [],
    vendedores: [],
    leadsPorOrigem: [],
    leadsPorSegmento: [],
    leadsPorPeriodo: [],
    leadsPorLocalizacao: [],
    whatsappStats: { total: 0, comWhatsapp: 0, semWhatsapp: 0, naoVerificado: 0 },
    ratingMedio: 0,
    totalLeads: 0,
    leadsComValor: 0,
    leadsSemValor: 0,
  });

  const load = useCallback(async () => {
    if (!dbUser) return;

    try {
      const now = new Date();
      const mesAtualInicio = startOfMonth(now);

      const eid = dbUser.empresa_id;
      const [leads, etapas, buscas, logs, metasGerais, metasVend, usuarios, rankMensal] =
        await Promise.all([
          fetchLeadsCaptados(eid),
          fetchFunilEtapas(eid),
          fetchBuscasRealizadas(eid),
          fetchFunilLogs(eid).catch(() => [] as FunilLogMovimentacao[]),
          fetchMetas(eid).catch(() => [] as Meta[]),
          fetchMetasVendedor(eid).catch(() => [] as MetaVendedor[]),
          fetchUsuariosEmpresa(eid).catch(() => [] as UsuarioEmpresa[]),
          fetchVendedoresRanking(mesAtualInicio.toISOString()).catch(() => []),
        ]);

      // ═══════════ 1.1 FUNIL ═══════════

      const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);

      const etapaPerdido = etapas.find((e) => e.nome.toLowerCase().includes("perdido"));
      const etapaFechado = etapas.find(
        (e) => e.nome.toLowerCase().includes("fechado") || e.nome.toLowerCase().includes("ganho")
      );

      const logsPorLead = groupBy(logs, (l) => String(l.lead_id));

      const tempoMedioPorEtapa: Record<number, number[]> = {};
      for (const [, leadLogs] of Object.entries(logsPorLead)) {
        const sorted = [...leadLogs].sort(
          (a, b) => new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
        );
        for (let i = 0; i < sorted.length; i++) {
          const entrada = new Date(sorted[i].data_entrada);
          const saida = i + 1 < sorted.length ? new Date(sorted[i + 1].data_entrada) : now;
          const dias = diffDays(saida, entrada);
          const eid = sorted[i].etapa_id;
          (tempoMedioPorEtapa[eid] = tempoMedioPorEtapa[eid] || []).push(dias);
        }
      }

      const funilEtapas: FunilEtapaStats[] = etapasOrdenadas.map((et) => {
        const leadsNaEtapa = leads.filter((l) => l.etapa_id === et.id);
        const tempos = tempoMedioPorEtapa[et.id] || [];
        const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
        return {
          id: et.id,
          nome: et.nome,
          ordem: et.ordem,
          cor: et.cor,
          totalLeads: leadsNaEtapa.length,
          valor: leadsNaEtapa.reduce((sum, l) => sum + (l.valor || 0), 0),
          tempoMedioDias: Math.round(tempoMedio * 10) / 10,
        };
      });

      // Monta set de etapas por lead baseado nos logs reais de movimentação
      const etapasReaisPorLead: Record<number, Set<number>> = {};
      for (const log of logs) {
        if (!etapasReaisPorLead[log.lead_id]) {
          etapasReaisPorLead[log.lead_id] = new Set();
        }
        etapasReaisPorLead[log.lead_id].add(log.etapa_id);
      }
      // Inclui também a etapa atual de cada lead (caso não tenha log)
      for (const lead of leads) {
        if (lead.etapa_id != null) {
          if (!etapasReaisPorLead[lead.id]) {
            etapasReaisPorLead[lead.id] = new Set();
          }
          etapasReaisPorLead[lead.id].add(lead.etapa_id);
        }
      }

      // Mapa de etapa_id → ordem para consulta rápida
      const ordemPorEtapaId: Record<number, number> = {};
      for (const et of etapas) {
        ordemPorEtapaId[et.id] = et.ordem;
      }

      // Taxa de resposta: leads que entraram em "Cliente Respondeu" dentre os que entraram em "Contato Realizado"
      const etapaContato = etapasOrdenadas.find((e) => e.ordem === 1);
      const etapaRespondeu = etapasOrdenadas.find((e) => e.ordem === 2);
      let taxaResposta: TaxaResposta = { totalContatados: 0, totalResponderam: 0, taxa: 0 };
      if (etapaContato && etapaRespondeu) {
        const totalContatados = Object.values(etapasReaisPorLead).filter(
          (etapasSet) => etapasSet.has(etapaContato.id)
        ).length;
        const totalResponderam = Object.values(etapasReaisPorLead).filter(
          (etapasSet) => etapasSet.has(etapaContato.id) && etapasSet.has(etapaRespondeu.id)
        ).length;
        taxaResposta = {
          totalContatados,
          totalResponderam,
          taxa: totalContatados > 0 ? Math.round((totalResponderam / totalContatados) * 1000) / 10 : 0,
        };
      }

      const totalComEtapa = leads.filter((l) => l.etapa_id != null).length;
      const totalFechados = etapaFechado
        ? leads.filter((l) => l.etapa_id === etapaFechado.id).length
        : 0;
      const taxaConversaoGeral = totalComEtapa > 0 ? (totalFechados / totalComEtapa) * 100 : 0;

      const valorTotalPipeline = leads
        .filter((l) => l.etapa_id != null && l.etapa_id !== etapaPerdido?.id)
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      const temposFechamento: number[] = [];
      if (etapaFechado) {
        for (const [leadId, leadLogs] of Object.entries(logsPorLead)) {
          const lead = leads.find((l) => l.id === Number(leadId));
          if (lead && lead.etapa_id === etapaFechado.id) {
            const sorted = [...leadLogs].sort(
              (a, b) => new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
            );
            if (sorted.length >= 2) {
              const primeiro = new Date(sorted[0].data_entrada);
              const ultimo = new Date(sorted[sorted.length - 1].data_entrada);
              temposFechamento.push(diffDays(ultimo, primeiro));
            }
          }
        }
      }
      const tempoMedioFechamento =
        temposFechamento.length > 0
          ? Math.round((temposFechamento.reduce((a, b) => a + b, 0) / temposFechamento.length) * 10) / 10
          : 0;

      const leadsPerdidosPorEtapa: { etapa: string; total: number }[] = [];
      if (etapaPerdido) {
        const perdidos = leads.filter((l) => l.etapa_id === etapaPerdido.id);
        const porOrigem = groupBy(perdidos, (l) => l.segmento_busca || "Não informado");
        Object.entries(porOrigem)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 10)
          .forEach(([seg, arr]) => {
            leadsPerdidosPorEtapa.push({ etapa: seg, total: arr.length });
          });
      }

      // ═══════════ 1.2 PERFORMANCE VENDEDORES ═══════════

      const vendedoresNaoAdmin = usuarios.filter((u) => u.role !== "admin");

      const vendedores: VendedorPerformance[] = vendedoresNaoAdmin.map((user) => {
        const rankData = (rankMensal as any[]).find((r: any) => r.id === user.id);
        const userLeads = leads.filter((l) => l.user_id === user.id);
        const valorTotal = userLeads.reduce((sum, l) => sum + (l.valor || 0), 0);

        const leadsCount = rankData?.leads ?? userLeads.length;
        const qualificados = rankData?.qualificados ?? 0;
        const vendas = rankData?.vendas ?? 0;
        const buscasCount = rankData?.buscas ?? 0;
        const taxaConversao = leadsCount > 0 ? (vendas / leadsCount) * 100 : 0;

        const metasAtingidas = metasGerais.map((m) => {
          const override = metasVend.find((mv) => mv.meta_id === m.id && mv.user_id === user.id);
          const metaValor = override ? override.valor : m.valor;
          let atual = 0;
          if (m.slug === "vendas_realizadas") atual = vendas;
          else if (m.slug === "contatos_feitos") atual = qualificados;
          else atual = leadsCount;
          const percentual = metaValor > 0 ? (atual / metaValor) * 100 : 0;
          return { nome: m.nome, atual, meta: metaValor, percentual: Math.round(percentual * 10) / 10 };
        });

        return {
          id: user.id,
          nome: user.nome || user.email,
          avatar_url: user.avatar_url,
          leads: leadsCount,
          qualificados,
          vendas,
          buscas: buscasCount,
          valorTotal,
          taxaConversao: Math.round(taxaConversao * 10) / 10,
          metasAtingidas,
        };
      });

      vendedores.sort((a, b) => b.vendas - a.vendas || b.leads - a.leads);

      // ═══════════ 1.3 LEADS ═══════════

      const origemMap = groupBy(leads, (l) => l.origem_busca || "Não informado");
      const leadsPorOrigem: LeadsPorOrigem[] = Object.entries(origemMap)
        .map(([origem, arr]) => ({ origem, total: arr.length }))
        .sort((a, b) => b.total - a.total);

      const segmentoMap = groupBy(leads, (l) => l.segmento_busca || "Não informado");
      const leadsPorSegmento: LeadsPorSegmento[] = Object.entries(segmentoMap)
        .map(([segmento, arr]) => ({
          segmento,
          total: arr.length,
          comWhatsapp: arr.filter((l) => l.has_whatsapp === true).length,
          valorTotal: arr.reduce((sum, l) => sum + (l.valor || 0), 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

      const locMap = groupBy(leads, (l) => l.localizacao_busca || "Não informado");
      const leadsPorLocalizacao: LeadsPorLocalizacao[] = Object.entries(locMap)
        .map(([localizacao, arr]) => ({ localizacao, total: arr.length }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

      const last6Months: LeadsPorPeriodo[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = leads.filter((l) => {
          const dt = new Date(l.data_captacao);
          return dt >= d && dt < nextMonth;
        }).length;
        last6Months.push({ periodo: label, total: count });
      }

      const comWhatsapp = leads.filter((l) => l.has_whatsapp === true).length;
      const semWhatsapp = leads.filter((l) => l.has_whatsapp === false).length;
      const naoVerificado = leads.filter((l) => l.has_whatsapp == null).length;

      const ratings = leads.filter((l) => l.rating != null && l.rating > 0);
      const ratingMedio =
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, l) => sum + (l.rating || 0), 0) / ratings.length) * 10) / 10
          : 0;

      const leadsComValor = leads.filter((l) => l.valor > 0).length;

      setData({
        loading: false,
        funilEtapas,
        taxaResposta,
        taxaConversaoGeral: Math.round(taxaConversaoGeral * 10) / 10,
        valorTotalPipeline,
        tempoMedioFechamento,
        leadsPerdidosPorEtapa,
        vendedores,
        leadsPorOrigem,
        leadsPorSegmento,
        leadsPorPeriodo: last6Months,
        leadsPorLocalizacao,
        whatsappStats: { total: leads.length, comWhatsapp, semWhatsapp, naoVerificado },
        ratingMedio,
        totalLeads: leads.length,
        leadsComValor,
        leadsSemValor: leads.length - leadsComValor,
      });
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, [dbUser]);

  useEffect(() => {
    load();
  }, [load]);

  return data;
}
