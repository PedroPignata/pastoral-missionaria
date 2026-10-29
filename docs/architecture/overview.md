# Arquitetura do Ecossistema Digital da Pastoral Missionária

## 1. Visão Geral da Stack
- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS 3.4 + Lucide Icons + Recharts.
- **Backend:** Node.js + Express 5 + TypeScript (`tsx`).
- **Banco de Dados:** SQLite (`better-sqlite3`) em modo `WAL` com chaves estrangeiras ativas (`PRAGMA foreign_keys = ON`) e sistema de migrações versionadas (`schema_migrations`).
- **Integrações:** Google Sheets (Outbox Pattern em 8 abas), Google OAuth/OIDC, Exportação Excel/PDF/CSV e Links WhatsApp revisáveis.

## 2. Organização Modular
- `server/db/database.ts`: Conexão e schema base do módulo de camisetas.
- `server/db/migrations.ts`: Motor de migrações versionadas para o Ecossistema 2.0 (Calendário 2027, Laboratórios, Missões, Envios, Governança, Templates e Comunicados).
- `server/db/backup.ts`: Geração de snapshots `.sqlite` e `.json` com verificação de integridade.
- `server/routes/`: Roteadores REST separados por domínio (`auth`, `orders`, `payments`, `deliveries`, `members`, `campaigns`, `reports`, `sheets`, `whatsapp`, `settings`, `platform`).
- `src/views/`: Views organizadas em 3 grandes contextos:
  1. **Portal Público Institucional** (`PublicPortalView.tsx`)
  2. **Vida Missionária & Membros** (`PainelMissionarioView.tsx`, `Calendario2027View.tsx`, `MissoesEnviosView.tsx`, `FormacaoLaboratoriosView.tsx`, `MinhaCamisetaView.tsx`)
  3. **Coordenação & Camisetas** (`GovernancaSucessaoView.tsx` + as 11 telas originais do módulo de camisetas).
