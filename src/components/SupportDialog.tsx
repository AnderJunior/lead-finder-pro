import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, MessageSquare, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const WHATSAPP_NUMBER = "5527997226957";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { dbUser } = useAuth();

  const empresaNome = dbUser?.empresa_nome || "";
  const userEmail = dbUser?.email || "";

  const mensagemPadrao = encodeURIComponent(
    `Olá! Quero comprar mais créditos para o LeadRadar.%0A%0A` +
      `Empresa: ${empresaNome}%0A` +
      `Email: ${userEmail}%0A%0A` +
      `Aguardo retorno com as opções de pacotes disponíveis.`
  );

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensagemPadrao}`, "_blank");
    onOpenChange(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("[LeadRadar] Solicitação de mais créditos");
    const body = decodeURIComponent(mensagemPadrao);
    window.location.href = `mailto:suporte@leadradar.com.br?subject=${subject}&body=${body}`;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Quero Mais Créditos</DialogTitle>
              <DialogDescription className="mt-1">
                Entre em contato pra adquirir um pacote adicional.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <Button
            className="w-full justify-start gap-3 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleWhatsApp}
          >
            <Phone className="h-5 w-5" />
            Falar no WhatsApp
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleEmail}
          >
            <MessageSquare className="h-5 w-5" />
            Enviar e-mail
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Resposta em até 1 dia útil. Após o pagamento, os créditos são liberados na sua conta.
        </p>
      </DialogContent>
    </Dialog>
  );
}
