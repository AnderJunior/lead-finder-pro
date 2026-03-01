import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings as SettingsIcon,
  Building2,
  Users as UsersIcon,
  Puzzle,
  Save,
  Loader2,
  UserPlus,
  Shield,
  User,
  Eye,
  EyeOff,
  Map,
  Search,
  MessageSquare,
  Camera,
  Lock,
  Target,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  CreditCard,
  CalendarClock,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  createUserAsAdmin,
  deleteUserAsAdmin,
  fetchMetas,
  fetchMetasVendedor,
  upsertMeta,
  deleteMeta,
  upsertMetaVendedor,
  deleteMetaVendedor,
  type Meta,
  type MetaVendedor,
} from "@/lib/supabase-functions";
import { supabase } from "@/lib/supabase";
import { invalidateIntegracoesCache } from "@/lib/integracoes-config";

// ─── Schemas ────────────────────────────────────────────────────────

const empresaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email_comercial: z.string().email("E-mail inválido").optional().or(z.literal("")),
});

type EmpresaFormValues = z.infer<typeof empresaSchema>;

const createUserSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["admin", "user"]),
  plano: z.enum(["básico", "premium", "empresarial"]),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface DbUserRow {
  id: number;
  email: string;
  nome: string | null;
  role: string | null;
  status: string | null;
  plano: string | null;
  created_at: string;
}

// ─── Aba Perfil ─────────────────────────────────────────────────────

