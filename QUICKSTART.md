# Guia de Início Rápido - Backend LEXA

## 🚀 Como Executar

### 1. Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL 14+ rodando
- npm ou yarn

### 2. Instalação

```bash
cd backend
npm install
```

### 3. Configuração

Copie o arquivo de exemplo e configure:
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lexa"
JWT_SECRET="seu-secret-aqui"
OPENAI_API_KEY="sk-..."
```

### 4. Prisma

```bash
# Gerar cliente Prisma
npx prisma generate

# Executar migrations
npx prisma migrate dev

# (Opcional) Abrir Prisma Studio
npx prisma studio
```

### 5. Executar

```bash
# Desenvolvimento (hot reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

O servidor estará rodando em: `http://localhost:3000`

---

## 🧪 Testando a API

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lexa.com",
    "password": "senha123"
  }'
```

Resposta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 2. Usar Token

Copie o `access_token` e use em todas as requisições:

```bash
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Testar AI

```bash
curl -X POST http://localhost:3000/api/ai/process \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, como você pode me ajudar?",
    "conversationId": "uuid-da-conversa",
    "organizationId": "uuid-da-org"
  }'
```

---

## 📊 Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/session` - Sessão atual

### Organizations
- `GET /api/organizations` - Listar organizações
- `POST /api/organizations` - Criar organização

### Agents
- `GET /api/agents` - Listar agentes
- `POST /api/agents` - Criar agente

### Conversations
- `GET /api/conversations` - Listar conversas
- `POST /api/conversations` - Criar conversa

### AI
- `POST /api/ai/process` - Processar mensagem com IA

---

## 🔍 Verificação de Saúde

```bash
# Verificar se o servidor está rodando
curl http://localhost:3000

# Verificar build
npm run build
```

---

## 🐛 Troubleshooting

### Erro de Conexão com Banco
```bash
# Verificar se PostgreSQL está rodando
# Windows:
Get-Service postgresql*

# Verificar conexão
psql -U postgres -d lexa
```

### Erro de Prisma
```bash
# Regenerar cliente
npx prisma generate

# Resetar banco (CUIDADO: apaga dados)
npx prisma migrate reset
```

### Erro de Dependências
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Logs

Os logs aparecem no console durante desenvolvimento:
```
[Nest] 12345  - 13/12/2024, 00:54:18     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 13/12/2024, 00:54:18     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 13/12/2024, 00:54:18     LOG [RoutesResolver] AppController {/}: +2ms
[Nest] 12345  - 13/12/2024, 00:54:18     LOG [RouterExplorer] Mapped {/api/auth/login, POST} route
...
[Nest] 12345  - 13/12/2024, 00:54:18     LOG [NestApplication] Nest application successfully started
```

---

## ✅ Checklist de Verificação

- [ ] PostgreSQL rodando
- [ ] `.env` configurado
- [ ] `npm install` executado
- [ ] `npx prisma generate` executado
- [ ] `npx prisma migrate dev` executado
- [ ] `npm run start:dev` funcionando
- [ ] Login testado e retornando token
- [ ] Endpoints protegidos acessíveis com token

---

## 🎯 Próximos Passos

1. **Testar todos os endpoints** com Postman ou Insomnia
2. **Configurar integrações** (OpenAI, ElevenLabs, etc.)
3. **Conectar frontend** ao novo backend
4. **Migrar dados** do sistema antigo (se necessário)
5. **Deploy** em produção

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no console
2. Verifique o arquivo `.env`
3. Verifique se todas as dependências estão instaladas
4. Verifique se o PostgreSQL está acessível

---

**Backend LEXA - Pronto para uso! 🚀**
