import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Phone } from "lucide-react";

const FAQ_ITEMS = [
  {
    pergunta: "Como funcionam os créditos de busca?",
    resposta:
      "Cada busca realizada consome créditos do seu plano. Os créditos são renovados conforme o ciclo da sua assinatura. Você pode acompanhar o uso na barra lateral.",
  },
  {
    pergunta: "Como exportar meus leads?",
    resposta:
      "Acesse a página 'Meus Leads' e utilize o botão de exportar para baixar seus contatos em formato CSV ou Excel.",
  },
  {
    pergunta: "Como funciona o funil de vendas?",
    resposta:
      "O funil organiza seus leads por estágio (novo, contato, qualificado, proposta, ganho/perdido). Arraste os cards para mover leads entre os estágios.",
  },
  {
    pergunta: "Como atualizo meus dados de pagamento?",
    resposta:
      "Vá em Configurações e acesse a seção de assinatura. Lá você pode atualizar o cartão de crédito ou forma de pagamento.",
  },
  {
    pergunta: "O que fazer se não encontrei meu lead?",
    resposta:
      "Tente refinar os critérios de busca ou use variações no nome da empresa. Se o problema persistir, abra um chamado ou entre em contato pelo WhatsApp.",
  },
];

const WHATSAPP_NUMBER = "5527997226957";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const [showChamadoForm, setShowChamadoForm] = useState(false);
  const [chamadoData, setChamadoData] = useState({
    assunto: "",
    mensagem: "",
  });

  const handleAbrirChamado = () => {
    setShowChamadoForm(true);
  };

  const handleEnviarChamado = () => {
    const subject = encodeURIComponent(`[Suporte ClientScout] ${chamadoData.assunto}`);
    const body = encodeURIComponent(chamadoData.mensagem);
    window.location.href = `mailto:suporte@clientscout.com.br?subject=${subject}&body=${body}`;
    setShowChamadoForm(false);
    setChamadoData({ assunto: "", mensagem: "" });
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Suporte</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 min-h-0">
          {/* FAQ - Esquerda */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Perguntas frequentes
            </h3>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-sm">
                    {item.pergunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {item.resposta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Tipos de Suporte - Direita */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Tipos de suporte
            </h3>

            {showChamadoForm ? (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input
                    id="assunto"
                    placeholder="Descreva brevemente o problema"
                    value={chamadoData.assunto}
                    onChange={(e) =>
                      setChamadoData((p) => ({ ...p, assunto: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mensagem">Mensagem</Label>
                  <Textarea
                    id="mensagem"
                    placeholder="Detalhe sua solicitação..."
                    rows={4}
                    value={chamadoData.mensagem}
                    onChange={(e) =>
                      setChamadoData((p) => ({ ...p, mensagem: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEnviarChamado} size="sm">
                    Enviar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowChamadoForm(false);
                      setChamadoData({ assunto: "", mensagem: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  disabled
                  title="Temporariamente indisponível"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                  Abrir Chamado <span className="text-xs text-muted-foreground">(bloqueado)</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={handleWhatsApp}
                >
                  <Phone className="h-5 w-5" />
                  Chamar no WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
