# Configuração Redis para BullMQ

## Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Redis Configuration (para BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Opcional: Redis URL completa (alternativa às variáveis acima)
# REDIS_URL=redis://localhost:6379
```

## Desenvolvimento Local

### Opção 1: Redis via Docker
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Opção 2: Redis via Docker Compose
Adicione ao `docker-compose.yml`:
```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Produção

Configure as variáveis de ambiente com os valores do seu Redis em produção:
- `REDIS_HOST`: Endereço do servidor Redis
- `REDIS_PORT`: Porta (geralmente 6379)
- `REDIS_PASSWORD`: Senha (se configurada)

## Verificar Conexão

Após configurar, verifique se o Redis está acessível:
```bash
redis-cli ping
# Deve retornar: PONG
```

## Monitoramento (Opcional)

Para monitorar as filas, você pode adicionar Bull Board:
```bash
npm install @bull-board/api @bull-board/express
```

RESEND_API_KEY=re_xxxxx
EMAIL_FROM=LEXA IA <noreply@lexa.com>
FRONTEND_URL=http://localhost:3000
