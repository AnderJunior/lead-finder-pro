/**
 * Exportação para Excel - baseado na lógica do sistema_pronto
 */
import * as XLSX from "xlsx";

export interface LeadForExport {
  id: string;
  name: string;
  category?: string;
  address?: string;
  endereco?: string;
  phone?: string;
  telefone?: string;
  website?: string | null;
  rating?: number;
  reviews?: number;
  hasWhatsApp?: boolean | null;
  whatsappStatus?: string;
  status?: string;
  types?: string;
}

function sanitize(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

export function exportLeadsToExcel(
  leads: LeadForExport[],
  filenamePrefix: string = "leads"
): void {
  if (leads.length === 0) return;

  const data = leads.map((p) => ({
    Nome: sanitize(p.name),
    Endereço: sanitize(p.address ?? p.endereco ?? ""),
    Telefone: sanitize(p.phone ?? p.telefone ?? ""),
    "E-mail": "",
    Rating: p.rating ?? "Não avaliado",
    Avaliações: p.reviews ?? 0,
    Website: sanitize(p.website ?? "Não informado"),
    WhatsApp:
      p.hasWhatsApp === true
        ? "Sim"
        : p.hasWhatsApp === false
          ? "Não"
          : "Não Verificado",
    Status:
      (p.whatsappStatus ?? p.status) === "verified"
        ? "Verificado"
        : (p.whatsappStatus ?? p.status) === "no_whatsapp"
          ? "Sem WhatsApp"
          : "Não Verificado",
    Categoria: sanitize(p.category ?? p.types ?? "Outros"),
    Tipos: sanitize(p.types ?? "Não informado"),
    Data_Exportacao: new Date().toLocaleDateString("pt-BR"),
    Hora_Exportacao: new Date().toLocaleTimeString("pt-BR"),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const colWidths: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let max = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell?.v) max = Math.max(max, String(cell.v).length);
    }
    colWidths.push({ wch: Math.min(max + 2, 50) });
  }
  ws["!cols"] = colWidths;

  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  XLSX.writeFile(wb, `${filenamePrefix}_${ts}.xlsx`);
}

// ─── Importação de Excel ────────────────────────────────────────────

export interface ImportedLeadRow {
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  website: string;
  rating: number | null;
  avaliacoes: number;
  segmento: string;
  localizacao: string;
}

const COLUMN_ALIASES: Record<string, keyof ImportedLeadRow> = {
  nome: "nome",
  name: "nome",
  empresa: "nome",
  "razão social": "nome",
  "razao social": "nome",
  endereco: "endereco",
  endereço: "endereco",
  "endereço": "endereco",
  address: "endereco",
  telefone: "telefone",
  phone: "telefone",
  tel: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  email: "email",
  "e-mail": "email",
  "e_mail": "email",
  website: "website",
  site: "website",
  url: "website",
  rating: "rating",
  nota: "rating",
  avaliacao: "rating",
  "avaliação": "rating",
  avaliacoes: "avaliacoes",
  "avaliações": "avaliacoes",
  reviews: "avaliacoes",
  segmento: "segmento",
  categoria: "segmento",
  category: "segmento",
  ramo: "segmento",
  localizacao: "localizacao",
  "localização": "localizacao",
  cidade: "localizacao",
  location: "localizacao",
};

function normalizeHeader(raw: string): string {
  return raw
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-]/g, " ")
    .trim();
}

export function parseLeadsFromExcel(file: File): Promise<ImportedLeadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          reject(new Error("O arquivo não contém nenhuma planilha."));
          return;
        }

        const ws = wb.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        if (jsonRows.length === 0) {
          reject(new Error("A planilha está vazia."));
          return;
        }

        const rawHeaders = Object.keys(jsonRows[0]);
        const mapping: Record<string, keyof ImportedLeadRow> = {};
        for (const raw of rawHeaders) {
          const norm = normalizeHeader(raw);
          if (COLUMN_ALIASES[norm]) {
            mapping[raw] = COLUMN_ALIASES[norm];
          }
        }

        if (!Object.values(mapping).includes("nome")) {
          reject(
            new Error(
              'Coluna "Nome" não encontrada. O Excel deve ter pelo menos a coluna Nome (ou Empresa).'
            )
          );
          return;
        }

        const leads: ImportedLeadRow[] = [];
        for (const row of jsonRows) {
          const lead: ImportedLeadRow = {
            nome: "",
            endereco: "",
            telefone: "",
            email: "",
            website: "",
            rating: null,
            avaliacoes: 0,
            segmento: "",
            localizacao: "",
          };

          for (const [rawCol, field] of Object.entries(mapping)) {
            const val = row[rawCol];
            if (val == null || String(val).trim() === "") continue;

            if (field === "rating") {
              const n = parseFloat(String(val));
              lead.rating = isNaN(n) ? null : n;
            } else if (field === "avaliacoes") {
              const n = parseInt(String(val), 10);
              lead.avaliacoes = isNaN(n) ? 0 : n;
            } else {
              (lead as any)[field] = String(val).trim();
            }
          }

          if (lead.nome) leads.push(lead);
        }

        if (leads.length === 0) {
          reject(new Error("Nenhum lead válido encontrado (todos sem nome)."));
          return;
        }

        resolve(leads);
      } catch (err) {
        reject(
          new Error(
            `Erro ao ler arquivo: ${err instanceof Error ? err.message : "formato inválido"}`
          )
        );
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

export function generateTemplateExcel(): void {
  const templateData = [
    {
      Nome: "Exemplo Empresa LTDA",
      Telefone: "(11) 99999-9999",
      "E-mail": "contato@exemplo.com",
      Endereço: "Rua Exemplo, 123 - São Paulo/SP",
      Website: "www.exemplo.com",
      Segmento: "Restaurante",
      Localização: "São Paulo, SP",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const colWidths: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let max = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell?.v) max = Math.max(max, String(cell.v).length);
    }
    colWidths.push({ wch: Math.min(max + 2, 50) });
  }
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, "modelo_importacao_leads.xlsx");
}