function TabPerfil() {
  const { dbUser, reloadProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(dbUser?.nome || "");
  const [email, setEmail] = useState(dbUser?.email || "");
  const [telefone, setTelefone] = useState(dbUser?.telefone || "");
  const [avatarUrl, setAvatarUrl] = useState(dbUser?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setNome(dbUser.nome || "");
      setEmail(dbUser.email || "");
      setTelefone(dbUser.telefone || "");
      setAvatarUrl(dbUser.avatar_url || "");
    }
  }, [dbUser]);

  function getInitials(name: string | null, fallbackEmail: string) {
    if (name) {
      return name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return fallbackEmail.slice(0, 2).toUpperCase();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !dbUser) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem JPG ou PNG.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${dbUser.auth_id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", dbUser.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl.publicUrl);
      await reloadProfile();
      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi alterada." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err?.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveProfile() {
    if (!dbUser) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      };

      if (email.trim() !== dbUser.email) {
        const { error: authErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (authErr) throw authErr;
        updates.email = email.trim();
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", dbUser.id);

      if (error) throw error;

      await reloadProfile();
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não conferem", description: "A confirmação da senha está diferente.", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);
    } catch (err: any) {
      toast({ title: "Erro ao alterar senha", description: err?.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} alt={nome} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {getInitials(nome, email)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Camera className="h-4 w-4 mr-2" />
                Alterar foto
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG até 5MB</p>
            </div>
          </div>

          <Separator />

          {/* Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-nome">Nome completo</Label>
              <Input
                id="profile-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-telefone">Telefone</Label>
              <Input
                id="profile-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Input
                value={dbUser?.role || "user"}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Alterar senha</p>
              <p className="text-xs text-muted-foreground">Atualize sua senha de acesso</p>
            </div>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">Alterar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar senha</DialogTitle>
                  <DialogDescription>
                    Digite sua nova senha abaixo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      disabled={changingPassword}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      disabled={changingPassword}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordDialog(false)}
                    disabled={changingPassword}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword ? "Alterando..." : "Confirmar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aba Empresa ────────────────────────────────────────────────────

function TabEmpresa() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { nome: "", cnpj: "", endereco: "", telefone: "", email_comercial: "" },
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("configuracoes_empresa")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        setEmpresaId(data.id);
        setLogoUrl(data.logo_url || "");
        form.reset({
          nome: data.nome || "",
          cnpj: data.cnpj || "",
          endereco: data.endereco || "",
          telefone: data.telefone || "",
          email_comercial: data.email_comercial || "",
        });
      }
      setLoading(false);
    })();
  }, [form]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem JPG ou PNG.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `empresa-${empresaId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("configuracoes_empresa")
        .update({ logo_url: publicUrl.publicUrl })
        .eq("id", empresaId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl.publicUrl);
      toast({ title: "Logo atualizada", description: "A logo da empresa foi alterada." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err?.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function onSubmit(values: EmpresaFormValues) {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("configuracoes_empresa")
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        ...values,
        updated_at: new Date().toISOString(),
        updated_by: dbUser?.id ?? null,
      };

      if (existing) {
        const { error } = await supabase
          .from("configuracoes_empresa")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        setEmpresaId(existing.id);
      } else {
        const { data, error } = await supabase.from("configuracoes_empresa").insert({
          ...payload,
        }).select("id").single();
        if (error) throw error;
        if (data) setEmpresaId(data.id);
      }

      toast({ title: "Salvo", description: "Dados da empresa atualizados." });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription className="mt-1.5">
              Configure as informações da sua empresa.
            </CardDescription>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo da Empresa */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 rounded-lg border-2 border-primary/20">
              <AvatarImage src={logoUrl || undefined} alt="Logo da empresa" className="object-contain" />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xl font-bold">
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              {uploadingLogo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              <Camera className="h-4 w-4 mr-2" />
              Alterar logo
            </Button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG até 5MB</p>
          </div>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Minha Empresa LTDA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0001-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua Exemplo, 123 - Centro, São Paulo/SP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email_comercial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail Comercial</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contato@empresa.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Aba Vendedores ─────────────────────────────────────────────────

function MetasVendedorDialog({
  userId,
  userName,
  metas,
  metasVendedor,
  empresaId,
  onSaved,
}: {
  userId: number;
  userName: string;
  metas: Meta[];
  metasVendedor: MetaVendedor[];
  empresaId: number;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [localValues, setLocalValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const vals: Record<number, string> = {};
    for (const m of metas) {
      const override = metasVendedor.find((mv) => mv.meta_id === m.id && mv.user_id === userId);
      vals[m.id] = override ? String(override.valor) : "";
    }
    setLocalValues(vals);
  }, [metas, metasVendedor, userId]);

  async function handleSave() {
    setSaving(true);
    try {
      for (const meta of metas) {
        const rawVal = localValues[meta.id]?.trim();
        const hasOverride = metasVendedor.some((mv) => mv.meta_id === meta.id && mv.user_id === userId);

        if (!rawVal || rawVal === "") {
          if (hasOverride) {
            await deleteMetaVendedor(meta.id, userId);
          }
          continue;
        }

        const val = parseInt(rawVal, 10);
        if (isNaN(val) || val < 0) continue;

        await upsertMetaVendedor({ meta_id: meta.id, user_id: userId, valor: val, empresa_id: empresaId });
      }
      toast({ title: "Metas atualizadas", description: `Metas de ${userName} foram salvas.` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Erro ao salvar metas", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        Deixe em branco para usar a meta geral. Preencha para definir meta personalizada.
      </p>
      {metas.map((meta) => (
        <div key={meta.id} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{meta.nome}</p>
            <p className="text-xs text-muted-foreground">Geral: {meta.valor}</p>
          </div>
          <Input
            type="number"
            min={0}
            className="w-28 h-9"
            placeholder={String(meta.valor)}
            value={localValues[meta.id] ?? ""}
            onChange={(e) =>
              setLocalValues((prev) => ({ ...prev, [meta.id]: e.target.value }))
            }
            disabled={saving}
          />
        </div>
      ))}
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar metas
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function TabVendedores() {
  const { isAdmin, dbUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<DbUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [metas, setMetas] = useState<Meta[]>([]);
  const [metasVendedor, setMetasVendedor] = useState<MetaVendedor[]>([]);
  const [metaDialogUserId, setMetaDialogUserId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DbUserRow | null>(null);
  const [transferToUserId, setTransferToUserId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { nome: "", email: "", password: "", role: "user", plano: "básico" },
  });

  const loadAll = useCallback(async () => {
    if (!isAdmin || !dbUser) return;
    setLoading(true);
    const [usersRes, metasRes, metasVendedorRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, email, nome, role, status, plano, created_at")
        .eq("empresa_id", dbUser.empresa_id)
        .order("created_at", { ascending: false }),
      fetchMetas().catch(() => [] as Meta[]),
      fetchMetasVendedor().catch(() => [] as MetaVendedor[]),
    ]);
    if (!usersRes.error) setUsers((usersRes.data as DbUserRow[]) || []);
    setMetas(metasRes as Meta[]);
    setMetasVendedor(metasVendedorRes as MetaVendedor[]);
    setLoading(false);
  }, [isAdmin, dbUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function onSubmit(values: CreateUserFormValues) {
    setIsSubmitting(true);
    try {
      await createUserAsAdmin({
        nome: values.nome,
        email: values.email,
        password: values.password,
        role: values.role,
        plano: values.plano,
        empresa_id: dbUser!.empresa_id,
      });
      toast({
        title: "Vendedor criado",
        description: `${values.nome} foi cadastrado com sucesso.`,
      });
      form.reset({ nome: "", email: "", password: "", role: "user", plano: "básico" });
      setDialogOpen(false);
      loadAll();
    } catch (err) {
      toast({
        title: "Erro ao criar vendedor",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getMetaResumo(userId: number): string {
    if (metas.length === 0) return "—";
    const overrides = metasVendedor.filter((mv) => mv.user_id === userId);
    if (overrides.length === 0) return "Geral";
    return "Personalizada";
  }

  async function handleDeleteUser() {
    if (!deleteTarget || !transferToUserId) return;
    setIsDeleting(true);
    try {
      const transferUser = users.find((u) => u.id === Number(transferToUserId));
      await deleteUserAsAdmin(deleteTarget.id, Number(transferToUserId));
      toast({
        title: "Vendedor excluído",
        description: `${deleteTarget.nome || deleteTarget.email} foi removido. Leads e buscas transferidos para ${transferUser?.nome || transferUser?.email}.`,
      });
      setDeleteTarget(null);
      setTransferToUserId("");
      loadAll();
    } catch (err) {
      toast({
        title: "Erro ao excluir vendedor",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedUser = users.find((u) => u.id === metaDialogUserId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Lista de vendedores
              </CardTitle>
              <CardDescription className="mt-1.5">Todos os vendedores cadastrados no sistema.</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4" />
                  Novo vendedor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo vendedor</DialogTitle>
                  <DialogDescription>
                    Crie um novo vendedor. Ele será cadastrado no auth e na tabela de perfis.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome do vendedor"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="vendedor@empresa.com"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Perfil</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">
                                <span className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  User
                                </span>
                              </SelectItem>
                              <SelectItem value="admin">
                                <span className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="plano"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plano</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="básico">Básico</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="empresarial">Empresarial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Criando..." : "Criar vendedor"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum vendedor cadastrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metas</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            User
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.plano || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "ativo" ? "outline" : "secondary"}>
                        {u.status || "ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.role !== "admin" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setMetaDialogUserId(u.id)}
                        >
                          <Target className="h-3 w-3" />
                          {getMetaResumo(u.id)}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== dbUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={metaDialogUserId !== null}
        onOpenChange={(open) => { if (!open) setMetaDialogUserId(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas de {selectedUser?.nome || selectedUser?.email || "Vendedor"}
            </DialogTitle>
            <DialogDescription>
              Defina metas personalizadas para este vendedor.
            </DialogDescription>
          </DialogHeader>
          {metaDialogUserId && (
            <MetasVendedorDialog
              userId={metaDialogUserId}
              userName={selectedUser?.nome || selectedUser?.email || ""}
              metas={metas}
              metasVendedor={metasVendedor}
              empresaId={dbUser!.empresa_id}
              onSaved={() => {
                setMetaDialogUserId(null);
                loadAll();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
            setTransferToUserId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir vendedor
            </DialogTitle>
            <DialogDescription>
              Você está excluindo{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.nome || deleteTarget?.email}
              </span>
              . Os leads e buscas deste vendedor precisam ser transferidos para outro vendedor antes da exclusão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Transferir leads e buscas para:</Label>
            <Select
              value={transferToUserId}
              onValueChange={setTransferToUserId}
              disabled={isDeleting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.id !== deleteTarget?.id)
                  .map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      <span className="flex items-center gap-2">
                        {u.role === "admin" ? (
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {u.nome || u.email}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Todos os leads captados, buscas realizadas e movimentações do funil serão transferidos para o vendedor selecionado.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteTarget(null); setTransferToUserId(""); }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting || !transferToUserId}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir vendedor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba Metas ──────────────────────────────────────────────────────

function TabMetas() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const [newMetaNome, setNewMetaNome] = useState("");
  const [newMetaValor, setNewMetaValor] = useState("");
  const [newMetaPeriodo, setNewMetaPeriodo] = useState<"diario" | "semanal" | "mensal">("mensal");
  const [addingMeta, setAddingMeta] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editPeriodo, setEditPeriodo] = useState<"diario" | "semanal" | "mensal">("mensal");

  const loadMetas = useCallback(async () => {
    try {
      const data = await fetchMetas();
      setMetas(data);
    } catch (err: any) {
      toast({ title: "Erro ao carregar metas", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMetas();
  }, [loadMetas]);

  function startEdit(meta: Meta) {
    setEditingId(meta.id);
    setEditNome(meta.nome);
    setEditValor(String(meta.valor));
    setEditPeriodo(meta.periodo);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNome("");
    setEditValor("");
    setEditPeriodo("mensal");
  }

  async function saveEdit(meta: Meta) {
    const valor = parseInt(editValor, 10);
    if (isNaN(valor) || valor < 0) {
      toast({ title: "Valor inválido", description: "Informe um número positivo.", variant: "destructive" });
      return;
    }
    setSaving(meta.id);
    try {
      await upsertMeta({
        id: meta.id,
        nome: meta.fixa ? meta.nome : editNome.trim() || meta.nome,
        slug: meta.slug,
        valor,
        periodo: editPeriodo,
        empresa_id: dbUser!.empresa_id,
      });
      toast({ title: "Meta atualizada" });
      cancelEdit();
      await loadMetas();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function handleAddMeta() {
    const nome = newMetaNome.trim();
    if (!nome) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const valor = parseInt(newMetaValor, 10);
    if (isNaN(valor) || valor < 0) {
      toast({ title: "Valor inválido", description: "Informe um número positivo.", variant: "destructive" });
      return;
    }
    const slug = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    setAddingMeta(true);
    try {
      await upsertMeta({ nome, slug, valor, periodo: newMetaPeriodo, fixa: false, empresa_id: dbUser!.empresa_id });
      toast({ title: "Meta criada" });
      setNewMetaNome("");
      setNewMetaValor("");
      setNewMetaPeriodo("mensal");
      setShowAddForm(false);
      await loadMetas();
    } catch (err: any) {
      toast({ title: "Erro ao criar meta", description: err?.message, variant: "destructive" });
    } finally {
      setAddingMeta(false);
    }
  }

  async function handleDelete(meta: Meta) {
    if (meta.fixa) return;
    setSaving(meta.id);
    try {
      await deleteMeta(meta.id);
      toast({ title: "Meta removida" });
      await loadMetas();
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Metas Gerais
              </CardTitle>
              <CardDescription className="mt-1.5">
                Configure as metas padrão para todos os vendedores. Metas personalizadas por vendedor podem ser definidas na aba Vendedores.
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" />
                Nova meta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="mb-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium mb-3">Nova meta personalizada</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label>Nome da meta</Label>
                  <Input
                    value={newMetaNome}
                    onChange={(e) => setNewMetaNome(e.target.value)}
                    placeholder="Ex: Ligações Realizadas"
                    disabled={addingMeta}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newMetaValor}
                    onChange={(e) => setNewMetaValor(e.target.value)}
                    placeholder="0"
                    disabled={addingMeta}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Período</Label>
                  <Select value={newMetaPeriodo} onValueChange={(v) => setNewMetaPeriodo(v as "diario" | "semanal" | "mensal")} disabled={addingMeta}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddMeta} disabled={addingMeta} size="sm">
                    {addingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Criar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewMetaNome(""); setNewMetaValor(""); setNewMetaPeriodo("mensal"); }} disabled={addingMeta}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {metas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma meta configurada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meta</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[140px]">Período</TableHead>
                  <TableHead className="w-[120px]">Valor</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas.map((meta) => {
                  const isEditing = editingId === meta.id;
                  const isSaving = saving === meta.id;
                  const periodoLabel: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" };
                  return (
                    <TableRow key={meta.id}>
                      <TableCell className="font-medium">
                        {isEditing && !meta.fixa ? (
                          <Input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="h-8"
                            disabled={isSaving}
                          />
                        ) : (
                          meta.nome
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.fixa ? "default" : "secondary"}>
                          {meta.fixa ? "Fixa" : "Personalizada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editPeriodo} onValueChange={(v) => setEditPeriodo(v as "diario" | "semanal" | "mensal")} disabled={isSaving}>
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="diario">Diário</SelectItem>
                              <SelectItem value="semanal">Semanal</SelectItem>
                              <SelectItem value="mensal">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{periodoLabel[meta.periodo] || meta.periodo}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            value={editValor}
                            onChange={(e) => setEditValor(e.target.value)}
                            className="h-8 w-24"
                            disabled={isSaving}
                          />
                        ) : (
                          <span className="text-lg font-semibold text-primary">{meta.valor}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEdit(meta)}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEdit}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEdit(meta)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!meta.fixa && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(meta)}
                                disabled={isSaving}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aba Integrações ────────────────────────────────────────────────

interface IntegracoesRow {
  id: number;
  google_maps_api_key: string;
  serper_api_key: string;
  evolution_api_url: string;
  evolution_api_instance: string;
  evolution_api_key: string;
}

const INTEGRACOES_DEFAULT: Omit<IntegracoesRow, "id"> = {
  google_maps_api_key: "",
  serper_api_key: "",
  evolution_api_url: "",
  evolution_api_instance: "",
  evolution_api_key: "",
};

interface IntegracaoField {
  key: keyof Omit<IntegracoesRow, "id">;
  label: string;
  placeholder: string;
  icon: typeof Map;
  group: string;
  secret: boolean;
}

const INTEGRATION_FIELDS: IntegracaoField[] = [
  { key: "google_maps_api_key", label: "API Key", placeholder: "AIzaSy...", icon: Map, group: "Google Maps API", secret: true },
  { key: "serper_api_key", label: "API Key", placeholder: "sua-chave-serper", icon: Search, group: "Serper API", secret: true },
  { key: "evolution_api_url", label: "URL", placeholder: "https://api.exemplo.com", icon: MessageSquare, group: "Evolution API", secret: false },
  { key: "evolution_api_instance", label: "Nome da Instância", placeholder: "minha-instancia", icon: MessageSquare, group: "Evolution API", secret: false },
  { key: "evolution_api_key", label: "API Key", placeholder: "sua-chave-evolution", icon: MessageSquare, group: "Evolution API", secret: true },
];

const GROUP_ICONS: Record<string, typeof Map> = {
  "Google Maps API": Map,
  "Serper API": Search,
  "Evolution API": MessageSquare,
};

function TabIntegracoes() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const [row, setRow] = useState<Omit<IntegracoesRow, "id">>(INTEGRACOES_DEFAULT);
  const [rowId, setRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("configuracoes_integracoes")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        setRow({
          google_maps_api_key: data.google_maps_api_key || "",
          serper_api_key: data.serper_api_key || "",
          evolution_api_url: data.evolution_api_url || "",
          evolution_api_instance: data.evolution_api_instance || "",
          evolution_api_key: data.evolution_api_key || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  function handleChange(key: keyof Omit<IntegracoesRow, "id">, valor: string) {
    setRow((prev) => ({ ...prev, [key]: valor }));
  }

  function toggleShow(key: string) {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...row,
        updated_at: new Date().toISOString(),
        updated_by: dbUser?.id ?? null,
      };

      if (rowId) {
        const { error } = await supabase
          .from("configuracoes_integracoes")
          .update(payload)
          .eq("id", rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("configuracoes_integracoes")
          .insert({ ...payload, empresa_id: dbUser!.empresa_id })
          .select("id")
          .single();
        if (error) throw error;
        setRowId(data.id);
      }

      invalidateIntegracoesCache();
      toast({ title: "Salvo", description: "Integrações atualizadas com sucesso." });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const groups: Record<string, IntegracaoField[]> = {};
  for (const field of INTEGRATION_FIELDS) {
    if (!groups[field.group]) groups[field.group] = [];
    groups[field.group].push(field);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([groupName, fields]) => {
        const GroupIcon = GROUP_ICONS[groupName] || Puzzle;
        return (
          <Card key={groupName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GroupIcon className="h-5 w-5" />
                {groupName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {field.label}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type={field.secret && !showKeys[field.key] ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={row[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="font-mono text-sm"
                    />
                    {field.secret && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => toggleShow(field.key)}
                        title={showKeys[field.key] ? "Ocultar" : "Mostrar"}
                      >
                        {showKeys[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Integrações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Aba Pagamentos ─────────────────────────────────────────────────

interface PagamentoRow {
  id: number;
  valor: number;
  status: string;
  data_vencimento: string;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  referencia: string | null;
  asaas_invoice_url: string | null;
  created_at: string;
}

interface AssinaturaRow {
  id: number;
  status: string;
  ciclo: string;
  valor: number;
  data_vencimento: string;
  planos: { nome: string } | null;
}

function TabPagamentos() {
  const { dbUser } = useAuth();
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [assinatura, setAssinatura] = useState<AssinaturaRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbUser) return;
    (async () => {
      const [pagRes, assRes] = await Promise.all([
        supabase
          .from("pagamentos")
          .select("id, valor, status, data_vencimento, data_pagamento, metodo_pagamento, referencia, asaas_invoice_url, created_at")
          .eq("empresa_id", dbUser.empresa_id)
          .order("data_vencimento", { ascending: false }),
        supabase
          .from("assinaturas")
          .select("id, status, ciclo, valor, data_vencimento, planos(nome)")
          .eq("empresa_id", dbUser.empresa_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!pagRes.error) setPagamentos((pagRes.data as PagamentoRow[]) ?? []);
      if (!assRes.error && assRes.data) setAssinatura(assRes.data as AssinaturaRow);
      setLoading(false);
    })();
  }, [dbUser]);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  function fmtDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = dateStr.slice(0, 10);
    const [y, m, day] = d.split("-");
    if (!y || !m || !day) return "—";
    return `${day}/${m}/${y}`;
  }

  function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "pago": return "default";
      case "pendente": return "outline";
      case "atrasado": return "destructive";
      case "cancelado": return "secondary";
      default: return "secondary";
    }
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      pago: "Pago",
      pendente: "Pendente",
      atrasado: "Atrasado",
      cancelado: "Cancelado",
    };
    return map[status] || status;
  }

  function cicloLabel(ciclo: string) {
    const map: Record<string, string> = {
      mensal: "Mensal",
      trimestral: "Trimestral",
      semestral: "Semestral",
      anual: "Anual",
    };
    return map[ciclo] || ciclo;
  }

  function metodoLabel(metodo: string | null) {
    if (!metodo) return "—";
    const map: Record<string, string> = {
      pix: "PIX",
      boleto: "Boleto",
      credit_card: "Cartão de Crédito",
      cartao: "Cartão de Crédito",
    };
    return map[metodo] || metodo;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const CICLO_MESES: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

  const pagamentoPendente = pagamentos.find((p) => p.status === "pendente" || p.status === "atrasado");

  let proximoVencimento: string | null = null;
  let proximoValor: number | null = null;
  if (!pagamentoPendente && assinatura) {
    const ultimoPago = pagamentos.find((p) => p.status === "pago");
    const baseDate = ultimoPago?.data_vencimento || assinatura.data_vencimento;
    const meses = CICLO_MESES[assinatura.ciclo] || 1;
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + meses);
    proximoVencimento = d.toISOString().split("T")[0];
    proximoValor = assinatura.valor;
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-primary" />
              Assinatura Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assinatura ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold">
                    {(assinatura.planos as any)?.nome ?? "—"}
                  </span>
                  <Badge variant={assinatura.status === "ativa" ? "default" : "destructive"}>
                    {assinatura.status === "ativa" ? "Ativa" : assinatura.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ciclo: <span className="font-medium text-foreground">{cicloLabel(assinatura.ciclo)}</span>
                  {" · "}
                  Valor: <span className="font-medium text-foreground">{formatCurrency(assinatura.valor)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Próximo vencimento: <span className="font-medium text-foreground">{fmtDate(assinatura.data_vencimento)}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" />
              Próximo Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentoPendente ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(pagamentoPendente.valor)}
                  </span>
                  <Badge variant={statusBadgeVariant(pagamentoPendente.status)}>
                    {statusLabel(pagamentoPendente.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vencimento: <span className="font-medium text-foreground">{fmtDate(pagamentoPendente.data_vencimento)}</span>
                </p>
                {pagamentoPendente.asaas_invoice_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(pagamentoPendente.asaas_invoice_url!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver fatura
                  </Button>
                )}
              </div>
            ) : proximoVencimento ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(proximoValor!)}
                  </span>
                  <Badge variant="outline">Previsto</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Próximo vencimento: <span className="font-medium text-foreground">{fmtDate(proximoVencimento)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Calculado com base no ciclo {assinatura ? cicloLabel(assinatura.ciclo).toLowerCase() : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum pagamento pendente.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Todos os pagamentos realizados e pendentes.</CardDescription>
        </CardHeader>
        <CardContent>
          {pagamentos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum pagamento registrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Fatura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((pag) => (
                  <TableRow key={pag.id}>
                    <TableCell className="font-medium">
                      {fmtDate(pag.data_vencimento)}
                    </TableCell>
                    <TableCell>{formatCurrency(pag.valor)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(pag.status)}>
                        {statusLabel(pag.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pag.data_pagamento ? fmtDate(pag.data_pagamento) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {metodoLabel(pag.metodo_pagamento)}
                    </TableCell>
                    <TableCell className="text-right">
                      {pag.asaas_invoice_url ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(pag.asaas_invoice_url!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Página Principal ───────────────────────────────────────────────

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  const adminTabs = isAdmin
    ? [
        { value: "empresa", label: "Empresa", icon: Building2 },
        { value: "pagamentos", label: "Pagamentos", icon: CreditCard },
        { value: "metas", label: "Metas", icon: Target },
        { value: "usuarios", label: "Vendedores", icon: UsersIcon },
        { value: "integracoes", label: "Integrações", icon: Puzzle },
      ]
    : [];

  const allTabs = [{ value: "perfil", label: "Perfil", icon: User }, ...adminTabs];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seu perfil{isAdmin ? ", empresa, vendedores e integrações" : " e preferências"}.
          </p>
        </div>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="inline-grid" style={{ gridTemplateColumns: `repeat(${allTabs.length}, minmax(0, auto))` }}>
            {allTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="perfil" className="mt-6">
            <TabPerfil />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="empresa" className="mt-6">
                <TabEmpresa />
              </TabsContent>

              <TabsContent value="pagamentos" className="mt-6">
                <TabPagamentos />
              </TabsContent>

              <TabsContent value="metas" className="mt-6">
                <TabMetas />
              </TabsContent>

              <TabsContent value="usuarios" className="mt-6">
                <TabVendedores />
              </TabsContent>

              <TabsContent value="integracoes" className="mt-6">
                <TabIntegracoes />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
