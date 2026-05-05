import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/auth.js";

async function main() {
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL || "admin@leadradar.com.br").toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || "ChangeMe@2026";
  const nome = process.env.SEED_SUPER_ADMIN_NOME || "Super Admin";

  // Garante linha singleton de configuração global
  await prisma.configuracaoGlobal.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // Plano Gratuito padrão (sempre garantido / atualizado)
  const planoGratuito = await prisma.plano.findFirst({ where: { nome: "Gratuito" } });
  const dadosGratuito = {
    nome: "Gratuito",
    descricao: "Plano gratuito",
    preco_mensal: 0,
    preco_anual: 0,
    max_usuarios: 1,
    creditos_iniciais: 100,
    recursos: ["Prospecção básica", "Funil de vendas"],
    ativo: true,
  };
  if (!planoGratuito) {
    await prisma.plano.create({ data: dadosGratuito });
    console.log("✓ Plano Gratuito criado");
  } else {
    await prisma.plano.update({ where: { id: planoGratuito.id }, data: dadosGratuito });
    console.log("✓ Plano Gratuito atualizado");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "super_admin") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "super_admin" },
      });
      console.log(`✓ Usuário ${email} promovido para super_admin`);
    } else {
      console.log(`✓ Super Admin já existe: ${email}`);
    }
    return;
  }

  const password_hash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      password_hash,
      nome,
      role: "super_admin",
      status: "ativo",
    },
  });
  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log("  ✓ SUPER ADMIN CRIADO COM SUCESSO");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  Email: ${email}`);
  console.log(`  Senha: ${password}`);
  console.log("  ⚠ Troque a senha no primeiro acesso");
  console.log("════════════════════════════════════════════════════════");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
