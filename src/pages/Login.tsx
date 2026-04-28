import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const forgotSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, loading, isSuperAdmin, isPasswordRecovery, dbUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const targetPath = isSuperAdmin ? "/admin" : from;

  if (!loading && session && isPasswordRecovery) {
    navigate("/reset-password", { replace: true });
    return null;
  }

  if (!loading && session && dbUser) {
    navigate(targetPath, { replace: true });
    return null;
  }

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(values.email, values.password);

      if (error) {
        toast({
          title: "Erro ao entrar",
          description:
            error.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos."
              : error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Login realizado com sucesso!" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onForgotSubmit(values: ForgotFormValues) {
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar e-mail",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
      setShowForgot(false);
      forgotForm.reset();
    } finally {
      setIsSendingReset(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img
            src="/logo-sistema.png"
            alt="LeadRadar"
            className="h-12 max-w-[280px] object-contain"
          />
        </div>

        <Card className="border shadow-lg" key={showForgot ? "forgot" : "login"}>
          {showForgot ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Recuperar Senha</CardTitle>
                <CardDescription>
                  Informe seu e-mail para receber o link de redefinição
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotForm}>
                  <form
                    onSubmit={forgotForm.handleSubmit(onForgotSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={forgotForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              disabled={isSendingReset}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSendingReset}
                    >
                      {isSendingReset ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar link de recuperação"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setShowForgot(false);
                        forgotForm.reset();
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar ao login
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Entrar</CardTitle>
                <CardDescription>
                  Use seu e-mail e senha para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
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
                          <div className="flex items-center justify-between">
                            <FormLabel>Senha</FormLabel>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => setShowForgot(true)}
                            >
                              Esqueci minha senha
                            </button>
                          </div>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="current-password"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito a usuários cadastrados
        </p>
      </div>
    </div>
  );
}
