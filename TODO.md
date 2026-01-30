# ✅ TODO - Dashboard de Economias

## 🔴 URGENTE (Fazer em Casa)

### Configuração Supabase
- [ ] Criar conta no Supabase (https://supabase.com)
- [ ] Criar novo projeto: "dashboard-economias"
- [ ] Executar SQL do SUPABASE_SETUP.md (criar tabelas)
- [ ] Criar bucket de storage: "economia-arquivos"
- [ ] Configurar políticas de storage

### Autenticação
- [ ] Configurar Microsoft Auth (Azure AD)
  - [ ] Criar app no Azure Portal
  - [ ] Configurar Redirect URI
  - [ ] Copiar Client ID e Secret
  - [ ] Configurar no Supabase
  
- [ ] OU Configurar Google Auth
  - [ ] Criar projeto no Google Cloud
  - [ ] OAuth consent screen
  - [ ] Copiar Client ID e Secret
  - [ ] Configurar no Supabase

### Credenciais
- [ ] Copiar URL do Supabase
- [ ] Copiar Anon Key do Supabase
- [ ] Editar `js/supabase-config.js` (linhas 6-7)
- [ ] Criar arquivo `.env` (NÃO commitar!)

### Testes
- [ ] Abrir `login-supabase.html`
- [ ] Testar login com Microsoft OU Google
- [ ] Verificar se usuário foi criado na tabela
- [ ] Mudar role para 'gestor' se necessário

---

## 🟡 IMPORTANTE (Próxima Fase)

### Atualizar Código
- [ ] Atualizar `dashboard.html`:
  - [ ] Adicionar script Supabase CDN
  - [ ] Trocar `model.js` por `supabase-model.js`
  - [ ] Atualizar script de verificação de auth

- [ ] Atualizar `controller.js`:
  - [ ] Tornar `initDashboard()` async
  - [ ] Tornar `loadEconomias()` async
  - [ ] Adicionar await nas chamadas do Model
  - [ ] Atualizar logout para usar Supabase

- [ ] Atualizar `detalhes.html`:
  - [ ] Adicionar scripts Supabase
  - [ ] Mesmas alterações do dashboard

### Testes Completos
- [ ] Testar criação de economia (Cancelamento)
- [ ] Testar criação de economia (Correção)
- [ ] Testar upload de arquivos (> 5MB)
- [ ] Testar filtros
- [ ] Testar paginação
- [ ] Testar aprovação/reprovação
- [ ] Testar com múltiplas abas abertas

---

## 🟢 MELHORIAS (Futuro)

### Features
- [ ] Dashboard de analytics (gráficos)
- [ ] Exportação para Excel
- [ ] Exportação para PDF
- [ ] Notificações por email
- [ ] Histórico de alterações
- [ ] Comentários em economias
- [ ] Tags/categorias

### Performance
- [ ] Cache de PTAX no banco
- [ ] Lazy loading de arquivos
- [ ] Compressão de imagens
- [ ] Service Worker (PWA)

### UX
- [ ] Dark mode
- [ ] Atalhos de teclado
- [ ] Busca global
- [ ] Favoritos
- [ ] Modo offline

---

## 📊 Status por Módulo

### ✅ Completo
- [x] Sistema base MVC
- [x] Login LocalStorage
- [x] Dashboard com tabela
- [x] Página de detalhes
- [x] Cancelamento/Correção
- [x] Integração BACEN
- [x] Conversão de moedas
- [x] Paginação (35/página)
- [x] Filtros
- [x] Upload de arquivos
- [x] Cálculo de desconto
- [x] Workflow de aprovação
- [x] Documentação completa
- [x] Arquivos Supabase criados

### 🔄 Em Progresso
- [ ] Configuração Supabase
- [ ] Testes de autenticação
- [ ] Migração de código

### ⏳ Aguardando
- [ ] Deploy em produção
- [ ] Testes com usuários reais
- [ ] Feedback e ajustes

---

## 🗓️ Cronograma Sugerido

### Dia 1 (Em Casa - 1h30)
1. Criar conta Supabase (5 min)
2. Executar SQL (5 min)
3. Configurar Storage (5 min)
4. Configurar Microsoft OU Google (15 min)
5. Copiar credenciais (5 min)
6. Atualizar supabase-config.js (5 min)
7. Testar login (10 min)
8. Criar primeiro usuário e definir role (5 min)
9. **COMMIT + PUSH**

### Dia 2 (Trabalho/Casa - 2h)
1. Atualizar dashboard.html (15 min)
2. Atualizar controller.js (30 min)
3. Atualizar detalhes.html (10 min)
4. Testes de criação (20 min)
5. Testes de upload (15 min)
6. Testes de aprovação (15 min)
7. **COMMIT + PUSH**

### Dia 3 (Casa - 1h)
1. Configurar Vercel com env vars (10 min)
2. Deploy de testes (5 min)
3. Testes em produção (20 min)
4. Ajustes finais (20 min)
5. **DEPLOY FINAL**

---

## 🐛 Bugs Conhecidos

### LocalStorage (Será resolvido com Supabase)
- [ ] Limite de 10MB
- [ ] Arquivos > 5MB falham
- [ ] Conflitos com múltiplos usuários
- [ ] Sem backup automático

### BACEN API
- [ ] Não funciona em fins de semana (limitação da API)
- [ ] Timeout ocasional (adicionar retry)

### Interface
- [ ] Mobile precisa ajustes (responsivo)
- [ ] Loading states faltando em alguns lugares

---

## 📝 Notas

### Prioridades
1. **Configurar Supabase** (URGENTE)
2. Atualizar código
3. Testes completos
4. Deploy

### Decisões Pendentes
- [ ] Usar Microsoft, Google ou ambos?
- [ ] Criar roles adicionais? (admin, viewer)
- [ ] Adicionar campos extras nas economias?
- [ ] Implementar notificações?

### Lembrar
- ⚠️ Sempre fazer PULL antes de começar a trabalhar
- ⚠️ Sempre fazer COMMIT + PUSH ao terminar
- ⚠️ Testar em ambiente local antes de deploy
- ⚠️ Backup do banco antes de mudanças grandes
- ⚠️ Nunca commitar .env

---

## 🎯 Checklist de Deploy Final

### Antes do Deploy
- [ ] Todos os testes passando
- [ ] Sem erros no console
- [ ] Sem warnings importantes
- [ ] .env configurado no Vercel
- [ ] URLs corretas (produção, não localhost)

### No Deploy
- [ ] Build sem erros
- [ ] Deploy concluído
- [ ] Site acessível
- [ ] Login funcionando

### Após Deploy
- [ ] Testar login em produção
- [ ] Testar criação de economia
- [ ] Testar upload de arquivo
- [ ] Testar aprovação
- [ ] Monitorar logs do Supabase

---

## 📞 Se Precisar de Ajuda

### Problemas com Supabase
- Verificar logs em: Dashboard → Logs
- Verificar RLS: Database → Policies
- Verificar Auth: Authentication → Users

### Problemas com Azure/Google
- Verificar Redirect URI (mais comum)
- Verificar Client ID/Secret
- Verificar Scopes necessários

### Problemas com Código
- Console do navegador (F12)
- Network tab (para ver requisições)
- Supabase logs

---

**Última Atualização:** 30/01/2026  
**Próxima Ação:** Configurar Supabase em casa  
**Arquivo de Referência:** CONVERSATION_SUMMARY.md

**Boa sorte! 🚀**
