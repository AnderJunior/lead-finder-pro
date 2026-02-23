import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  parseLeadsFromExcel,
  generateTemplateExcel,
  type ImportedLeadRow,
} from "@/lib/excel-export";
import { captarLeads, type LeadCaptadoPayload } from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportLeadsDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsedLeads, setParsedLeads] = useState<ImportedLeadRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [origem, setOrigem] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dbUser } = useAuth();
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setStep("upload");
    setParsedLeads([]);
    setFileName("");
    setError(null);
    setImportedCount(0);
    setOrigem("");
    setDragOver(false);
  }, []);

  const handleOpenChange = (value: boolean) => {
    if (!value) resetState();
    onOpenChange(value);
  };

  const processFile = async (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const isValidExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !isValidExt) {
      setError("Formato inválido. Use arquivos .xlsx, .xls ou .csv");
      return;
    }

    setError(null);
    setFileName(file.name);

    try {
      const leads = await parseLeadsFromExcel(file);
      setParsedLeads(leads);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!dbUser || parsedLeads.length === 0) return;

    setStep("importing");
    try {
      const payloads: LeadCaptadoPayload[] = parsedLeads.map((row) => ({
        nome: row.nome,
        endereco: row.endereco || undefined,
        telefone: row.telefone || undefined,
        email: row.email || undefined,
        website: row.website || undefined,
        rating: row.rating ?? undefined,
        avaliacoes: row.avaliacoes,
        origem_busca: origem.trim() || "Importação Excel",
        segmento_busca: row.segmento || undefined,
        localizacao_busca: row.localizacao || undefined,
        user_id: dbUser.id,
        empresa_id: dbUser.empresa_id,
      }));

      const { count } = await captarLeads(payloads);
      setImportedCount(count);
      setStep("done");
      toast({
        title: "Importação concluída",
        description: `${count} lead${count !== 1 ? "s" : ""} importado${count !== 1 ? "s" : ""} com sucesso.`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar leads");
      setStep("preview");
      toast({
        title: "Erro na importação",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const previewLeads = parsedLeads.slice(0, 5);
  const columnsWithData = {
    telefone: parsedLeads.some((l) => l.telefone),
    email: parsedLeads.some((l) => l.email),
    endereco: parsedLeads.some((l) => l.endereco),
    website: parsedLeads.some((l) => l.website),
    segmento: parsedLeads.some((l) => l.segmento),
    localizacao: parsedLeads.some((l) => l.localizacao),
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Leads
          </DialogTitle>
          <DialogDescription>
            Importe uma lista de leads a partir de um arquivo Excel (.xlsx, .xls) ou CSV.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                Arraste seu arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: .xlsx, .xls, .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="border border-border rounded-lg p-4 bg-muted/20">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Formato esperado do Excel
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                O arquivo deve ter pelo menos a coluna <strong>Nome</strong>. As demais colunas são opcionais:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Nome *", "Telefone", "E-mail", "Endereço", "Website", "Segmento", "Localização", "Rating", "Avaliações"].map((col) => (
                  <Badge
                    key={col}
                    variant={col.includes("*") ? "default" : "outline"}
                    className="text-xs"
                  >
                    {col}
                  </Badge>
                ))}
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-3 h-auto p-0 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  generateTemplateExcel();
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                Baixar modelo de planilha
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{parsedLeads.length} leads</Badge>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetState}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Origem</label>
              <Input
                placeholder="Ex: Lista evento, Indicação, Prospecção fria..."
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Identifique de onde vem essa lista. Será salva no campo "Origem" de cada lead.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 border-b border-border">
                <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Pré-visualização (primeiros {Math.min(5, parsedLeads.length)} de {parsedLeads.length})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nome</th>
                      {columnsWithData.telefone && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Telefone</th>}
                      {columnsWithData.email && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">E-mail</th>}
                      {columnsWithData.endereco && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Endereço</th>}
                      {columnsWithData.segmento && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Segmento</th>}
                      {columnsWithData.localizacao && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Local</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {previewLeads.map((lead, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium max-w-[180px] truncate">{lead.nome}</td>
                        {columnsWithData.telefone && <td className="px-3 py-2 text-muted-foreground">{lead.telefone || "—"}</td>}
                        {columnsWithData.email && <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">{lead.email || "—"}</td>}
                        {columnsWithData.endereco && <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">{lead.endereco || "—"}</td>}
                        {columnsWithData.segmento && <td className="px-3 py-2 text-muted-foreground">{lead.segmento || "—"}</td>}
                        {columnsWithData.localizacao && <td className="px-3 py-2 text-muted-foreground">{lead.localizacao || "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedLeads.length > 5 && (
                <div className="px-3 py-2 text-center text-xs text-muted-foreground bg-muted/10">
                  ... e mais {parsedLeads.length - 5} leads
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={resetState}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Importar {parsedLeads.length} lead{parsedLeads.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Importando leads...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastrando {parsedLeads.length} leads no sistema
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importedCount} lead{importedCount !== 1 ? "s" : ""} importado{importedCount !== 1 ? "s" : ""} com sucesso.
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="mt-2">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
