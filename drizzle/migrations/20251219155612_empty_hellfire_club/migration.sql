CREATE TABLE "access_roles" (
	"role_id" integer,
	"access_id" varchar,
	CONSTRAINT "access_roles_pkey" PRIMARY KEY("role_id","access_id")
);
--> statement-breakpoint
CREATE TABLE "accesses" (
	"id" varchar PRIMARY KEY,
	"remark" text,
	"trpc_access" jsonb
);
--> statement-breakpoint
CREATE TABLE "assistant_tools" (
	"assistant_id" integer,
	"tool_id" varchar,
	CONSTRAINT "assistant_tools_pkey" PRIMARY KEY("assistant_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "assistant_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"assistant_id" integer NOT NULL,
	"model" varchar NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "assistant_usages_assistant_id_created_at_model_unique" UNIQUE("assistant_id","created_at","model")
);
--> statement-breakpoint
CREATE TABLE "assistants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assistants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"mode" varchar NOT NULL,
	"api_key" varchar,
	"base_url" text,
	"web_search_id" integer,
	"prompt" text,
	"taskModel" varchar,
	"models" jsonb NOT NULL,
	"options" jsonb NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_providers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth_providers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"issuer" varchar,
	"auth_url" text NOT NULL,
	"description" text,
	"token_url" text NOT NULL,
	"userinfo_url" text,
	"jwks_uri" text,
	"client_id" text NOT NULL,
	"client_secret" text,
	"scopes" varchar,
	"role_id" integer NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"use_pkce" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" varchar PRIMARY KEY,
	"title" text NOT NULL,
	"user_id" integer NOT NULL,
	"assistant_id" integer,
	"public" boolean DEFAULT false,
	"model" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_chat_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "limits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assistant_id" integer,
	"type" varchar NOT NULL,
	"time" varchar NOT NULL,
	"num" integer NOT NULL,
	"options" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY,
	"role" varchar NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" varchar NOT NULL,
	"error" text,
	"model" varchar,
	"context" json,
	"assistant_id" integer,
	"reasoning_duration" integer,
	"parts" json,
	"files" jsonb,
	"text" text,
	"previous_summary" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"steps" json,
	"terminated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "models_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"model" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"options" text,
	CONSTRAINT "models_provider_model_unique" UNIQUE("provider","model")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"provider_id" integer NOT NULL,
	"provider_user_id" varchar NOT NULL,
	"user_id" integer NOT NULL,
	"profile_json" text,
	CONSTRAINT "oauth_accounts_provider_id_provider_user_id_unique" UNIQUE("provider_id","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"task" varchar NOT NULL,
	"assistant_id" integer,
	"model" varchar,
	"user_id" integer,
	"message_id" varchar,
	"chat_id" varchar,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_assistants" (
	"assistant_id" integer,
	"role_id" integer,
	CONSTRAINT "role_assistants_pkey" PRIMARY KEY("assistant_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"all_assistants" boolean NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY,
	"value" json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" varchar PRIMARY KEY,
	"name" varchar NOT NULL,
	"description" text NOT NULL,
	"type" varchar NOT NULL,
	"params" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" integer,
	"role_id" integer,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar UNIQUE,
	"phone" varchar UNIQUE,
	"email" varchar UNIQUE,
	"avatar" varchar,
	"password" varchar,
	"deleted" boolean DEFAULT false NOT NULL,
	"root" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "web_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"mode" varchar NOT NULL,
	"params" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "access_roles_role_id_index" ON "access_roles" ("role_id");--> statement-breakpoint
CREATE INDEX "assistant_tools_assistant_id_index" ON "assistant_tools" ("assistant_id");--> statement-breakpoint
CREATE INDEX "assistant_usages_created_at_index" ON "assistant_usages" ("created_at");--> statement-breakpoint
CREATE INDEX "chats_user_id_index" ON "chats" ("user_id");--> statement-breakpoint
CREATE INDEX "limits_assistant_id_type_index" ON "limits" ("assistant_id","type");--> statement-breakpoint
CREATE INDEX "messages_user_id_chat_id_index" ON "messages" ("user_id","chat_id");--> statement-breakpoint
CREATE INDEX "requests_task_assistant_id_created_at_index" ON "requests" ("task","assistant_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_chat_id_message_id_index" ON "requests" ("chat_id","message_id");--> statement-breakpoint
CREATE INDEX "requests_created_at_index" ON "requests" ("created_at");--> statement-breakpoint
CREATE INDEX "requests_model_index" ON "requests" ("model");--> statement-breakpoint
CREATE INDEX "role_assistants_role_id_index" ON "role_assistants" ("role_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_index" ON "user_roles" ("user_id");--> statement-breakpoint
ALTER TABLE "access_roles" ADD CONSTRAINT "access_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");--> statement-breakpoint
ALTER TABLE "access_roles" ADD CONSTRAINT "access_roles_access_id_accesses_id_fkey" FOREIGN KEY ("access_id") REFERENCES "accesses"("id");--> statement-breakpoint
ALTER TABLE "assistant_tools" ADD CONSTRAINT "assistant_tools_assistant_id_assistants_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id");--> statement-breakpoint
ALTER TABLE "assistant_tools" ADD CONSTRAINT "assistant_tools_tool_id_tools_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id");--> statement-breakpoint
ALTER TABLE "assistant_usages" ADD CONSTRAINT "assistant_usages_assistant_id_assistants_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id");--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_web_search_id_web_searches_id_fkey" FOREIGN KEY ("web_search_id") REFERENCES "web_searches"("id");--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_assistant_id_assistants_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "limits" ADD CONSTRAINT "limits_assistant_id_assistants_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_assistant_id_assistants_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id");--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_provider_id_auth_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "auth_providers"("id");--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "role_assistants" ADD CONSTRAINT "role_assistants_assistant_id_assistants_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id");--> statement-breakpoint
ALTER TABLE "role_assistants" ADD CONSTRAINT "role_assistants_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");