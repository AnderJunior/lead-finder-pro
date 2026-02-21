import { useState, useEffect, useCallback } from "react";
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
  ShieldAlert,
  UserPlus,
  Shield,
  User,
  Eye,
  EyeOff,
  Map,
  Search,
  MessageSquare,
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
import { useToast } from "@/hooks/use-toast";
import { createUserAsAdmin } from "@/lib/supabase-functions";
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
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["admin", "user"]),
  plano: z.enum(["básico", "premium", "empresarial"]),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface DbUserRow {
  id: number;
  email: string;
  role: string | null;
  status: string | null;
  plano: string | null;
  created_at: string;
}

// ─── Aba Empresa ────────────────────────────────────────────────────

function TabEmpresa() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      } else {
        const { error } = await supabase.from("configuracoes_empresa").insert(payload);
        if (error) throw error;
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
      <CardContent>
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

// ─── Aba Usuários ───────────────────────────────────────────────────

function TabUsuarios() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<DbUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", password: "", role: "user", plano: "básico" },
  });

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, status, plano, created_at")
      .order("created_at", { ascending: false });
    if (!error) setUsers((data as DbUserRow[]) || []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function onSubmit(values: CreateUserFormValues) {
    setIsSubmitting(true);
    try {
      await createUserAsAdmin({
        email: values.email,
        password: values.password,
        role: values.role,
        plano: values.plano,
      });
      toast({
        title: "Usuário criado",
        description: `${values.email} foi cadastrado com sucesso.`,
      });
      form.reset({ email: "", password: "", role: "user", plano: "básico" });
      setDialogOpen(false);
      loadUsers();
    } catch (err) {
      toast({
        title: "Erro ao criar usuário",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Lista de usuários
              </CardTitle>
              <CardDescription className="mt-1.5">Todos os usuários cadastrados no sistema.</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4" />
                  Novo usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo usuário</DialogTitle>
                  <DialogDescription>
                    Crie um novo usuário. Ele será cadastrado no auth e na tabela de perfis.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="novo@usuario.com"
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
                        {isSubmitting ? "Criando..." : "Criar usuário"}
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
              Nenhum usuário cadastrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
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
                    <TableCell className="text-muted-foreground">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "-"}
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
          .insert(payload)
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

// ─── Página Principal ───────────────────────────────────────────────

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Acesso negado
            </CardTitle>
            <CardDescription>
              Apenas usuários com perfil administrador podem acessar as configurações.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as configurações do sistema, usuários e integrações.
          </p>
        </div>

        <Tabs defaultValue="empresa" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Integrações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="mt-6">
            <TabEmpresa />
          </TabsContent>

          <TabsContent value="usuarios" className="mt-6">
            <TabUsuarios />
          </TabsContent>

          <TabsContent value="integracoes" className="mt-6">
            <TabIntegracoes />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
