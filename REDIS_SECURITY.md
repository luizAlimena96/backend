# Redis Security Guide - Hetzner VPS Production

## 🔒 Objetivo

Garantir que Redis rode **APENAS em localhost**, com autenticação, e **NUNCA** seja acessível externamente, evitando bloqueio da Hetzner por scan de rede.

---

## 1. Configuração de Firewall

### UFW (Ubuntu Firewall - Recomendado)

```bash
# Bloquear porta 6379 de qualquer acesso externo
sudo ufw deny 6379/tcp

# Verificar regra foi adicionada
sudo ufw status numbered

# Recarregar firewall
sudo ufw reload
```

### iptables (Alternativa)

```bash
# Bloquear porta 6379 de IPs externos
sudo iptables -A INPUT -p tcp --dport 6379 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP

# Salvar regras permanentemente
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Verificar regras
sudo iptables -L -n -v | grep 6379
```

---

## 2. Verificação de Segurança

### 2.1 Verificar Redis está em Localhost

```bash
# Verificar que Redis escuta APENAS em 127.0.0.1
netstat -tlnp | grep 6379

# ✅ CORRETO: 127.0.0.1:6379 LISTEN
# ❌ ERRADO:  0.0.0.0:6379 LISTEN (EXPOSTO!)
```

### 2.2 Testar Acesso Externo (Deve Falhar)

```bash
# De outra máquina, tentar conectar ao IP público
telnet <SEU_IP_PUBLICO> 6379

# ✅ CORRETO: Connection refused ou timeout
# ❌ ERRADO:  Conecta (REDIS EXPOSTO!)
```

### 2.3 Verificar Autenticação

```bash
# Tentar conectar SEM senha (deve falhar)
redis-cli -h 127.0.0.1 -p 6379 ping
# Esperado: (error) NOAUTH Authentication required

# Conectar COM senha (deve funcionar)
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" ping
# Esperado: PONG
```

### 2.4 Verificar Configuração Redis

```bash
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" CONFIG GET bind
# Esperado: 1) "bind" 2) "127.0.0.1 ::1"

redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" CONFIG GET protected-mode
# Esperado: 1) "protected-mode" 2) "yes"
```

---

## 3. Checklist de Segurança

### Antes do Deploy

- [ ] `redis.conf` tem `bind 127.0.0.1 ::1`
- [ ] `redis.conf` tem `protected-mode yes`
- [ ] `redis.conf` tem `requirepass` com senha forte (32+ chars)
- [ ] `.env` tem `REDIS_HOST=127.0.0.1` (NUNCA 0.0.0.0)
- [ ] `.env` tem `REDIS_PASSWORD` configurado
- [ ] Firewall bloqueando porta 6379 externamente
- [ ] `queues.module.ts` tem `maxRetriesPerRequest: null`
- [ ] `queues.module.ts` tem `enableOfflineQueue: false`

### Após o Deploy

- [ ] `netstat -tlnp | grep 6379` mostra APENAS 127.0.0.1
- [ ] Teste de conexão externa falha (timeout/refused)
- [ ] Teste de conexão local COM senha funciona
- [ ] Teste de conexão local SEM senha falha
- [ ] Logs do Redis não mostram tentativas de conexão externa
- [ ] Backend conecta ao Redis sem warnings do BullMQ
- [ ] Filas processam jobs corretamente

---

## 4. Monitoramento

### Logs do Redis

```bash
# Monitorar logs em tempo real
sudo tail -f /var/log/redis/redis-server.log

# Procurar por tentativas de conexão suspeitas
sudo grep "Connection" /var/log/redis/redis-server.log
```

### Logs do Backend

```bash
# Verificar conexão BullMQ
# Não deve aparecer: "WARNING! Your redis options maxRetriesPerRequest must be null"
npm run start:dev | grep -i redis
```

---

## 5. Troubleshooting

### Problema: BullMQ Warning sobre maxRetriesPerRequest

**Sintoma:**
```
BullMQ: WARNING! Your redis options maxRetriesPerRequest must be null
```

**Solução:**
- Verificar `queues.module.ts` tem `maxRetriesPerRequest: null`
- Reiniciar backend após mudança

### Problema: Redis não conecta

**Sintoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Verificar:**
```bash
# Redis está rodando?
sudo systemctl status redis

# Porta correta?
netstat -tlnp | grep 6379

# Senha correta no .env?
redis-cli -h 127.0.0.1 -p 6379 -a "$REDIS_PASSWORD" ping
```

### Problema: Loops de Retry

**Sintoma:**
```
[BullMQ] Retry 1/2 in 500ms
[BullMQ] Retry 2/2 in 1000ms
[BullMQ] Max retries (2) reached. Stopping.
```

**Causa:** Redis não está acessível ou senha incorreta

**Solução:**
1. Verificar Redis está rodando
2. Verificar senha no `.env` corresponde ao `redis.conf`
3. Verificar `REDIS_HOST=127.0.0.1` (não localhost)

---

## 6. Comandos Úteis

```bash
# Gerar senha forte
openssl rand -base64 32

# Reiniciar Redis
sudo systemctl restart redis

# Ver status Redis
sudo systemctl status redis

# Testar conexão
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" ping

# Ver configuração atual
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" CONFIG GET "*"

# Monitorar comandos em tempo real
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" MONITOR

# Ver informações do servidor
redis-cli -h 127.0.0.1 -p 6379 -a "SUA_SENHA" INFO

# Verificar portas abertas
sudo netstat -tlnp | grep LISTEN
```

---

## 7. Regras de Ouro

1. **NUNCA** use `bind 0.0.0.0` no `redis.conf`
2. **NUNCA** use `REDIS_HOST=0.0.0.0` no `.env`
3. **SEMPRE** use senha forte (mínimo 32 caracteres)
4. **SEMPRE** configure firewall bloqueando porta 6379
5. **SEMPRE** use `protected-mode yes`
6. **SEMPRE** monitore logs após deploy
7. **Hetzner bloqueia VPS que fazem scan de rede!**
