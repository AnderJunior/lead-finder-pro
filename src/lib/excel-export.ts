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
