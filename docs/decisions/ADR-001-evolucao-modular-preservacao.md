# ADR-001: Evolução Modular com Preservação Integral do Módulo de Camisetas

- **Status:** Aceito (28/10/2026)
- **Contexto:** O sistema original foi construído para gerir os 19 pedidos iniciais de camisetas da campanha 2026 (`R$ 855,00`) e está em produção no Render (`https://pastoral-missionaria.onrender.com/`). A coordenação (Pedro e Fernanda) definiu a evolução para o Ecossistema Digital completo da Pastoral Missionária.
- **Decisão:**
  1. Manter todas as tabelas e rotas originais de camisetas sem mudanças quebradoras.
  2. Introduzir um motor de migrações versionadas (`server/db/migrations.ts`) que adiciona as novas tabelas (`pastoral_members`, `user_capabilities`, `coordination_succession`, `calendar_events`, `preaching_labs`, `lab_themes`, `lab_evaluations`, `dispatch_requests`, `event_templates`, `announcements`) de forma transacional e idempotente.
  3. Organizar a barra lateral com um **Seletor de Contexto** (*Vida Missionária*, *Gestão de Camisetas*, *Governança & Coordenação*), evitando um menu lateral gigantesco e mantendo todas as funcionalidades acessíveis em até 2 cliques.
- **Consequências:** Zero perda de dados, compatibilidade total com os testes existentes e evolução segura fase a fase.
