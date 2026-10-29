# Segurança, Controle de Acesso (RBAC Granular) e LGPD

## 1. Hierarquia de Papéis e Estados de Conta
- **Estados de Usuário:** `pendente`, `ativo`, `suspenso`, `desativado`, `ex_membro`.
- **Papéis Institucionais:**
  - `admin` / Responsável Técnico Inicial (transferível e auditado).
  - `coordenador` (Inicialmente Pedro e Fernanda).
  - `delegado` (Administradores delegados por módulo: Camisetas, Financeiro, Laboratórios, Calendário, Biblioteca, Moderador, Eventos).
  - `membro` (Missionários ativos).
  - `visitante` (Acesso restrito ao Portal Público Institucional).

## 2. Sucessão e Transferência de Coordenação
- Nunca permite que a Pastoral fique sem ao menos um coordenador ativo.
- Toda promoção ou transição exige registro formal, confirmação e trilha em `audit_logs`.

## 3. Privacidade e Proteção de Dados (LGPD)
- Separação entre compradores de camisetas (`members`) e membros institucionais (`pastoral_members`).
- Telefones e e-mails não são expostos publicamente.
- Fichas de abordagem Porta a Porta não são publicadas nem transformadas em banco público de terceiros.
- O Diário Missionário Pessoal é estritamente privado ao próprio membro.
