/**
 * Componente de busca de perfis do Instagram
 * Formulário de busca + exibição de resultados em cards com estilo Instagram
 */
import { useState } from "react";
import { Search, Loader2, Instagram, ExternalLink, ChevronLeft, ChevronRight, UserPlus, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useInstagramSearch } from "@/hooks/useInstagramSearch";
import { useAuth } from "@/contexts/AuthContext";
import { captarLeads, type LeadCaptadoPayload } from "@/lib/supabase-functions";
import { cn } from "@/lib/utils";
import type { InstagramResultWithCaptado } from "@/hooks/useInstagramSearch";

interface InstagramSearchProps {
  onSearchStarted?: () => void;
}

export function InstagramSearch({ onSearchStarted }: InstagramSearchProps) {
  const [term, setTerm] = useState("");
  const [captando, setCaptando] = useState(false);
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const ig = useInstagramSearch();

  const currentPageResults = ig.pagesData[ig.currentPage] ?? [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um termo para buscar no Instagram.",
        variant: "destructive",
      });
      return;
    }

    onSearchStarted?.();

    try {
      await ig.search(term.trim(), 1);
      toast({
        title: "Busca realizada",
        description: "Perfis do Instagram encontrados.",
      });
    } catch {
      toast({
        title: "Erro na busca",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCaptar = async () => {
    const allResults = Object.values(ig.pagesData).flat();
    const selected = allResults.filter((r) => ig.selectedIds.has(r.id));
    if (selected.length === 0) {
      toast({
        title: "Nenhum selecionado",
        description: "Selecione perfis para captar.",
        variant: "destructive",
      });
      return;
    }
    if (!dbUser?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    setCaptando(true);
    try {
      const payloads: LeadCaptadoPayload[] = selected.map((r) => ({
        nome: r.title,
        website: r.link,
        origem_busca: "Instagram",
        segmento_busca: ig.searchTerm,
        notas: r.snippet,
        user_id: dbUser.id,
      }));

      const { count } = await captarLeads(payloads);
      ig.clearSelection();
      await ig.refreshCaptados();
      toast({
        title: "Leads captados!",
        description: `${count} perfis do Instagram foram adicionados à sua lista.`,
      });
    } catch (err) {
      toast({
        title: "Erro ao captar",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setCaptando(false);
    }
  };

  const hasResults = currentPageResults.length > 0;

  return (
    <div className="space-y-4">
      {/* Formulário */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-border p-6 animate-fade-in"
        style={{ background: "#FFFFFF" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #e4405f, #833ab4)" }}
          >
            <Instagram className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Busca no Instagram</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Encontre perfis de empresas e negócios no Instagram (via Serper API)
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Ex: Clínica de Estética, Pet Shop, Restaurante..."
              className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={ig.loading || !term.trim()}
            className="px-8 shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #e4405f, #833ab4)" }}
          >
            {ig.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Instagram className="h-4 w-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          <strong>Dica:</strong> Use termos específicos do negócio. Ex: "Clínica de Estética", "Pet Shop", "Barbearia"
        </p>
      </form>

      {ig.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ig.error}
        </div>
      )}

      {/* Resultados */}
      {hasResults && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={ig.loadPrevPage} disabled={ig.currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={ig.loadNextPage} disabled={!ig.hasMore || ig.loading}>
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">Página {ig.currentPage}</span>
              <span className="text-xs text-muted-foreground">
                {ig.searchTerm && `"${ig.searchTerm}"`}
              </span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleCaptar}
              disabled={ig.selectedIds.size === 0 || captando}
            >
              <UserPlus className="h-3.5 w-3.5 mr-2" />
              {captando ? "Captando..." : `Captar (${ig.selectedIds.size})`}
            </Button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentPageResults.map((result) => (
              <InstagramCard
                key={result.id}
                result={result}
                selected={ig.selectedIds.has(result.id)}
                onToggle={() => ig.toggleSelection(result.id)}
              />
            ))}
          </div>

        </div>
      )}

      {/* Empty state */}
      {!hasResults && !ig.loading && (
        <div className="card-gradient rounded-xl border border-border p-8 text-center">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, #e4405f, #833ab4)" }}
          >
            <Instagram className="h-6 w-6" />
          </div>
          <p className="text-muted-foreground">
            Busque perfis de empresas e negócios no Instagram.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Ex: "Clínica Médica", "Pet Shop", "Restaurante"
          </p>
        </div>
      )}
    </div>
  );
}

function InstagramCard({
  result,
  selected,
  onToggle,
}: {
  result: InstagramResultWithCaptado;
  selected: boolean;
  onToggle: () => void;
}) {
  const username = extractUsername(result.link);
  const captado = result.jaCaptado === true;

  return (
    <div
      onClick={captado ? undefined : onToggle}
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        captado
          ? "opacity-50 cursor-not-allowed bg-muted/30 border-border"
          : cn(
              "cursor-pointer hover:shadow-md",
              selected
                ? "border-[#e4405f] bg-[#e4405f]/5 shadow-sm"
                : "border-border bg-card hover:border-[#e4405f]/40"
            )
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          disabled={captado}
          onCheckedChange={() => !captado && onToggle()}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Instagram className="h-4 w-4 shrink-0" style={{ color: "#e4405f" }} />
            <h3 className={cn("text-sm font-semibold text-foreground truncate", captado && "line-through")}>
              {result.title}
            </h3>
            {captado && (
              <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30 whitespace-nowrap shrink-0">
                Já captado
              </Badge>
            )}
          </div>

          {username && (
            <p className="text-xs text-muted-foreground mb-1.5">@{username}</p>
          )}

          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {result.snippet}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-white text-[10px]"
                style={{ background: "linear-gradient(135deg, #e4405f, #833ab4)" }}
              >
                Instagram
              </Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Hash className="h-3 w-3" /> {result.position}
              </span>
            </div>
            <a
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: "#e4405f" }}
            >
              Visitar Perfil <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractUsername(link: string): string | null {
  try {
    const url = new URL(link);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 1) return parts[0];
  } catch {
    // fallback
  }
  return null;
}
