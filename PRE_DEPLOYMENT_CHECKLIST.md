# Pre-Deployment Checklist - Redis & BullMQ

## 📋 Checklist Completo para Deploy em Produção (Hetzner VPS)

---

## 1. Configuração de Arquivos

### ✅ redis.conf
- [ ] `bind 127.0.0.1 ::1` (localhost apenas)
- [ ] `protected-mode yes` (proteção ativa)
- [ ] `requirepass` com senha forte (32+ caracteres)
- [ ] `port 6379` (porta padrão)
- [ ] `maxmemory 512mb` (ou conforme RAM disponível)
- [ ] `maxmemory-policy noeviction` (para BullMQ)
- [ ] `appendonly yes` (persistência AOF)
- [ ] Comandos perigosos desabilitados (FLUSHDB, FLUSHALL, CONFIG, etc.)

### ✅ .env (Backend)
- [ ] `REDIS_HOST=127.0.0.1` (NUNCA 0.0.0.0 ou IP público)
- [ ] `REDIS_PORT=6379`
- [ ] `REDIS_DB=0`
- [ ] `REDIS_PASSWORD` configurado (mesma senha do redis.conf)
- [ ] `BULLMQ_MAX_RETRIES=2` (ou conforme necessidade)
- [ ] `BULLMQ_CONNECTION_TIMEOUT=3000`
- [ ] `BULLMQ_COMMAND_TIMEOUT=3000`

### ✅ queues.module.ts
- [ ] `maxRetriesPerRequest: null` (BullMQ requirement)
- [ ] `enableOfflineQueue: false` (não enfileirar offline)
- [ ] `enableReadyCheck: true` (verificar Redis pronto)
- [ ] `lazyConnect: false` (conectar imediatamente)
- [ ] `family: 4` (IPv4 apenas)
- [ ] Retry strategy com limite (max 2 tentativas)
- [ ] Timeouts reduzidos (3000ms)

---

## 2. Segurança de Rede

### ✅ Firewall
```bash
# UFW (recomendado)
sudo ufw deny 6379/tcp
sudo ufw reload
sudo ufw status | grep 6379

# OU iptables
sudo iptables -A INPUT -p tcp --dport 6379 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

- [ ] Firewall configurado bloqueando porta 6379 externamente
- [ ] Regra verificada com `sudo ufw status` ou `sudo iptables -L`

### ✅ Verificação de Rede
```bash
# Redis escuta APENAS em localhost
netstat -tlnp | grep 6379
# Esperado: 127.0.0.1:6379 LISTEN

# Teste de acesso externo (de outra máquina)
telnet <IP_PUBLICO_VPS> 6379
# Esperado: Connection refused ou timeout
```

- [ ] `netstat` mostra APENAS 127.0.0.1:6379
- [ ] Teste externo falha (connection refused)

---

## 3. Autenticação Redis

### ✅ Gerar Senha Forte
```bash
openssl rand -base64 32
```

- [ ] Senha gerada com 32+ caracteres
- [ ] Senha adicionada ao `redis.conf` (`requirepass`)
- [ ] Mesma senha adicionada ao `.env` (`REDIS_PASSWORD`)

### ✅ Testar Autenticação
```bash
# Sem senha (deve falhar)
redis-cli -h 127.0.0.1 -p 6379 ping
# Esperado: (error) NOAUTH Authentication required

# Com senha (deve funcionar)
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" ping
# Esperado: PONG
```

- [ ] Conexão sem senha falha
- [ ] Conexão com senha funciona

---

## 4. Serviços e Processos

### ✅ Redis Service
```bash
# Verificar status
sudo systemctl status redis

# Reiniciar após mudanças
sudo systemctl restart redis

# Habilitar auto-start
sudo systemctl enable redis
```

- [ ] Redis rodando (`active (running)`)
- [ ] Redis configurado para auto-start no boot

### ✅ Backend Application
```bash
# Testar localmente
cd /caminho/para/backend
npm run start:dev

# Verificar logs
# NÃO deve aparecer: "WARNING! Your redis options maxRetriesPerRequest must be null"
```

- [ ] Backend inicia sem erros
- [ ] Sem warnings do BullMQ
- [ ] Conexão Redis estabelecida com sucesso

---

## 5. Testes Funcionais

### ✅ Teste de Conexão BullMQ
```bash
# No diretório do backend
node -e "
const { Queue } = require('bullmq');
const queue = new Queue('test', {
  connection: {
    host: '127.0.0.1',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
  }
});
queue.add('test-job', { data: 'test' }).then(() => {
  console.log('✅ Queue test passed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Queue test failed:', err);
  process.exit(1);
});
"
```

- [ ] Teste de queue passa sem erros

### ✅ Teste de Processamento de Jobs
```bash
# Criar um job de teste (via API ou código)
# Exemplos: followup, reminder, crm-sync
```

- [ ] Job é adicionado à fila
- [ ] Job é processado pelo worker
- [ ] Logs mostram processamento bem-sucedido
- [ ] Sem erros de retry ou timeout

---

## 6. Monitoramento Inicial

### ✅ Logs do Redis
```bash
# Monitorar em tempo real
sudo tail -f /var/log/redis/redis-server.log

