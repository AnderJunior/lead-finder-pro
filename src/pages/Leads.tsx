import { AppLayout } from "@/components/AppLayout";
import { LeadsTable, mockLeads } from "@/components/LeadsTable";
import { SearchForm } from "@/components/SearchForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Filter, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const Leads = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");
  const location = searchParams.get("loc");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Leads</h1>
            {query && location ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Resultados para</span>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">{query}</Badge>
                <span className="text-sm text-muted-foreground">em</span>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">{location}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Gerencie todos os seus leads</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 card-gradient rounded-xl border border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-sm font-semibold text-foreground">{mockLeads.length}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Novos:</span>
            <span className="text-sm font-semibold text-primary">{mockLeads.filter(l => l.status === "novo").length}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Qualificados:</span>
            <span className="text-sm font-semibold text-success">{mockLeads.filter(l => l.status === "qualificado").length}</span>
          </div>
        </div>

        <LeadsTable />
      </div>
    </AppLayout>
  );
};

export default Leads;
