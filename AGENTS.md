# AGENTS.md — Diretrizes Persistentes da Plataforma Pastoral Missionária

> **Regra Inegociável do Ecossistema:**
> Este repositório contém a plataforma digital da **Pastoral Missionária — Ágape Apostolado de Jovens (Paróquia São Vicente de Paulo — Planaltina-DF)**, tendo **São Padre Pio de Pietrelcina** como padroeiro e intercessor principal. Preserve dados reais, integrações, identidade visual e funcionalidades existentes. Reinspecione o código antes de implementar. Trabalhe incrementalmente, execute testes, aplique permissões no backend, não exponha segredos e não execute deploy de produção sem autorização. Nenhuma funcionalidade nova deverá comprometer o módulo existente de camisetas.

---

## 1. Princípios Institucionais e Técnicos

1. **Preservação Integral dos Dados de Camisetas:**
   - Os 19 pedidos iniciais da campanha `Camisetas Pastoral Missionária — 2026` (`R$ 855,00` total, 12 Baby look [10 M, 2 G] e 7 Tradicional [5 G, 2 GG]) e qualquer movimentação financeira/entrega registrada jamais podem ser apagados ou corrompidos.
   - Todos os valores monetários são armazenados e calculados em **centavos inteiros (`integer cents`)**.
2. **Continuidade Administrativa e Sucessão:**
   - A plataforma não depende permanentemente de contas pessoais.
   - Os coordenadores atuais são **Pedro** e **Fernanda**, e o sistema garante transferência segura e auditável de coordenação para futuras gestões, sem deixar a Pastoral sem coordenador ativo.
3. **Separação de Domínios:**
   - O cadastro institucional de missionários (`pastoral_members`) é separado do cadastro de compradores de camisetas (`members`), mantendo vínculo opcional seguro (`buyer_member_id`).
   - O Caixa Geral da Pastoral é separado da contabilidade específica de campanhas de camisetas.
4. **Identidade Católica e Pastoral:**
   - Padroeiro e intercessor principal: **São Padre Pio de Pietrelcina** (*"Uma só coisa é necessária: Estar perto de Jesus."* / *"Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas."*).
   - Paleta institucional: Café (`#3C2D29`), Profundo (`#281F1C`), Dourado (`#B68B4B`), Vinho (`#8E303B`), Creme (`#FAF3E9`).
   - Fuso horário padrão: `America/Sao_Paulo`, moeda `BRL (R$)`, idioma `pt-BR`.
5. **Segurança e LGPD:**
   - Toda autorização deve ser validada no backend (`server/`). Oconder elementos na UI é apenas conveniência visual.
   - Não publicar telefones, e-mails ou dados sensíveis indiscriminadamente.
   - O Diário Missionário Pessoal é estritamente privado ao autor.
   - A Inteligência Artificial (quando acionada) atua apenas como assistente e nunca toma decisões pastorais, financeiras ou administrativas autônomas.

---

## 2. Fluxo Obrigatório Antes de Modificações

1. Gerar backup verificável: `npx tsx server/db/backup.ts`
2. Executar migrações versionadas de forma aditiva em `server/db/migrations.ts`
3. Rodar a suite de testes completa: `npx tsx tests/system_test.ts` e `npx tsx tests/platform_phase1_test.ts`
4. Validar o build de produção: `npm run build`
