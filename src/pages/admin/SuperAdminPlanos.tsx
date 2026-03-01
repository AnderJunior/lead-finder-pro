import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  Users,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchPlanos, upsertPlano, deletePlano, type Plano } from "@/lib/super-admin-functions";
import { useToast } from "@/hooks/use-toast";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const emptyPlano: Partial<Plano> = {
  nome: "",
  descricao: "",
  preco_mensal: 0,
  preco_anual: 0,
  max_usuarios: 5,
  max_leads: 1000,
  max_buscas_mes: 100,
  recursos: [],
  ativo: true,
};

export default function SuperAdminPlanos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Plano> | null>(null);
  const [saving, setSaving] = useState(false);
  const [recursosText, setRecursosText] = useState("");
  const { toast } = useToast();

  const loadPlanos = () => {
    setLoading(true);
    fetchPlanos()
      .then(setPlanos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPlanos(); }, []);

  const handleEdit = (plano: Plano) => {
    setEditing(plano);
    setRecursosText((plano.recursos || []).join("\n"));
  };

  const handleNew = () => {
    setEditing({ ...emptyPlano });
    setRecursosText("");
  };

  const handleSave = async () => {
    if (!editing?.nome) return;
    setSaving(true);
    try {
      await upsertPlano({
        ...editing,
        nome: editing.nome!,
        recursos: recursosText.split("\n").map((r) => r.trim()).filter(Boolean),
      });
      toast({ title: "Plano salvo com sucesso" });
      setEditing(null);
      loadPlanos();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    try {
      await deletePlano(id);
      toast({ title: "Plano excluído" });
      loadPlanos();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie os planos disponíveis no sistema</p>
          </div>
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : planos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum plano cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className={cn(
                  "rounded-xl border bg-white p-6 flex flex-col gap-4 relative shadow-sm",
                  plano.ativo ? "border-gray-200" : "border-gray-200 opacity-60"
                )}
              >
                {!plano.ativo && (
                  <span className="absolute top-3 right-3 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Inativo</span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plano.nome}</h3>
                  {plano.descricao && <p className="text-sm text-gray-500 mt-1">{plano.descricao}</p>}
                </div>

                <div className="space-y-1">
                  <p className="text-3xl font-bold text-gray-900">
                    {currency(plano.preco_mensal)}
                    <span className="text-sm font-normal text-gray-400">/mês</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    ou {currency(plano.preco_anual)}/ano
                  </p>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 text-gray-400" />
                    Até {plano.max_usuarios} usuários
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4 text-gray-400" />
                    Até {plano.max_leads.toLocaleString("pt-BR")} leads
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Search className="h-4 w-4 text-gray-400" />
                    {plano.max_buscas_mes.toLocaleString("pt-BR")} buscas/mês
                  </div>
                  {plano.recursos.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      {plano.recursos.map((recurso, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          {recurso}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(plano)}
                    className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(plano.id)}
                    className="border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog de edição */}
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gray-900">
                {editing?.id ? "Editar Plano" : "Novo Plano"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <Input
                  value={editing?.nome || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, nome: e.target.value }))}
                  className="bg-white border-gray-200 text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <Input
                  value={editing?.descricao || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, descricao: e.target.value }))}
                  className="bg-white border-gray-200 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preço Mensal (R$)</label>
                  <Input
                    type="number"
                    value={editing?.preco_mensal || 0}
                    onChange={(e) => setEditing((p) => ({ ...p, preco_mensal: Number(e.target.value) }))}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preço Anual (R$)</label>
                  <Input
                    type="number"
                    value={editing?.preco_anual || 0}
                    onChange={(e) => setEditing((p) => ({ ...p, preco_anual: Number(e.target.value) }))}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Máx. Usuários</label>
                  <Input
                    type="number"
                    value={editing?.max_usuarios || 0}
                    onChange={(e) => setEditing((p) => ({ ...p, max_usuarios: Number(e.target.value) }))}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Máx. Leads</label>
                  <Input
                    type="number"
                    value={editing?.max_leads || 0}
                    onChange={(e) => setEditing((p) => ({ ...p, max_leads: Number(e.target.value) }))}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Buscas/mês</label>
                  <Input
                    type="number"
                    value={editing?.max_buscas_mes || 0}
                    onChange={(e) => setEditing((p) => ({ ...p, max_buscas_mes: Number(e.target.value) }))}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recursos (um por linha)</label>
                <Textarea
                  value={recursosText}
                  onChange={(e) => setRecursosText(e.target.value)}
                  rows={4}
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="Dashboard&#10;Funil avançado&#10;Relatórios"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editing?.ativo ?? true}
                  onCheckedChange={(v) => setEditing((p) => ({ ...p, ativo: v }))}
                />
                <span className="text-sm text-gray-600">Plano ativo</span>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditing(null)}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !editing?.nome}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
