import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Coins, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  fetchPacotesCreditos,
  adicionarCreditosEmpresa,
  type PacoteCredito,
  type EmpresaResumo,
} from "@/lib/super-admin-functions";

interface Props {
  empresa: EmpresaResumo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdicionarCreditosDialog({ empresa, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [pacotes, setPacotes] = useState<PacoteCredito[]>([]);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [selectedPacoteId, setSelectedPacoteId] = useState<number | "custom">("custom");
  const [quantidade, setQuantidade] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedPacoteId("custom");
    setQuantidade(0);
    setLoadingPacotes(true);
    fetchPacotesCreditos()
      .then(setPacotes)
      .catch(console.error)
      .finally(() => setLoadingPacotes(false));
  }, [open]);

  function handleSelectPacote(pacote: PacoteCredito) {
    setSelectedPacoteId(pacote.id);
    setQuantidade(pacote.quantidade);
  }

  function handleSelectCustom() {
    setSelectedPacoteId("custom");
    setQuantidade(0);
  }

  async function handleConfirm() {
    if (!empresa || quantidade <= 0) return;
    setSaving(true);
    try {
      const result = await adicionarCreditosEmpresa(empresa.id, quantidade);
      toast({
        title: `+${quantidade} créditos adicionados`,
        description: `${empresa.nome} agora tem ${result.creditos.toLocaleString("pt-BR")} créditos.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar créditos",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!empresa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Adicionar Créditos</DialogTitle>
              <DialogDescription>
                {empresa.nome} · saldo atual: {empresa.creditos.toLocaleString("pt-BR")} créditos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Escolha um pacote</p>
            {loadingPacotes ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando pacotes...
              </div>
            ) : pacotes.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded">
                Nenhum pacote cadastrado. Use a opção "Quantidade personalizada" abaixo, ou cadastre pacotes em Assinaturas → Pacotes de Créditos.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {pacotes.map((p) => {
                  const selected = selectedPacoteId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPacote(p)}
                      className={cn(
                        "border rounded-lg p-3 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <div className="font-medium text-sm">{p.nome}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.quantidade.toLocaleString("pt-BR")} créditos
                        {p.preco > 0 && ` · ${currency(p.preco)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleSelectCustom}
              className={cn(
                "w-full border rounded-lg p-3 text-left transition-all",
                selectedPacoteId === "custom"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div className="font-medium text-sm">Quantidade personalizada</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Defina o número de créditos manualmente
              </div>
            </button>
          </div>

          {selectedPacoteId === "custom" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Quantidade a adicionar
              </label>
              <Input
                type="number"
                min={1}
                value={quantidade || ""}
                onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
                placeholder="Ex.: 500"
                className="text-base font-mono"
                autoFocus
              />
            </div>
          )}

          {quantidade > 0 && (
            <p className="text-xs text-muted-foreground">
              Saldo após adição:{" "}
              <span className="font-semibold text-foreground">
                {(empresa.creditos + quantidade).toLocaleString("pt-BR")} créditos
              </span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={quantidade <= 0 || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar {quantidade > 0 ? `+${quantidade.toLocaleString("pt-BR")}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
