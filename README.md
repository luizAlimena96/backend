# LEXA Backend - NestJS

Backend completo do sistema LEXA migrado para NestJS com arquitetura modular e escalável.

## 🚀 Status da Migração

**✅ MIGRAÇÃO COMPLETA - 21 Módulos Funcionais**

- **50+ Endpoints API** protegidos por JWT
- **Build:** ✅ Compilando sem erros
- **Prisma:** ✅ Integrado e funcionando
- **Autenticação:** ✅ JWT completo

---

## 📦 Módulos Implementados

### Core Modules (18)
1. **AuthModule** - Autenticação JWT
2. **OrganizationsModule** - Gerenciamento de organizações
3. **AgentsModule** - Agentes de IA
4. **ConversationsModule** - Conversas
5. **LeadsModule** - Leads e clientes
6. **KnowledgeModule** - Base de conhecimento
7. **DashboardModule** - Métricas e analytics
8. **WebhooksModule** - Webhooks WhatsApp
9. **UsersModule** - Usuários
10. **StatesModule** - Estados FSM
11. **CRMModule** - CRM (Configs, Stages, Automations)
12. **FollowupsModule** - Follow-ups automáticos
13. **RemindersModule** - Lembretes
14. **QuickResponsesModule** - Respostas rápidas
15. **ResponseTemplatesModule** - Templates de resposta
16. **AppointmentsModule** - Agendamentos
17. **FeedbackModule** - Sistema de feedback
18. **TagsModule** - Tags para conversas

### AI Module
- **OpenAI Service** - Chat completions, Whisper, Embeddings
- **Media Analysis** - Processamento de imagens, PDFs, vídeos
- **Event Emitter** - SSE para real-time updates
- **AI Service** - Processamento completo de mensagens

### Integrations Module
- **ElevenLabs** - Text-to-Speech
- **Google Calendar** - Sincronização de calendário
- **ZapSign** - Assinatura de documentos

### Common Module
- **Debug Service** - Logging de interações
- **CRM Webhook Service** - Webhooks externos

---

## 🛠️ Tecnologias

- **NestJS** - Framework backend
- **Prisma** - ORM
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **OpenAI SDK** - IA e processamento
- **Axios** - HTTP client

---

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── ai/                    # AI Module
│   ├── integrations/          # Integrações externas
│   ├── common/                # Serviços compartilhados
│   ├── auth/                  # Autenticação
│   ├── organizations/         # Organizações
│   ├── agents/                # Agentes
│   ├── conversations/         # Conversas
│   ├── leads/                 # Leads
│   ├── knowledge/             # Base de conhecimento
│   ├── dashboard/             # Dashboard
│   ├── webhooks/              # Webhooks
│   ├── users/                 # Usuários
│   ├── states/                # Estados FSM
│   ├── crm/                   # CRM
│   ├── followups/             # Follow-ups
│   ├── reminders/             # Lembretes
│   ├── quick-responses/       # Respostas rápidas
│   ├── response-templates/    # Templates
│   ├── appointments/          # Agendamentos
│   ├── feedback/              # Feedback
│   ├── tags/                  # Tags
│   ├── database/              # Prisma
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── .env.example
└── package.json
```

---

## 🔧 Setup

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 3. Configurar Prisma
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Executar
```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

---

## 🔑 Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lexa"
DIRECT_URL="postgresql://user:password@localhost:5432/lexa"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="sk-..."

# ElevenLabs
ELEVENLABS_API_KEY="..."

# Google
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# ZapSign
ZAPSIGN_API_TOKEN="..."
```

---

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/session` - Sessão atual

### AI
- `POST /api/ai/process` - Processar mensagem com IA

### Organizations
- `GET /api/organizations` - Listar
- `POST /api/organizations` - Criar
- `PATCH /api/organizations/:id` - Atualizar

### Agents
- `GET /api/agents` - Listar
- `GET /api/agents/:id` - Obter
- `POST /api/agents` - Criar
- `PUT /api/agents/:id` - Atualizar
- `DELETE /api/agents/:id` - Deletar

### Conversations
- `GET /api/conversations` - Listar
- `GET /api/conversations/:id` - Obter
- `POST /api/conversations` - Criar
- `PATCH /api/conversations/:id/ai-toggle` - Toggle IA

### Leads
- `GET /api/leads` - Listar
- `GET /api/leads/:id` - Obter
- `POST /api/leads` - Criar
- `PUT /api/leads/:id` - Atualizar
- `DELETE /api/leads/:id` - Deletar

### CRM
- `GET/POST/PUT/DELETE /api/crm/configs` - Configurações
- `GET/POST/PUT/DELETE /api/crm/stages` - Estágios
- `PATCH /api/crm/stages/reorder` - Reordenar
- `GET/POST/PUT/DELETE /api/crm/automations` - Automações

*E mais 30+ endpoints para outros módulos...*

---

## 🔒 Autenticação

Todas as rotas (exceto `/api/auth/login`) são protegidas por JWT.

**Header necessário:**
```
Authorization: Bearer <token>
```

---

## 🧪 Testes

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 📝 Próximos Passos

### Implementações Futuras
- [ ] FSM Engine completo (3-AI system)
- [ ] WhatsApp Webhook handler completo
- [ ] BullMQ para filas de processamento
- [ ] Testes automatizados
- [ ] Documentação Swagger/OpenAPI

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Propriedade de LEXA - Todos os direitos reservados

---

## 👥 Equipe

Desenvolvido pela equipe LEXA

---

## 📞 Suporte

Para suporte, entre em contato através do email: suporte@lexa.com.br
