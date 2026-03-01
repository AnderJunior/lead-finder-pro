import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  CreditCard,
  ExternalLink,
  LogOut,
  ShieldAlert,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContaBloqueada() {
  const { dbUser, isAdmin, signOut } = useAuth();

  if (!dbUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso Suspenso</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {isAdmin
              ? "A assinatura da sua empresa está vencida. Regularize o pagamento para restaurar o acesso de todos os usuários."
              : "A assinatura da sua empresa está vencida. Entre em contato com o administrador da sua conta para regularizar."}
          </p>
        </div>

        {/* Card principal */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Info da empresa/conta */}
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              Informações da Conta
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Empresa</p>
                <p className="text-sm font-medium text-gray-900">{dbUser.empresa_nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Plano</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{dbUser.plano || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status da Assinatura</p>
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-200 mt-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  {dbUser.assinatura_status === "suspensa" ? "Suspensa" : "Vencida"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Vencimento</p>
                <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(dbUser.assinatura_vencimento)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs text-gray-400 mb-2">Seu perfil</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {dbUser.nome || dbUser.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {dbUser.email}
                </div>
                {dbUser.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {dbUser.telefone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção de pagamento (só para admin) */}
          {isAdmin && (
            <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                Regularizar Pagamento
              </h2>

              <p className="text-xs text-gray-500">
                Clique no botão abaixo para acessar a fatura e realizar o pagamento. Após a confirmação, o acesso será restaurado automaticamente.
              </p>

              {dbUser.fatura_url ? (
                <a
                  href={dbUser.fatura_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Visualizar Fatura e Pagar
                  </Button>
                </a>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-xs text-yellow-700">
                    Nenhuma fatura disponível no momento. Entre em contato com o suporte para regularizar sua situação.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Não admin — mensagem para contatar admin */}
          {!isAdmin && (
            <div className="border-t border-gray-200 bg-gray-50 p-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                <p className="text-sm text-blue-700 font-medium">
                  Aguardando regularização
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Somente o administrador da sua empresa pode realizar o pagamento. Entre em contato com ele para restaurar o acesso.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botão sair */}
        <div className="text-center">
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
