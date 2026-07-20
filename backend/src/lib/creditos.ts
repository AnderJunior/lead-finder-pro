import { prisma } from "./prisma.js";

export class InsufficientCreditsError extends Error {
  status = 402; // Payment Required
  constructor(public required: number, public available: number) {
    super(`Créditos insuficientes (necessários: ${required}, disponíveis: ${available})`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Debita créditos da empresa.
 * Lança InsufficientCreditsError se não houver saldo.
 * Super admin não consome créditos internos (o limite real dele é o saldo Serper).
 */
export async function debitCredits(
  empresaId: bigint | null | undefined,
  amount: number,
  opts?: { role?: string | null }
): Promise<void> {
  if (!empresaId || amount <= 0) return;
  if (opts?.role === "super_admin") return;

  // Operação atômica: only update if creditos >= amount
  const result = await prisma.empresa.updateMany({
    where: { id: empresaId, creditos: { gte: amount } },
    data: { creditos: { decrement: amount } },
  });

  if (result.count === 0) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { creditos: true },
    });
    throw new InsufficientCreditsError(amount, empresa?.creditos ?? 0);
  }
}

/**
 * Adiciona créditos à empresa (recarga).
 */
export async function addCredits(empresaId: bigint, amount: number): Promise<number> {
  if (amount <= 0) return 0;
  const updated = await prisma.empresa.update({
    where: { id: empresaId },
    data: { creditos: { increment: amount } },
    select: { creditos: true },
  });
  return updated.creditos;
}

/**
 * Define o saldo absoluto.
 */
export async function setCredits(empresaId: bigint, amount: number): Promise<number> {
  const updated = await prisma.empresa.update({
    where: { id: empresaId },
    data: { creditos: Math.max(0, amount) },
    select: { creditos: true },
  });
  return updated.creditos;
}
