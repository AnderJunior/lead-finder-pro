import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Building2,
  ArrowLeft,
  Users,
  FileText,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  UserCircle,
  Loader2,
  Power,
  PowerOff,
  Hash,
  AlertTriangle,
  Calendar,
  DollarSign,
  Trash2,
  CreditCard,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import {
  fetchEmpresaDetalhes,
  fetchUsuariosEmpresa,
  fetchPagamentosEmpresa,
  toggleEmpresaAtiva,
  deleteEmpresaCompleta,
  type EmpresaResumo,
  type UsuarioGlobal,
  type Pagamento,
} from "@/lib/super-admin-functions";
import { useToast } from "@/hooks/use-toast";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcMonths(dateStr: string | null): number {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const now = new Date();
  const diff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(diff, 0);
}

const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  super_admin: { label: "Super Admin", icon: Shield, color: "text-primary bg-primary/5 border-primary/20" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-blue-700 bg-blue-50 border-blue-200" },
  user: { label: "Vendedor", icon: UserCircle, color: "text-gray-600 bg-gray-100 border-gray-200" },
};

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inativo: "bg-red-50 text-red-700 border-red-200",
  suspenso: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const assinaturaStatusColors: Record<string, string> = {
  ativa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vencida: "bg-red-50 text-red-700 border-red-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  cancelada: "bg-gray-100 text-gray-500 border-gray-200",
  suspensa: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function SuperAdminEmpresaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [empresa, setEmpresa] = useState<EmpresaResumo | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioGlobal[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const empresaId = Number(id);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchEmpresaDetalhes(empresaId),
      fetchUsuariosEmpresa(empresaId),
      fetchPagamentosEmpresa(empresaId),
    ])
      .then(([emp, users, pags]) => {
        setEmpresa(emp);
        setUsuarios(users);
        setPagamentos(pags);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (empresaId) loadData();
  }, [empresaId]);

  const handleToggle = async () => {
    if (!empresa) return;
    setToggling(true);
    try {
      await toggleEmpresaAtiva(empresaId, !empresa.ativo);
      toast({ title: empresa.ativo ? "Empresa desativada" : "Empresa reativada" });
      setShowConfirm(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEmpresaCompleta(empresaId);
      toast({ title: "Empresa excluída com sucesso" });
      navigate("/admin/empresas", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro ao excluir empresa", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!empresa) {
    return (
      <SuperAdminLayout>
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/admin/empresas")} className="text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Empresa não encontrada</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const mesesAtivo = calcMonths(empresa.created_at);

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/empresas")} className="text-gray-500 hover:text-white hover:bg-primary mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                {empresa.logo_url ? (
                  <img src={empresa.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className={cn("text-2xl font-bold", empresa.pagamento_atrasado ? "text-red-600" : "text-gray-900")}>{empresa.nome || "Sem nome"}</h1>
                  {!empresa.ativo && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                      Desativada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {empresa.assinatura_status && (
                    <>
                      <span className="text-sm text-gray-500">Assinatura:</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border", assinaturaStatusColors[empresa.assinatura_status])}>
                        {empresa.assinatura_status}
                      </span>
                    </>
                  )}
                  <span className="text-sm text-gray-300">·</span>
                  <span className="text-sm text-gray-500">Pagamento:</span>
                  {empresa.pagamento_atrasado ? (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                      Atrasado
                    </span>
                  ) : empresa.assinatura_status ? (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Em dia
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(true)}
              disabled={toggling}
              className={cn(
                "border-gray-200",
                empresa.ativo
                  ? "text-red-600 hover:bg-red-50 hover:border-red-200 hover:text-red-800"
                  : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800"
              )}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : empresa.ativo ? (
                <PowerOff className="h-4 w-4 mr-2" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              {empresa.ativo ? "Desativar Empresa" : "Reativar Empresa"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDelete(true)}
              className="border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Tempo Ativo</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {mesesAtivo} <span className="text-sm font-normal text-gray-400">{mesesAtivo === 1 ? "mês" : "meses"}</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">Investimento Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{currency(empresa.investimento_total)}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                <Users className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <span className="text-sm text-gray-500">Usuários</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{empresa.total_usuarios}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <FileText className="h-4.5 w-4.5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">Leads</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{empresa.total_leads.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Info + Usuários: 30% / 70% */}
        <div className="flex gap-6 items-start">
          {/* Informações da Empresa — 30% */}
          <div className="w-[30%] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Informações</h2>
            </div>
            <div className="p-5 space-y-5">
              {empresa.created_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Data de Ativação</p>
                    <p className="text-sm text-gray-900">{formatDate(empresa.created_at)}</p>
                  </div>
                </div>
              )}
              {empresa.cnpj && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">CNPJ</p>
                    <p className="text-sm text-gray-900 font-mono">{empresa.cnpj}</p>
                  </div>
                </div>
              )}
              {empresa.email_comercial && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Email Comercial</p>
                    <p className="text-sm text-gray-900 break-all">{empresa.email_comercial}</p>
                  </div>
                </div>
              )}
              {empresa.telefone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Telefone</p>
                    <p className="text-sm text-gray-900">{empresa.telefone}</p>
                  </div>
                </div>
              )}
              {empresa.endereco && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Endereço</p>
                    <p className="text-sm text-gray-900">{empresa.endereco}</p>
                  </div>
                </div>
              )}
              {empresa.plano_nome && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Plano</p>
                    <p className="text-sm text-gray-900">{empresa.plano_nome}</p>
                  </div>
                </div>
              )}
              {empresa.assinatura_vencimento && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Vencimento Assinatura</p>
                    <p className="text-sm text-gray-900">{formatDate(empresa.assinatura_vencimento)}</p>
                  </div>
                </div>
              )}
              {!empresa.cnpj && !empresa.email_comercial && !empresa.telefone && !empresa.endereco && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma informação cadastrada</p>
              )}
            </div>
          </div>

          {/* Tabela de Usuários — 70% */}
          <div className="flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Usuários da Empresa
                <span className="text-gray-400 font-normal ml-2">({usuarios.length})</span>
              </h2>
            </div>
            {usuarios.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cargo</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((user) => {
                      const role = roleLabels[user.role || "user"] || roleLabels.user;
                      const RoleIcon = role.icon;
                      return (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-sm font-semibold text-gray-400 uppercase">
                                    {(user.nome || user.email).charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user.nome || "Sem nome"}</p>
                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">{user.telefone || "—"}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", role.color)}>
                              <RoleIcon className="h-3 w-3" />
                              {role.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={cn("text-xs px-2.5 py-1 rounded-full border", statusColors[user.status] || "text-gray-400")}>
                              {user.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Histórico de Pagamentos
              <span className="text-gray-400 font-normal ml-2">({pagamentos.length})</span>
            </h2>
          </div>
          {pagamentos.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Nenhum pagamento registrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimento</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagamento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((pag) => {
                    const isLate = pag.status === "atrasado" || (pag.status === "pendente" && new Date(pag.data_vencimento) < new Date());
                    return (
                      <tr key={pag.id} className={cn("border-b border-gray-100 hover:bg-gray-50 transition-colors", isLate && "bg-red-50/50")}>
                        <td className="px-5 py-3 text-center text-sm font-semibold text-gray-900">{currency(pag.valor)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border",
                            pag.status === "pago" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            pag.status === "pendente" && !isLate && "bg-yellow-50 text-yellow-700 border-yellow-200",
                            (pag.status === "atrasado" || isLate) && "bg-red-50 text-red-700 border-red-200",
                            pag.status === "cancelado" && "bg-gray-100 text-gray-500 border-gray-200",
                          )}>
                            {pag.status === "pago" && <CheckCircle2 className="h-3 w-3" />}
                            {(pag.status === "atrasado" || isLate) && <AlertTriangle className="h-3 w-3" />}
                            {pag.status === "pendente" && !isLate && <Clock className="h-3 w-3" />}
                            {isLate && pag.status === "pendente" ? "Atrasado" : pag.status}
                          </span>
                        </td>
                        <td className={cn("px-5 py-3 text-center text-sm", isLate ? "text-red-600 font-medium" : "text-gray-500")}>
                          {formatDate(pag.data_vencimento)}
                        </td>
                        <td className="px-5 py-3 text-center text-sm text-gray-500">{formatDate(pag.data_pagamento)}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{pag.metodo_pagamento || "—"}</td>
                        <td className="px-5 py-3 text-center">
                          {(pag as any).asaas_invoice_url ? (
                            <a href={(pag as any).asaas_invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                              Ver fatura
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <div className="flex items-start gap-4">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              empresa.ativo ? "bg-red-50" : "bg-emerald-50"
            )}>
              {empresa.ativo
                ? <AlertTriangle className="h-5 w-5 text-red-500" />
                : <Power className="h-5 w-5 text-emerald-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-left text-gray-900">
                  {empresa.ativo ? "Desativar Empresa" : "Reativar Empresa"}
                </DialogTitle>
                <DialogDescription className="text-left text-gray-500">
                  {empresa.ativo ? (
                    <>
                      Tem certeza que deseja desativar a empresa{" "}
                      <strong className="text-gray-700">{empresa.nome || "esta empresa"}</strong>?
                      <span className="text-red-500 text-xs mt-2 block">
                        Todos os usuários desta empresa perderão o acesso à plataforma imediatamente.
                      </span>
                    </>
                  ) : (
                    <>
                      Deseja reativar a empresa{" "}
                      <strong className="text-gray-700">{empresa.nome || "esta empresa"}</strong>?
                      <span className="text-emerald-600 text-xs mt-2 block">
                        Todos os usuários desta empresa voltarão a ter acesso à plataforma.
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={toggling}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleToggle}
              disabled={toggling}
              className={cn(
                "text-white",
                empresa.ativo
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {toggling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {empresa.ativo ? "Sim, desativar" : "Sim, reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Excluir Empresa */}
      <Dialog open={showDelete} onOpenChange={(open) => { if (!open && !deleting) setShowDelete(false); }}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-left text-gray-900">
                  Excluir Empresa Permanentemente
                </DialogTitle>
                <DialogDescription className="text-left text-gray-500">
                  Tem certeza que deseja excluir a empresa{" "}
                  <strong className="text-gray-700">{empresa.nome || "esta empresa"}</strong>?
                  <span className="text-red-500 text-xs mt-2 block font-medium">
                    Esta ação é irreversível. Serão removidos permanentemente:
                  </span>
                  <ul className="text-red-500 text-xs mt-1 space-y-0.5 list-disc list-inside">
                    <li>Todos os {usuarios.length} usuários e suas contas de acesso</li>
                    <li>Todos os leads, buscas e dados do funil</li>
                    <li>Assinaturas e histórico de pagamentos</li>
                    <li>Configurações e integrações</li>
                  </ul>
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sim, excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
