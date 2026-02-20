import { Badge } from "@/components/ui/badge";
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

interface LeadsTableProps {
  leads?: Lead[];
}

export function LeadsTable({ leads = mockLeads }: LeadsTableProps) {
  return (
    <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avaliação</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => {
              const sc = statusConfig[lead.status];
              return (
                <tr
                  key={lead.id}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-sm text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.address}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-secondary-foreground">{lead.category}</td>
                  <td className="px-5 py-4 text-sm text-secondary-foreground font-mono">{lead.phone}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-warning">★ {lead.rating}</span>
                      <span className="text-xs text-muted-foreground">({lead.reviews})</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className={cn("text-xs font-medium border", sc.className)}>
                      {sc.label}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {lead.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs text-muted-foreground border-border bg-muted">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
