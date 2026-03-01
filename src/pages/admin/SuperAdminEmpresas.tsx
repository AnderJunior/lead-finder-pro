import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Building2,
  Search,
  Users,
  Loader2,
  MoreVertical,
  Eye,
  Power,
  PowerOff,
  AlertTriangle,
  Plus,
  Check,
  Mail,
  Phone,
  MapPin,
  Hash,
  Calendar,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  fetchTodasEmpresas,
  fetchPlanos,
  toggleEmpresaAtiva,
  createEmpresaCompleta,
  deleteEmpresaCompleta,
  type EmpresaResumo,
  type Plano,
  type NovaEmpresaPayload,
} from "@/lib/super-admin-functions";
import { useToast } from "@/hooks/use-toast";

function ActionMenu({
  empresa,
  onDetails,
  onToggle,
  onDelete,
}: {
  empresa: EmpresaResumo;
  onDetails: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right - 208 });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          <button
            onClick={() => { setOpen(false); onDetails(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-4 w-4 text-gray-400" />
            Visualizar Detalhes
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { setOpen(false); onToggle(); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
              empresa.ativo
                ? "text-red-600 hover:bg-red-50"
                : "text-emerald-600 hover:bg-emerald-50"
            )}
          >
            {empresa.ativo ? (
              <><PowerOff className="h-4 w-4" /> Desativar Empresa</>
            ) : (
              <><Power className="h-4 w-4" /> Reativar Empresa</>
            )}
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Empresa
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CICLO_OPTIONS = [
  { value: "mensal", label: "1 mês", meses: 1 },
  { value: "trimestral", label: "3 meses", meses: 3 },
  { value: "semestral", label: "6 meses", meses: 6 },
  { value: "anual", label: "12 meses", meses: 12 },
] as const;

type CicloValue = (typeof CICLO_OPTIONS)[number]["value"];

interface NovaEmpresaForm {
  nome: string;
  cnpj: string;
  email_comercial: string;
  telefone: string;
  endereco: string;
  plano_id: number | null;
  ciclo: CicloValue;
  data_vencimento: string;
}

const EMPTY_FORM: NovaEmpresaForm = {
  nome: "",
  cnpj: "",
  email_comercial: "",
  telefone: "",
  endereco: "",
  plano_id: null,
  ciclo: "mensal",
  data_vencimento: "",
};

export default function SuperAdminEmpresas() {
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<EmpresaResumo | null>(null);
  const [toggling, setToggling] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Nova Empresa
  const [showNew, setShowNew] = useState(false);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [form, setForm] = useState<NovaEmpresaForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Excluir Empresa
  const [deleteTarget, setDeleteTarget] = useState<EmpresaResumo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEmpresas = () => {
    setLoading(true);
    fetchTodasEmpresas()
      .then(setEmpresas)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEmpresas(); }, []);

  const handleOpenNew = () => {
    setForm(EMPTY_FORM);
    setShowNew(true);
    if (planos.length === 0) {
      fetchPlanos().then(setPlanos).catch(console.error);
    }
  };

  const selectedPlano = planos.find((p) => p.id === form.plano_id) ?? null;
  const cicloInfo = CICLO_OPTIONS.find((c) => c.value === form.ciclo)!;

  const calcValor = (): number => {
    if (!selectedPlano) return 0;
    if (form.ciclo === "anual") return selectedPlano.preco_anual;
    return selectedPlano.preco_mensal * cicloInfo.meses;
  };

  const canCreate = form.nome.trim() && form.email_comercial.trim() && form.cnpj.trim() && form.plano_id;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const payload: NovaEmpresaPayload = {
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email_comercial: form.email_comercial.trim(),
        endereco: form.endereco.trim() || undefined,
        plano_id: form.plano_id!,
        ciclo: form.ciclo,
        data_vencimento: form.data_vencimento || undefined,
      };

      await createEmpresaCompleta(payload);

      toast({
        title: "Empresa criada com sucesso",
        description: `Um e-mail de redefinição de senha foi enviado para ${payload.email_comercial}`,
      });
      setShowNew(false);
      loadEmpresas();
    } catch (err: any) {
      toast({ title: "Erro ao criar empresa", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    setToggling(true);
    try {
      const novoEstado = !confirmTarget.ativo;
      await toggleEmpresaAtiva(confirmTarget.id, novoEstado);
      toast({ title: novoEstado ? "Empresa reativada com sucesso" : "Empresa desativada com sucesso" });
      setConfirmTarget(null);
      loadEmpresas();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmpresaCompleta(deleteTarget.id);
      toast({ title: "Empresa excluída com sucesso", description: `${deleteTarget.nome || "Empresa"} e todos os dados associados foram removidos.` });
      setDeleteTarget(null);
      loadEmpresas();
    } catch (err: any) {
      toast({ title: "Erro ao excluir empresa", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = empresas.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (e.nome || "").toLowerCase().includes(q) ||
      (e.cnpj || "").toLowerCase().includes(q)
    );
  });

  const isDesativar = confirmTarget?.ativo === true;

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-sm text-gray-500 mt-1">
              {empresas.length} empresas cadastradas no sistema
            </p>
          </div>
          <Button onClick={handleOpenNew} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {search ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CNPJ</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuários</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagamento</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimento</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((empresa) => {
                    const atrasado = empresa.pagamento_atrasado;
                    return (
                    <tr
                      key={empresa.id}
                      className={cn(
                        "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                        !empresa.ativo && "opacity-50",
                        atrasado && "bg-red-50/40"
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center overflow-hidden", atrasado ? "bg-red-100" : "bg-gray-100")}>
                            {empresa.logo_url ? (
                              <img src={empresa.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className={cn("h-4 w-4", atrasado ? "text-red-400" : "text-gray-400")} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn("text-sm font-medium truncate", atrasado ? "text-red-600" : "text-gray-900")}>{empresa.nome || "Sem nome"}</p>
                              {!empresa.ativo && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 shrink-0">
                                  Desativada
                                </span>
                              )}
                            </div>
                            {empresa.email_comercial && (
                              <p className="text-xs text-gray-400 truncate">{empresa.email_comercial}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 font-mono">{empresa.cnpj || "—"}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{empresa.total_usuarios}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {empresa.plano_nome ? (
                          <span className="text-sm text-gray-700">{empresa.plano_nome}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {atrasado ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-200">
                            Atrasado
                          </span>
                        ) : empresa.assinatura_status ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Em dia
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-gray-500">
                        {formatDate(empresa.assinatura_vencimento)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <ActionMenu
                          empresa={empresa}
                          onDetails={() => navigate(`/admin/empresas/${empresa.id}`)}
                          onToggle={() => setConfirmTarget(empresa)}
                          onDelete={() => setDeleteTarget(empresa)}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nova Empresa */}
      <Dialog open={showNew} onOpenChange={(open) => { if (!open && !creating) setShowNew(false); }}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Nova Empresa
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Preencha as informações e selecione o plano. Um e-mail de acesso será enviado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* ── Seção 1: Informações da Empresa ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                Informações da Empresa
              </h3>
              <div className="space-y-3 pl-8">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nome da Empresa *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      placeholder="Razão social ou nome fantasia"
                      className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">E-mail Comercial * <span className="text-gray-400">(será usado como login)</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={form.email_comercial}
                      onChange={(e) => setForm((f) => ({ ...f, email_comercial: e.target.value }))}
                      placeholder="contato@empresa.com"
                      className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">CPF/CNPJ *</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={form.cnpj}
                        onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                        className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={form.telefone}
                        onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={form.endereco}
                      onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                      placeholder="Rua, número, cidade - UF"
                      className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* ── Seção 2: Seleção do Plano ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                Seleção do Plano
              </h3>
              <div className="space-y-4 pl-8">
                {/* Cards de plano */}
                {planos.filter((p) => p.ativo).length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Carregando planos...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {planos.filter((p) => p.ativo).map((plano) => {
                      const isSelected = form.plano_id === plano.id;
                      return (
                        <button
                          key={plano.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, plano_id: plano.id }))}
                          className={cn(
                            "relative rounded-xl border-2 p-4 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <p className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-gray-900")}>
                            {plano.nome}
                          </p>
                          {plano.descricao && (
                            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{plano.descricao}</p>
                          )}
                          <p className="text-lg font-bold mt-2 text-gray-900">
                            {currency(plano.preco_mensal)}
                            <span className="text-xs font-normal text-gray-400">/mês</span>
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Users className="h-3 w-3" /> {plano.max_usuarios} usuários
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Search className="h-3 w-3" /> {plano.max_buscas_mes} buscas/mês
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Período */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Período da assinatura</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CICLO_OPTIONS.map((opt) => {
                      const isSelected = form.ciclo === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, ciclo: opt.value }))}
                          className={cn(
                            "rounded-lg border-2 py-2.5 px-3 text-center transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 text-primary font-semibold"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          )}
                        >
                          <span className="text-sm">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Data de vencimento */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Data do primeiro vencimento <span className="text-gray-400">(opcional — se vazio, calcula automaticamente)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={form.data_vencimento}
                      onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))}
                      className="pl-9 bg-white border-gray-200 text-gray-900"
                    />
                  </div>
                </div>

                {/* Resumo */}
                {selectedPlano && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Resumo da assinatura</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {selectedPlano.nome} · {cicloInfo.label}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Valor total</p>
                        <p className="text-lg font-bold text-gray-900">{currency(calcValor())}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {form.data_vencimento
                        ? `Primeiro vencimento em ${new Date(form.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}`
                        : `Vencimento em ${cicloInfo.meses === 1 ? "1 mês" : `${cicloInfo.meses} meses`} a partir da criação`
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setShowNew(false)}
              disabled={creating}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !canCreate}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <div className="flex items-start gap-4">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              isDesativar ? "bg-red-50" : "bg-emerald-50"
            )}>
              {isDesativar
                ? <AlertTriangle className="h-5 w-5 text-red-500" />
                : <Power className="h-5 w-5 text-emerald-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-left text-gray-900">
                  {isDesativar ? "Desativar Empresa" : "Reativar Empresa"}
                </DialogTitle>
                <DialogDescription className="text-left text-gray-500">
                  {isDesativar ? (
                    <>
                      Tem certeza que deseja desativar a empresa{" "}
                      <strong className="text-gray-700">{confirmTarget?.nome || "esta empresa"}</strong>?
                      <span className="text-red-500 text-xs mt-2 block">
                        Todos os usuários desta empresa perderão o acesso à plataforma imediatamente.
                      </span>
                    </>
                  ) : (
                    <>
                      Deseja reativar a empresa{" "}
                      <strong className="text-gray-700">{confirmTarget?.nome || "esta empresa"}</strong>?
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
              onClick={() => setConfirmTarget(null)}
              disabled={toggling}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmToggle}
              disabled={toggling}
              className={cn(
                "text-white",
                isDesativar
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {toggling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isDesativar ? "Sim, desativar" : "Sim, reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Excluir Empresa */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
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
                  <strong className="text-gray-700">{deleteTarget?.nome || "esta empresa"}</strong>?
                  <span className="text-red-500 text-xs mt-2 block font-medium">
                    Esta ação é irreversível. Serão removidos permanentemente:
                  </span>
                  <ul className="text-red-500 text-xs mt-1 space-y-0.5 list-disc list-inside">
                    <li>Todos os usuários e suas contas de acesso</li>
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
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
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
