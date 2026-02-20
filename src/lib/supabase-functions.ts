import { supabase } from "./supabase";

export interface CreateUserPayload {
  email: string;
  password: string;
  role?: "admin" | "user";
  plano?: string;
}

export async function createUserAsAdmin(payload: CreateUserPayload) {
  const { data, error } = await supabase.functions.invoke("create-user", {
    body: payload,
  });

  if (error) throw error;

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export interface SalvarBuscaPayload {
  segmento: string;
  localizacao: string;
  tipo_pesquisa: string;
  user: number;
}

export async function salvarBuscaRealizada(payload: SalvarBuscaPayload) {
  const { error } = await supabase
    .from("buscas_realizadas")
    .insert({
      segmento: payload.segmento,
      localizacao: payload.localizacao,
      tipo_pesquisa: payload.tipo_pesquisa,
      user: payload.user,
    });

  if (error) {
    console.warn("Erro ao salvar busca realizada:", error.message);
  }
}
