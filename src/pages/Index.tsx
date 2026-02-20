import { AppLayout } from "@/components/AppLayout";
import { SearchForm } from "@/components/SearchForm";
import { StatCard } from "@/components/StatCard";
import { RecentSearches } from "@/components/RecentSearches";
import { LeadsTable, mockLeads } from "@/components/LeadsTable";
import { Users, Search, Star, TrendingUp } from "lucide-react";

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral da sua prospecção</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total de Leads" value="1.284" change="+12% este mês" positive />
          <StatCard icon={Search} label="Buscas Realizadas" value="46" change="+8 esta semana" positive />
          <StatCard icon={Star} label="Leads Qualificados" value="312" change="+23% este mês" positive />
          <StatCard icon={TrendingUp} label="Taxa de Conversão" value="24.3%" change="+2.1%" positive />
        </div>

        {/* Search + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SearchForm />
          </div>
          <RecentSearches />
        </div>

        {/* Recent Leads */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Leads Recentes</h2>
          <LeadsTable leads={mockLeads.slice(0, 5)} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
