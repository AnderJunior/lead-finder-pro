-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "AssinaturaStatus" AS ENUM ('ativa', 'vencida', 'cancelada', 'trial', 'suspensa');

-- CreateEnum
CREATE TYPE "AssinaturaCiclo" AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');

-- CreateEnum
CREATE TYPE "PagamentoStatus" AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');

-- CreateEnum
CREATE TYPE "MetaPeriodo" AS ENUM ('diario', 'semanal', 'mensal');

-- CreateTable
CREATE TABLE "empresas" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(255),
    "cnpj" VARCHAR(20),
    "endereco" TEXT,
    "telefone" VARCHAR(30),
    "email_comercial" VARCHAR(255),
    "asaas_customer_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" BIGINT,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT,
    "telefone" TEXT,
    "avatar_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "status" "UserStatus" NOT NULL DEFAULT 'ativo',
    "empresa_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_integracoes" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "google_maps_api_key" TEXT NOT NULL DEFAULT '',
    "serper_api_key" TEXT NOT NULL DEFAULT '',
    "evolution_api_url" TEXT NOT NULL DEFAULT '',
    "evolution_api_instance" TEXT NOT NULL DEFAULT '',
    "evolution_api_key" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" BIGINT,

    CONSTRAINT "configuracoes_integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_globais" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "google_maps_api_key" TEXT NOT NULL DEFAULT '',
    "serper_api_key" TEXT NOT NULL DEFAULT '',
    "evolution_api_url" TEXT NOT NULL DEFAULT '',
    "evolution_api_instance" TEXT NOT NULL DEFAULT '',
    "evolution_api_key" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" BIGINT,

    CONSTRAINT "configuracoes_globais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads_captados" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "rating" DECIMAL(65,30),
    "avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "has_whatsapp" BOOLEAN,
    "whatsapp_status" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "data_captacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem_busca" TEXT,
    "segmento_busca" TEXT,
    "localizacao_busca" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "user_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "etapa_id" BIGINT,
    "valor" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "contato" TEXT,
    "notas" TEXT,
    "status_funil" TEXT NOT NULL DEFAULT 'em_andamento',
    "ordem_funil" INTEGER NOT NULL DEFAULT 0,
    "decisor_nome" TEXT,
    "decisor_telefone" TEXT,
    "decisor_email" TEXT,
    "decisor_cargo" TEXT,
    "decisor_enriquecido_em" TIMESTAMP(3),
    "tamanho_empresa" TEXT,
    "linkedin_url" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_captados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buscas_realizadas" (
    "id" BIGSERIAL NOT NULL,
    "segmento" TEXT,
    "localizacao" TEXT,
    "tipo_pesquisa" TEXT,
    "user_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buscas_realizadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funil_etapas" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "user_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funil_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funil_tarefas" (
    "id" BIGSERIAL NOT NULL,
    "lead_id" BIGINT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_vencimento" TIMESTAMP(3),
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "concluida_em" TIMESTAMP(3),
    "concluida_por_user_id" BIGINT,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funil_tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funil_logs_movimentacao" (
    "id" BIGSERIAL NOT NULL,
    "lead_id" BIGINT NOT NULL,
    "etapa_id" BIGINT NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,

    CONSTRAINT "funil_logs_movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funil_automacoes" (
    "id" BIGSERIAL NOT NULL,
    "etapa_id" BIGINT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dias_vencimento" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funil_automacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_anotacoes" (
    "id" BIGSERIAL NOT NULL,
    "lead_id" BIGINT NOT NULL,
    "texto" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_anotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,
    "periodo" "MetaPeriodo" NOT NULL DEFAULT 'mensal',
    "fixa" BOOLEAN NOT NULL DEFAULT false,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_vendedor" (
    "id" BIGSERIAL NOT NULL,
    "meta_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,
    "empresa_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" BIGSERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco_mensal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "preco_anual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_usuarios" INTEGER NOT NULL DEFAULT 5,
    "max_leads" INTEGER NOT NULL DEFAULT 1000,
    "max_buscas_mes" INTEGER NOT NULL DEFAULT 100,
    "recursos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" BIGSERIAL NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "plano_id" BIGINT NOT NULL,
    "status" "AssinaturaStatus" NOT NULL DEFAULT 'ativa',
    "ciclo" "AssinaturaCiclo" NOT NULL DEFAULT 'mensal',
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "data_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "data_cancelamento" TIMESTAMP(3),
    "asaas_subscription_id" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" BIGSERIAL NOT NULL,
    "assinatura_id" BIGINT NOT NULL,
    "empresa_id" BIGINT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "PagamentoStatus" NOT NULL DEFAULT 'pendente',
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "metodo_pagamento" TEXT,
    "referencia" TEXT,
    "asaas_payment_id" TEXT,
    "asaas_invoice_url" TEXT,
    "asaas_pix_qrcode" TEXT,
    "asaas_pix_payload" TEXT,
    "asaas_boleto_url" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_empresa_id_idx" ON "users"("empresa_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_integracoes_empresa_id_key" ON "configuracoes_integracoes"("empresa_id");

-- CreateIndex
CREATE INDEX "leads_captados_user_id_idx" ON "leads_captados"("user_id");

-- CreateIndex
CREATE INDEX "leads_captados_empresa_id_idx" ON "leads_captados"("empresa_id");

-- CreateIndex
CREATE INDEX "leads_captados_etapa_id_idx" ON "leads_captados"("etapa_id");

-- CreateIndex
CREATE INDEX "leads_captados_data_captacao_idx" ON "leads_captados"("data_captacao");

-- CreateIndex
CREATE INDEX "buscas_realizadas_empresa_id_idx" ON "buscas_realizadas"("empresa_id");

-- CreateIndex
CREATE INDEX "buscas_realizadas_user_id_idx" ON "buscas_realizadas"("user_id");

-- CreateIndex
CREATE INDEX "funil_etapas_user_id_idx" ON "funil_etapas"("user_id");

-- CreateIndex
CREATE INDEX "funil_etapas_empresa_id_idx" ON "funil_etapas"("empresa_id");

-- CreateIndex
CREATE INDEX "funil_tarefas_lead_id_idx" ON "funil_tarefas"("lead_id");

-- CreateIndex
CREATE INDEX "funil_tarefas_empresa_id_idx" ON "funil_tarefas"("empresa_id");

-- CreateIndex
CREATE INDEX "funil_tarefas_concluida_por_user_id_idx" ON "funil_tarefas"("concluida_por_user_id");

-- CreateIndex
CREATE INDEX "funil_logs_movimentacao_lead_id_idx" ON "funil_logs_movimentacao"("lead_id");

-- CreateIndex
CREATE INDEX "funil_logs_movimentacao_etapa_id_idx" ON "funil_logs_movimentacao"("etapa_id");

-- CreateIndex
CREATE INDEX "funil_logs_movimentacao_data_entrada_idx" ON "funil_logs_movimentacao"("data_entrada");

-- CreateIndex
CREATE INDEX "funil_logs_movimentacao_empresa_id_idx" ON "funil_logs_movimentacao"("empresa_id");

-- CreateIndex
CREATE INDEX "funil_automacoes_etapa_id_idx" ON "funil_automacoes"("etapa_id");

-- CreateIndex
CREATE INDEX "funil_automacoes_empresa_id_idx" ON "funil_automacoes"("empresa_id");

-- CreateIndex
CREATE INDEX "lead_anotacoes_lead_id_idx" ON "lead_anotacoes"("lead_id");

-- CreateIndex
CREATE INDEX "metas_empresa_id_idx" ON "metas"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "metas_slug_empresa_id_key" ON "metas"("slug", "empresa_id");

-- CreateIndex
CREATE INDEX "metas_vendedor_empresa_id_idx" ON "metas_vendedor"("empresa_id");

-- CreateIndex
CREATE INDEX "metas_vendedor_user_id_idx" ON "metas_vendedor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "metas_vendedor_meta_id_user_id_key" ON "metas_vendedor"("meta_id", "user_id");

-- CreateIndex
CREATE INDEX "assinaturas_empresa_id_idx" ON "assinaturas"("empresa_id");

-- CreateIndex
CREATE INDEX "pagamentos_asaas_payment_id_idx" ON "pagamentos"("asaas_payment_id");

-- CreateIndex
CREATE INDEX "pagamentos_empresa_id_idx" ON "pagamentos"("empresa_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_integracoes" ADD CONSTRAINT "configuracoes_integracoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_captados" ADD CONSTRAINT "leads_captados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_captados" ADD CONSTRAINT "leads_captados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_captados" ADD CONSTRAINT "leads_captados_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "funil_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buscas_realizadas" ADD CONSTRAINT "buscas_realizadas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buscas_realizadas" ADD CONSTRAINT "buscas_realizadas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_etapas" ADD CONSTRAINT "funil_etapas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_etapas" ADD CONSTRAINT "funil_etapas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_tarefas" ADD CONSTRAINT "funil_tarefas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads_captados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_tarefas" ADD CONSTRAINT "funil_tarefas_concluida_por_user_id_fkey" FOREIGN KEY ("concluida_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_tarefas" ADD CONSTRAINT "funil_tarefas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_logs_movimentacao" ADD CONSTRAINT "funil_logs_movimentacao_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads_captados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_logs_movimentacao" ADD CONSTRAINT "funil_logs_movimentacao_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "funil_etapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_logs_movimentacao" ADD CONSTRAINT "funil_logs_movimentacao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_logs_movimentacao" ADD CONSTRAINT "funil_logs_movimentacao_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_automacoes" ADD CONSTRAINT "funil_automacoes_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "funil_etapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funil_automacoes" ADD CONSTRAINT "funil_automacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_anotacoes" ADD CONSTRAINT "lead_anotacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads_captados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_anotacoes" ADD CONSTRAINT "lead_anotacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_anotacoes" ADD CONSTRAINT "lead_anotacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_vendedor" ADD CONSTRAINT "metas_vendedor_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "metas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_vendedor" ADD CONSTRAINT "metas_vendedor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_vendedor" ADD CONSTRAINT "metas_vendedor_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
