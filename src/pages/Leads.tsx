import { AppLayout } from "@/components/AppLayout";
import { LeadsTable, mockLeads } from "@/components/LeadsTable";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Página de Leads - redireciona para a página de Prospecção (/search)
 * que contém a lógica completa: busca, filtros, paginação, mapa, export.
 */
const Leads = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e exporte seus leads de prospecção.
          </p>
        </div>

        <div className="card-gradient rounded-xl border border-border p-8 text-center">
          <Search className="h-12 w-12 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            A busca e prospecção foram integradas na página de Nova Prospecção.
          </p>
          <Button asChild>
            <Link to="/search" className="gap-2">
              <Search className="h-4 w-4" />
              Ir para Prospecção
            </Link>
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Leads de Exemplo</h2>
          <LeadsTable leads={mockLeads} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Leads;
