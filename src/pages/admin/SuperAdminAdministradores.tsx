import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  UserCog,
  Power,
  PowerOff,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAdministradores,
  criarAdministrador,
  atualizarAdministrador,
  deletarAdministrador,
  type Administrador,
} from "@/lib/super-admin-functions";
import { useToast } from "@/hooks/use-toast";

interface EditingForm {
  id?: number;
  nome: string;
  email: string;
  password: string;
  telefone: string;
  status: "ativo" | "inativo";
}

const emptyForm: EditingForm = {
  nome: "",
  email: "",
  password: "",
  telefone: "",
  status: "ativo",
};

export default function SuperAdminAdministradores() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Administrador | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdministradores()
      .then(setAdmins)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = admins.filter((a) => {
    const q = search.toLowerCase();
    return !q || a.email.toLowerCase().includes(q) || (a.nome || "").toLowerCase().includes(q);
  });

  const handleNew = () => {
    setEditing({ ...emptyForm });
    setShowPassword(false);
  };

  const handleEdit = (admin: Administrador) => {
    setEditing({
      id: admin.id,
      nome: admin.nome || "",
      email: admin.email,
      password: "",
      telefone: admin.telefone || "",
      status: admin.status as "ativo" | "inativo",
    });
    setShowPassword(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!editing.id && !editing.email.trim()) {
      toast({ title: "Email obrigatório", variant: "destructive" });
      return;
    }
    if (!editing.id && editing.password.length < 6) {
      toast({ title: "Senha mínima de 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await atualizarAdministrador(editing.id, {
          nome: editing.nome.trim(),
          telefone: editing.telefone.trim() || null,
          status: editing.status,
          ...(editing.password.length >= 6 ? { password: editing.password } : {}),
        });
        toast({ title: "Administrador atualizado" });
      } else {
        await criarAdministrador({
          nome: editing.nome.trim(),
          email: editing.email.trim().toLowerCase(),
          password: editing.password,
          telefone: editing.telefone.trim() || null,
        });
        toast({ title: "Administrador criado" });
      }
      setEditing(null);
      load();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletarAdministrador(confirmDelete.id);
      toast({ title: "Administrador removido" });
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast({
        title: "Erro ao remover",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie as contas com acesso ao backoffice (super admins)
            </p>
          </div>
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Administrador
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum administrador encontrado</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Administrador
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((admin) => {
                    const isSelf = dbUser?.id === admin.id;
                    return (
                      <tr
                        key={admin.id}
                        className={cn(
                          "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                          admin.status !== "ativo" && "opacity-60"
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCog className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {admin.nome || "Sem nome"}
                                </p>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    Você
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{admin.telefone || "—"}</td>
                        <td className="px-5 py-4 text-center">
                          {admin.status === "ativo" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                              <Power className="h-3 w-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
                              <PowerOff className="h-3 w-3" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center text-sm text-gray-500">
                          {formatDate(admin.created_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(admin)}
                              className="border-gray-200 text-gray-700 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDelete(admin)}
                              disabled={isSelf}
                              title={isSelf ? "Não pode remover a si mesmo" : ""}
                              className="border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 disabled:opacity-30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Editor */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? "Editar Administrador" : "Novo Administrador"}
              </DialogTitle>
              <DialogDescription>
                Super admins têm acesso total ao backoffice e podem gerenciar empresas,
                planos e outros administradores.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome completo</label>
                <Input
                  value={editing?.nome || ""}
                  onChange={(e) => setEditing((f) => f && { ...f, nome: e.target.value })}
                  placeholder="Ex.: João da Silva"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Email {editing?.id && <span className="text-[10px]">(não pode ser alterado)</span>}
                </label>
                <Input
                  type="email"
                  value={editing?.email || ""}
                  onChange={(e) => setEditing((f) => f && { ...f, email: e.target.value })}
                  disabled={!!editing?.id}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Senha{" "}
                  {editing?.id && <span className="text-[10px]">(deixe em branco para manter)</span>}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editing?.password || ""}
                    onChange={(e) => setEditing((f) => f && { ...f, password: e.target.value })}
                    placeholder={editing?.id ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                <Input
                  value={editing?.telefone || ""}
                  onChange={(e) => setEditing((f) => f && { ...f, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              {editing?.id && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Switch
                    checked={editing?.status === "ativo"}
                    onCheckedChange={(v) =>
                      setEditing((f) => f && { ...f, status: v ? "ativo" : "inativo" })
                    }
                  />
                  <span className="text-sm text-gray-600">
                    Conta ativa{" "}
                    <span className="text-xs text-gray-400">
                      (inativa não consegue fazer login)
                    </span>
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmar exclusão */}
        <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remover administrador</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover <strong>{confirmDelete?.nome || confirmDelete?.email}</strong>?
                Essa pessoa perderá o acesso ao backoffice imediatamente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
