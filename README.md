# 🕊️ Sistema de Gestão da Pastoral Missionária
### Ágape Apostolado de Jovens — Paróquia São Vicente de Paulo (Planaltina-DF)
**Padroeiro:** São Padre Pio de Pietrelcina  
*"Uma só coisa é necessária: Estar perto de Jesus."*

---

## 📋 Visão Geral

Aplicativo web completo, moderno, responsivo e seguro projetado para o controle de encomendas, pagamentos, produção e entregas das camisetas oficiais da **Pastoral Missionária**. O sistema conta com persistência em banco relacional SQLite com alta integridade (centavos exatos), emissão de relatórios profissionais (Excel, PDF e CSV) e sincronização automática com o **Google Planilhas** através de fila outbox transacional.

---

## 🚀 Como Executar o Sistema

### Pré-requisitos
- Node.js (v18 ou superior instalado)
- npm

### 1. Iniciar o Sistema (Produção)
Para iniciar o servidor web completo (Backend API + Frontend na mesma porta 3001):
```bash
npm start
```
O aplicativo estará acessível no navegador em:
👉 **http://localhost:3001**

### 2. Modo Desenvolvimento
Para executar com hot-reload (Vite + Nodemon/TSX):
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

---

## 🔑 Credenciais Padrão de Acesso

O sistema já vem inicializado com 3 perfis de acesso:

| Perfil | E-mail de Acesso | Senha | Permissões |
|---|---|---|---|
| **Administrador** | `admin@pastoralmissionaria.com.br` | `pastoral@2026` | Acesso total, configurações, usuários, estornos, Google Planilhas |
| **Coordenador** | `coordenacao@pastoralmissionaria.com.br` | `coordenacao@2026` | Cadastro de pedidos, membros, recebimento de pagamentos e entregas |
| **Consulta** | `consulta@pastoralmissionaria.com.br` | `consulta@2026` | Visualização de relatórios e painéis (somente leitura) |

> Na tela de login, há botões de **preenchimento rápido (1 clique)** para testar cada perfil instantaneamente.

---

## 👕 Dados Iniciais Importados (Campanha 2026)

Os **19 membros e pedidos oficiais** foram importados de forma idempotente:

| Nº | Membro | Modelo | Tamanho | Quantidade | Total | Pago | Saldo Pendente |
|---|---|---|---|---|---|---|---|
| 1 | Duda Fernandes | Baby look | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 2 | Lyvia | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 3 | Állan | Tradicional | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 4 | Jamilly | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 5 | Vini | Tradicional | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 6 | Laysa | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 7 | Victor | Tradicional | GG | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 8 | Malu Neres | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 9 | Júlia | Baby look | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 10 | Leticia | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 11 | Saulo | Tradicional | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 12 | Manuella | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 13 | Maria Júlia | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 14 | Mariane | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 15 | Maria Luiza Lima | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 16 | Erick Kilbert | Tradicional | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 17 | Alfredo | Tradicional | GG | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 18 | Tiago | Tradicional | G | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |
| 19 | Duda Soares | Baby look | M | 1 | R$ 45,00 | R$ 0,00 | R$ 45,00 |

### Totais Consolidados:
- **19 membros**
- **19 camisetas**
- **12 Baby look** (10 M, 2 G)
- **7 Tradicional** (5 G, 2 GG)
- **Valor total previsto:** R$ 855,00
- **Valor recebido:** R$ 0,00
- **Valor pendente:** R$ 855,00

---

## 📊 Sincronização com o Google Planilhas

A integração com o Google Planilhas foi construída com suporte a dois métodos:

### Opção 1: Modo Webhook (Google Apps Script) — Mais simples e recomendada
1. Crie uma planilha nova no seu Google Drive (ex: "Camisetas Pastoral Missionária 2026").
2. No menu da planilha, clique em **Extensões** > **Apps Script**.
3. No sistema da pastoral, acesse a aba **Google Planilhas** e copie o código pronto exibido na caixa de texto.
4. Cole o código no editor do Apps Script e clique no botão **Salvar** (ícone de disquete).
5. Clique em **Implantar** > **Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu (seu e-mail)**
   - Quem tem acesso: **Qualquer pessoa (Anyone)**
6. Clique em **Implantar**, autorize o acesso da sua conta Google e copie o **URL do App da Web**.
7. Cole esse URL no campo correspondente na aba **Google Planilhas** do sistema e clique em **Salvar Configurações**.
8. Pronto! Todas as 8 abas serão geradas e atualizadas automaticamente a cada novo pedido ou pagamento!

### Opção 2: Modo Google Cloud Service Account
Para ambientes corporativos que utilizam Service Account JSON:
1. Informe o **Spreadsheet ID** (a parte entre `/d/` e `/edit` no URL da sua planilha).
2. Compartilhe a planilha do Google com o e-mail da sua Conta de Serviço com permissão de **Editor**.
3. Insira o e-mail e a chave privada RSA na tela de configurações.

### As 8 Abas Sincronizadas:
1. `Pedidos` — Tabela completa de pedidos, valores, dados de entrega e observações.
2. `Membros` — Diretório dos membros, telefones, total de pedidos e gastos.
3. `Pagamentos` — Extrato de todos os recebimentos com forma de pagamento e responsável.
4. `Financeiro` — Resumo em tempo real da arrecadação, valores pendentes e metas.
5. `Tamanhos e modelos` — Grade de corte (Tradicional e Baby look) para confecção.
6. `Produção e entregas` — Fluxo etapa por etapa e registro de quem recebeu cada camiseta.
7. `Campanhas` — Relação dos períodos de encomenda e estatísticas acumuladas.
8. `Histórico` — Auditoria das alterações recentes.

---

## 📱 Notificações via WhatsApp

O sistema possui gerador integrado de mensagens pastorais prontas:
- **Lembrete carinhoso de pagamento** (com valor pendente exato e chave Pix)
- **Confirmação de pedido** (com modelo e tamanho)
- **Aviso de camiseta disponível para entrega**
- Botão direto para abrir a conversa no **WhatsApp Web** ou no app do celular.

---

## 📁 Estrutura do Código

```
├── client/ (src/)
│   ├── components/
│   │   ├── common/        # Badges, Modais, Confetti
│   │   ├── layout/        # Sidebar, Header, MobileNav
│   │   └── modals/        # Novo Pedido, Pagamento, Entrega, WhatsApp, Edição
│   ├── context/           # AuthContext (JWT, sessão, permissões)
│   ├── services/          # Cliente API tipado
│   ├── types/             # Definições TypeScript
│   ├── utils/             # Formatadores monetários, de data e telefone
│   └── views/             # 10 Telas administrativas + Login
├── server/
│   ├── db/
│   │   ├── database.ts    # Conexão SQLite (WAL mode, transações)
│   │   ├── seed.ts        # Seed idempotente dos 19 pedidos e usuários
│   │   └── reset.ts       # Restauração limpa
│   ├── routes/            # Rotas REST da API
│   ├── services/
│   │   ├── exportService.ts       # Geração de Excel (.xlsx), CSV e PDF
│   │   └── googleSheetsService.ts # Motor de sincronização e outbox queue
│   └── index.ts           # Servidor Express principal
└── data/
    └── pastoral_missionaria.sqlite # Banco de dados relacional persistente
```

