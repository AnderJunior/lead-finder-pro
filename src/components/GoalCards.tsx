import { Target, Calendar, TrendingUp, Phone, BarChart3 } from "lucide-react";
import type { MetaComValor } from "@/hooks/useDashboardStats";

interface GoalCardProps {
  title: string;
  icon: React.ReactNode;
  atual: number;
  meta: number;
  formatValue: (v: number) => string;
  periodoLabel: string;
  tempoRestanteLabel: string;
  message: string;
}

function GoalCard({
  title,
  icon,
  atual,
  meta,
  formatValue,
  periodoLabel,
  tempoRestanteLabel,
  message,
}: GoalCardProps) {
  const pct = meta > 0 ? Math.min(Math.round((atual / meta) * 100), 100) : 0;

  return (
    <div className="card-gradient rounded-xl border border-border p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="font-semibold text-foreground text-sm">{title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {tempoRestanteLabel} · {periodoLabel}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{pct}%</p>
          <p className="text-xs text-primary font-medium">atingido</p>
        </div>
      </div>

      <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
        />
      </div>

      <div className="flex justify-between text-sm mb-3">
        <span className="text-muted-foreground">
          Atual:{" "}
          <strong className="text-foreground">{formatValue(atual)}</strong>
        </span>
        <span className="text-muted-foreground">
          Meta:{" "}
          <strong className="text-foreground">{formatValue(meta)}</strong>
        </span>
      </div>

      <div className="bg-primary/5 rounded-lg px-3 py-2.5">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          {message}
        </p>
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  vendas_realizadas: (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
      <Target className="h-5 w-5 text-primary" />
    </div>
  ),
  contatos_feitos: (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
      <Phone className="h-5 w-5 text-primary" />
    </div>
  ),
};

const DEFAULT_ICON = (
  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
    <BarChart3 className="h-5 w-5 text-primary" />
  </div>
);

const PERIODO_LABELS: Record<string, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

function getPeriodoInfo(periodo: string): { tempoRestanteLabel: string; unidadeRestante: number } {
  const now = new Date();

  if (periodo === "diario") {
    const horasRestantes = 23 - now.getHours();
    return {
      tempoRestanteLabel: `${horasRestantes}h restantes`,
      unidadeRestante: 1,
    };
  }

  if (periodo === "semanal") {
    const diaDaSemana = now.getDay();
    const diasRestantes = diaDaSemana === 0 ? 0 : 7 - diaDaSemana;
    return {
      tempoRestanteLabel: `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`,
      unidadeRestante: Math.max(diasRestantes, 1),
    };
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diasRestantes = lastDay.getDate() - now.getDate();
  return {
    tempoRestanteLabel: `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`,
    unidadeRestante: Math.max(diasRestantes, 1),
  };
}

interface GoalCardsProps {
  vendasMes: number;
  contatosMes: number;
  metas: MetaComValor[];
  loading?: boolean;
}

export function GoalCards({ vendasMes, contatosMes, metas, loading }: GoalCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="card-gradient rounded-xl border border-border p-5 h-[200px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  function getAtualValue(slug: string): number {
    if (slug === "vendas_realizadas") return vendasMes;
    if (slug === "contatos_feitos") return contatosMes;
    return 0;
  }

  function getMessage(atual: number, metaValor: number, nomeItem: string, unidadeRestante: number, periodo: string): string {
    const faltam = Math.max(metaValor - atual, 0);
    if (faltam === 0) return "Meta atingida! Parabéns!";

    if (periodo === "diario") {
      return `Faltam ${faltam} ${nomeItem.toLowerCase()} hoje`;
    }

    const porDia = Math.ceil(faltam / unidadeRestante);
    return `Faltam ${faltam} ${nomeItem.toLowerCase()} em ${unidadeRestante} dias (${porDia}/dia)`;
  }

  const metasToShow = metas.length > 0
    ? metas
    : [
        { id: 0, nome: "Vendas Realizadas", slug: "vendas_realizadas", periodo: "mensal" as const, valorGeral: 30, valorEfetivo: 30 },
        { id: 1, nome: "Contatos Feitos", slug: "contatos_feitos", periodo: "mensal" as const, valorGeral: 50, valorEfetivo: 50 },
      ];

  const cols = metasToShow.length <= 2 ? "md:grid-cols-2" : metasToShow.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {metasToShow.map((meta) => {
        const atual = getAtualValue(meta.slug);
        const { tempoRestanteLabel, unidadeRestante } = getPeriodoInfo(meta.periodo);
        return (
          <GoalCard
            key={meta.id}
            title={`Meta de ${meta.nome}`}
            icon={ICON_MAP[meta.slug] || DEFAULT_ICON}
            atual={atual}
            meta={meta.valorEfetivo}
            formatValue={(v) => String(v)}
            periodoLabel={PERIODO_LABELS[meta.periodo] || meta.periodo}
            tempoRestanteLabel={tempoRestanteLabel}
            message={getMessage(atual, meta.valorEfetivo, meta.nome, unidadeRestante, meta.periodo)}
          />
        );
      })}
    </div>
  );
}
