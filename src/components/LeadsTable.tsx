import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type LeadStatus = "novo" | "contatado" | "qualificado" | "descartado";

export interface Lead {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews: number;
  status: LeadStatus;
  tags: string[];
}

export interface LeadWithWhatsApp extends Lead {
  hasWhatsApp?: boolean | null;
  whatsappStatus?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-primary/15 text-primary border-primary/30" },
  contatado: { label: "Contatado", className: "bg-warning/15 text-warning border-warning/30" },
  qualificado: { label: "Qualificado", className: "bg-success/15 text-success border-success/30" },
  descartado: { label: "Descartado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const mockLeads: Lead[] = [
  { id: "1", name: "Restaurante Sabor & Arte", category: "Restaurante", address: "Rua Augusta, 1200 - São Paulo, SP", phone: "(11) 3456-7890", website: "saborarte.com.br", rating: 4.5, reviews: 342, status: "novo", tags: ["gastronomia", "premium"] },
  { id: "2", name: "Clínica VidaSaúde", category: "Clínica Médica", address: "Av. Paulista, 900 - São Paulo, SP", phone: "(11) 2345-6789", website: "vidasaude.com.br", rating: 4.8, reviews: 521, status: "qualificado", tags: ["saúde", "alto ticket"] },
  { id: "3", name: "Academia PowerFit", category: "Academia", address: "Rua Oscar Freire, 450 - São Paulo, SP", phone: "(11) 9876-5432", website: "powerfit.com.br", rating: 4.2, reviews: 189, status: "contatado", tags: ["fitness"] },
  { id: "4", name: "Pet Shop Amigo Fiel", category: "Pet Shop", address: "Rua Consolação, 2100 - São Paulo, SP", phone: "(11) 5678-1234", website: "amigofiel.com.br", rating: 4.6, reviews: 275, status: "novo", tags: ["pet", "varejo"] },
  { id: "5", name: "Escritório Contábil Exacta", category: "Contabilidade", address: "Rua XV de Novembro, 300 - São Paulo, SP", phone: "(11) 4321-8765", website: "exactacontabil.com.br", rating: 4.0, reviews: 98, status: "descartado", tags: ["serviços"] },
  { id: "6", name: "Barbearia Old School", category: "Barbearia", address: "Rua da Liberdade, 800 - São Paulo, SP", phone: "(11) 6543-2109", website: "oldschoolbarber.com.br", rating: 4.7, reviews: 412, status: "novo", tags: ["beleza", "premium"] },
  { id: "7", name: "Padaria Pão Quente", category: "Padaria", address: "Av. Brasil, 1500 - São Paulo, SP", phone: "(11) 7890-1234", website: "paoquente.com.br", rating: 4.3, reviews: 156, status: "contatado", tags: ["alimentação"] },
  { id: "8", name: "Studio Pilates Corpo & Mente", category: "Pilates", address: "Rua Haddock Lobo, 600 - São Paulo, SP", phone: "(11) 8765-4321", website: "corpoemente.com.br", rating: 4.9, reviews: 287, status: "qualificado", tags: ["saúde", "fitness"] },
];

export interface LeadComCaptado extends Lead {
  jaCaptado?: boolean;
}

interface LeadsTableProps {
  leads?: (Lead | LeadComCaptado)[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  showWhatsApp?: boolean;
}

export function LeadsTable({
  leads = mockLeads,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  showWhatsApp = false,
}: LeadsTableProps) {
  return (
    <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {selectable && (
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">
                  <Checkbox
                    checked={
                      leads.filter((l) => !(l as LeadComCaptado).jaCaptado).length > 0 &&
                      leads.filter((l) => !(l as LeadComCaptado).jaCaptado).every((l) => selectedIds.has(l.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) onSelectAll?.();
                      else onClearSelection?.();
                    }}
                  />
                </th>
              )}
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider max-w-[280px]">Empresa</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avaliação</th>
              {showWhatsApp && (
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</th>
              )}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => {
              const ext = lead as LeadWithWhatsApp;
              const captado = (lead as LeadComCaptado).jaCaptado === true;
              const isSelected = selectedIds.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    captado
                      ? "opacity-50 cursor-not-allowed bg-muted/30"
                      : cn(
                          "hover:bg-muted/50",
                          selectable && "cursor-pointer",
                          isSelected && "bg-primary/5"
                        )
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={
                    selectable && onToggleSelect && !captado
                      ? () => onToggleSelect(lead.id)
                      : undefined
                  }
                >
                  {selectable && (
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        disabled={captado}
                        onCheckedChange={() => !captado && onToggleSelect?.(lead.id)}
                      />
                    </td>
                  )}
                  <td className="px-5 py-4 max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <div className={cn("min-w-0", captado && "line-through")}>
                        <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.address || "—"}</p>
                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline mt-0.5 block truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.website}
                          </a>
                        )}
                      </div>
                      {captado && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30 whitespace-nowrap shrink-0">
                          Já captado
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={cn("px-5 py-4 text-sm text-secondary-foreground font-mono", captado && "line-through")}>
                    <span>{lead.phone || "—"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold text-warning">★ {lead.rating ?? 0}</span>
                      <span className="text-xs text-muted-foreground">({lead.reviews ?? 0})</span>
                    </div>
                  </td>
                  {showWhatsApp && (
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          ext.hasWhatsApp === true && "bg-green-500/15 text-green-700 border-green-500/30",
                          ext.hasWhatsApp === false && "bg-red-500/15 text-red-700 border-red-500/30",
                          (ext.hasWhatsApp == null || ext.hasWhatsApp === undefined) && "bg-muted text-muted-foreground"
                        )}
                      >
                        {ext.hasWhatsApp === true
                          ? "Sim"
                          : ext.hasWhatsApp === false
                            ? "Não"
                            : "Não Verificado"}
                      </Badge>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