# Verificar erros
sudo grep -i error /var/log/redis/redis-server.log
```

- [ ] Sem erros críticos nos logs
- [ ] Sem tentativas de conexão externa

### ✅ Logs do Backend
```bash
# Monitorar logs da aplicação
pm2 logs backend

# OU se usando npm
npm run start:dev | grep -i redis
```

- [ ] Conexão Redis estabelecida
- [ ] Sem warnings do BullMQ
- [ ] Jobs sendo processados normalmente

---

## 7. Performance e Recursos

### ✅ Uso de Memória
```bash
# Verificar uso de memória do Redis
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" INFO memory

# Verificar limite configurado
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" CONFIG GET maxmemory
```

- [ ] Uso de memória dentro do limite configurado
- [ ] `maxmemory` configurado adequadamente

### ✅ Uso de CPU
```bash
# Monitorar processos
top -p $(pgrep redis-server)
htop
```

- [ ] CPU do Redis estável (não 100%)
- [ ] Sem loops de retry consumindo recursos

---

## 8. Backup e Persistência

### ✅ Arquivos de Persistência
```bash
# Verificar arquivos RDB e AOF
ls -lh /var/lib/redis/
# Deve mostrar: dump.rdb e appendonly.aof
```

- [ ] `dump.rdb` existe
- [ ] `appendonly.aof` existe
- [ ] Permissões corretas (redis:redis)

### ✅ Backup Inicial
```bash
# Fazer backup manual
sudo cp /var/lib/redis/dump.rdb /backup/redis/dump.rdb.$(date +%Y%m%d)
sudo cp /var/lib/redis/appendonly.aof /backup/redis/appendonly.aof.$(date +%Y%m%d)
```

- [ ] Backup inicial criado
- [ ] Backup automático configurado (cron)

---

## 9. Documentação

### ✅ Arquivos de Referência
- [ ] `.env.production.template` criado
- [ ] `REDIS_SECURITY.md` criado
- [ ] `PRE_DEPLOYMENT_CHECKLIST.md` (este arquivo) criado
- [ ] `redis.conf` comentado e documentado

### ✅ Senhas e Credenciais
- [ ] Senha Redis armazenada em gerenciador de senhas
- [ ] `.env` NÃO commitado no git
- [ ] `.gitignore` inclui `.env*`

---

## 10. Pós-Deploy (Primeiras 24h)

### ✅ Monitoramento Contínuo
```bash
# Monitorar logs
sudo tail -f /var/log/redis/redis-server.log
pm2 logs backend

# Verificar conexões
watch -n 5 'netstat -tlnp | grep 6379'
```

- [ ] Monitorar logs por 24h
- [ ] Verificar sem tentativas de conexão externa
- [ ] Verificar sem loops de retry
- [ ] Verificar performance estável

### ✅ Alertas
- [ ] Configurar alertas de CPU/memória (Hetzner, Datadog, etc.)
- [ ] Configurar alertas de disco cheio
- [ ] Configurar alertas de falha de serviço

---

## ⚠️ AVISOS CRÍTICOS

### 🚨 Hetzner Bloqueio
- **Hetzner BLOQUEIA VPS que fazem scan de rede**
- Se Redis tentar conectar a IPs externos, VPS pode ser bloqueado
- **SEMPRE** use `127.0.0.1` e **NUNCA** `0.0.0.0`

### 🚨 Segurança
- **NUNCA** exponha porta 6379 para internet
- **NUNCA** use senha fraca ou padrão
- **SEMPRE** use firewall bloqueando porta 6379

### 🚨 BullMQ
- **SEMPRE** use `maxRetriesPerRequest: null`
- **SEMPRE** use `enableOfflineQueue: false`
- **SEMPRE** limite retries para evitar loops

---

## ✅ Checklist Final

Antes de fazer deploy em produção, confirme:

- [ ] Todos os itens acima foram verificados
- [ ] Redis escuta APENAS em 127.0.0.1
- [ ] Firewall bloqueando porta 6379
- [ ] Senha forte configurada
- [ ] BullMQ sem warnings
- [ ] Testes funcionais passando
- [ ] Backup configurado
- [ ] Monitoramento ativo

**Se TODOS os itens estão ✅, você está pronto para produção!**
