/**
 * Converte BigInt e Decimal para tipos serializáveis em JSON.
 * Prisma retorna BigInt para PKs e Decimal para colunas decimal,
 * mas JSON.stringify não suporta nenhum dos dois nativamente.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") return value.toString();
      if (value && typeof value === "object" && "toFixed" in value && typeof (value as any).toFixed === "function") {
        // Prisma Decimal
        return Number(value);
      }
      return value;
    })
  ) as T;
}

export function publicUser(user: any) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return serialize(rest);
}
