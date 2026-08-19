CREATE TYPE "public"."papel" AS ENUM('dono', 'membro');--> statement-breakpoint
CREATE TYPE "public"."ajuste_modo" AS ENUM('percentual', 'valor_por_cabeca', 'valor_por_arroba');--> statement-breakpoint
CREATE TYPE "public"."ajuste_tipo" AS ENUM('bonificacao', 'desconto_qualidade', 'outra_deducao');--> statement-breakpoint
CREATE TYPE "public"."categoria_animal" AS ENUM('boi', 'novilho', 'novilha', 'vaca', 'touro');--> statement-breakpoint
CREATE TYPE "public"."frete_modo" AS ENUM('por_cabeca', 'por_km', 'isento');--> statement-breakpoint
CREATE TABLE "compartilhamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"simulacao_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"revogado_em" timestamp with time zone,
	"acessos" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "compartilhamento_expira_depois_de_criar" CHECK ("compartilhamentos"."expira_em" > "compartilhamentos"."criado_em"),
	CONSTRAINT "compartilhamento_acessos_nao_negativo" CHECK ("compartilhamentos"."acessos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"janela_inicio" timestamp with time zone NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_contagem_nao_negativa" CHECK ("rate_limit_hits"."contagem" >= 0)
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"papel" "papel" DEFAULT 'membro' NOT NULL,
	CONSTRAINT "memberships_user_id_org_id_pk" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"senha_hash" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resultados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"oferta_id" uuid NOT NULL,
	"calculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"versao_calculo" text NOT NULL,
	"receita_bruta" numeric(14, 4) NOT NULL,
	"tributos" numeric(14, 4) NOT NULL,
	"frete" numeric(14, 4) NOT NULL,
	"deducoes" numeric(14, 4) NOT NULL,
	"receita_liquida" numeric(14, 4) NOT NULL,
	"valor_presente" numeric(14, 4) NOT NULL,
	"vp_por_cabeca" numeric(14, 4) NOT NULL,
	"vp_por_arroba" numeric(14, 4) NOT NULL,
	CONSTRAINT "resultado_versao_preenchida" CHECK (length("resultados"."versao_calculo") > 0)
);
--> statement-breakpoint
CREATE TABLE "ajustes_oferta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"oferta_id" uuid NOT NULL,
	"tipo" "ajuste_tipo" NOT NULL,
	"nome" text NOT NULL,
	"modo" "ajuste_modo" NOT NULL,
	"valor" numeric(14, 4) NOT NULL,
	CONSTRAINT "ajuste_percentual_ate_cem" CHECK ("ajustes_oferta"."modo" <> 'percentual' or ("ajustes_oferta"."valor" >= 0 and "ajustes_oferta"."valor" <= 1)),
	CONSTRAINT "ajuste_valor_nao_negativo" CHECK ("ajustes_oferta"."valor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ofertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"simulacao_id" uuid NOT NULL,
	"comprador" text NOT NULL,
	"preco_arroba" numeric(14, 4) NOT NULL,
	"rendimento_acordado" numeric(14, 4) NOT NULL,
	"quebra_pct" numeric(14, 4) NOT NULL,
	"prazo_dias" integer NOT NULL,
	"frete_modo" "frete_modo" NOT NULL,
	"frete_valor" numeric(14, 4) DEFAULT '0' NOT NULL,
	"km_rodados" numeric(14, 4),
	"comissao_pct" numeric(14, 4) DEFAULT '0' NOT NULL,
	"observacao" text,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oferta_rendimento_faixa" CHECK ("ofertas"."rendimento_acordado" >= 0.4 and "ofertas"."rendimento_acordado" <= 0.65),
	CONSTRAINT "oferta_quebra_faixa" CHECK ("ofertas"."quebra_pct" >= 0 and "ofertas"."quebra_pct" <= 0.1),
	CONSTRAINT "oferta_prazo_nao_negativo" CHECK ("ofertas"."prazo_dias" >= 0),
	CONSTRAINT "oferta_preco_positivo" CHECK ("ofertas"."preco_arroba" > 0),
	CONSTRAINT "oferta_comissao_faixa" CHECK ("ofertas"."comissao_pct" >= 0 and "ofertas"."comissao_pct" <= 1),
	CONSTRAINT "oferta_km_exigido_no_modo_por_km" CHECK ("ofertas"."frete_modo" <> 'por_km' or ("ofertas"."km_rodados" is not null and "ofertas"."km_rodados" > 0)),
	CONSTRAINT "oferta_isento_sem_custo" CHECK ("ofertas"."frete_modo" <> 'isento' or "ofertas"."frete_valor" = 0)
);
--> statement-breakpoint
CREATE TABLE "simulacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cabecas" integer NOT NULL,
	"peso_vivo_medio_kg" numeric(14, 4) NOT NULL,
	"categoria_animal" "categoria_animal" NOT NULL,
	"taxa_desconto_anual" numeric(14, 4) NOT NULL,
	"regime_tributario_id" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulacao_cabecas_positivo" CHECK ("simulacoes"."cabecas" > 0),
	CONSTRAINT "simulacao_peso_positivo" CHECK ("simulacoes"."peso_vivo_medio_kg" > 0),
	CONSTRAINT "simulacao_taxa_faixa" CHECK ("simulacoes"."taxa_desconto_anual" > -1)
);
--> statement-breakpoint
CREATE TABLE "componentes_tributo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"regime_id" text NOT NULL,
	"nome" text NOT NULL,
	"aliquota" numeric(14, 4) NOT NULL,
	"base" text DEFAULT 'receita_bruta' NOT NULL,
	CONSTRAINT "componente_aliquota_faixa" CHECK ("componentes_tributo"."aliquota" >= 0 and "componentes_tributo"."aliquota" <= 1),
	CONSTRAINT "componente_base_conhecida" CHECK ("componentes_tributo"."base" in ('receita_bruta'))
);
--> statement-breakpoint
CREATE TABLE "regimes_tributarios" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date,
	CONSTRAINT "regime_vigencia_coerente" CHECK ("regimes_tributarios"."vigencia_fim" is null or "regimes_tributarios"."vigencia_fim" >= "regimes_tributarios"."vigencia_inicio")
);
--> statement-breakpoint
ALTER TABLE "compartilhamentos" ADD CONSTRAINT "compartilhamentos_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compartilhamentos" ADD CONSTRAINT "compartilhamentos_simulacao_id_simulacoes_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultados" ADD CONSTRAINT "resultados_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultados" ADD CONSTRAINT "resultados_oferta_id_ofertas_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."ofertas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes_oferta" ADD CONSTRAINT "ajustes_oferta_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes_oferta" ADD CONSTRAINT "ajustes_oferta_oferta_id_ofertas_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."ofertas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_simulacao_id_simulacoes_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulacoes" ADD CONSTRAINT "simulacoes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulacoes" ADD CONSTRAINT "simulacoes_regime_tributario_id_regimes_tributarios_id_fk" FOREIGN KEY ("regime_tributario_id") REFERENCES "public"."regimes_tributarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "componentes_tributo" ADD CONSTRAINT "componentes_tributo_regime_id_regimes_tributarios_id_fk" FOREIGN KEY ("regime_id") REFERENCES "public"."regimes_tributarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compartilhamentos_token" ON "compartilhamentos" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_chave_janela" ON "rate_limit_hits" USING btree ("chave","janela_inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unico" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "resultados_org_oferta" ON "resultados" USING btree ("org_id","oferta_id");--> statement-breakpoint
CREATE INDEX "ajustes_org_oferta" ON "ajustes_oferta" USING btree ("org_id","oferta_id");--> statement-breakpoint
CREATE INDEX "ofertas_org_simulacao" ON "ofertas" USING btree ("org_id","simulacao_id");--> statement-breakpoint
CREATE INDEX "simulacoes_org" ON "simulacoes" USING btree ("org_id");