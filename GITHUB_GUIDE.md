# 🚀 Guia: Como Subir para o GitHub Desktop

## 📋 Passo a Passo

### 1️⃣ Abrir o GitHub Desktop

1. Abra o **GitHub Desktop**
2. Se não tiver, baixe em: https://desktop.github.com/

### 2️⃣ Adicionar o Projeto

**Opção A: Se o projeto já está inicializado com Git**
1. No GitHub Desktop: **File** → **Add Local Repository**
2. Escolha a pasta: `C:\Users\witt\Documents\GitHub\dashboard-economias`
3. Clique em **Add Repository**

**Opção B: Se o projeto não tem Git ainda**
1. No GitHub Desktop: **File** → **Add Local Repository**
2. Se der erro, clique em **Create a Repository**
3. Use a pasta existente: `C:\Users\witt\Documents\GitHub\dashboard-economias`
4. **DESMARQUE** "Initialize this repository with a README" (você já tem um)
5. Clique em **Create Repository**

### 3️⃣ Verificar os Arquivos

No GitHub Desktop, você deve ver:

✅ **Arquivos que SERÃO commitados:**
- README.md
- CONVERSATION_SUMMARY.md
- SUPABASE_SETUP.md
- MIGRATION_CHECKLIST.md
- README_MIGRATION.md
- migration-status.html
- login-supabase.html
- .gitignore
- .env.example
- js/supabase-config.js
- js/supabase-model.js
- js/model-localstorage.js
- (todos os outros arquivos .html, .css, .js)

❌ **Arquivos que NÃO devem aparecer** (protegidos pelo .gitignore):
- .env (se você criou)
- node_modules/
- *.log

**⚠️ IMPORTANTE**: Se ver `.env` na lista, **NÃO COMMITE!**

### 4️⃣ Fazer o Primeiro Commit

1. No campo **Summary**, escreva:
   ```
   Initial commit - Dashboard de Economias + Migração Supabase
   ```

2. No campo **Description** (opcional), escreva:
   ```
   - Sistema completo de gestão de economias
   - Conversão de moedas (BRL/USD)
   - Integração BACEN PTAX
   - Estrutura preparada para migração Supabase
   - Auth Microsoft + Google
   ```

3. Clique no botão azul **Commit to main**

### 5️⃣ Publicar no GitHub

1. Clique no botão **Publish repository** (canto superior direito)

2. Na janela que abrir:
   - **Name**: dashboard-economias
   - **Description**: Sistema de controle e auditoria de economias
   - **Keep this code private**: ✅ (MARQUE se quiser privado)
   - **Organization**: None (ou escolha se tiver)

3. Clique em **Publish Repository**

4. Aguarde o upload (pode demorar alguns segundos)

### 6️⃣ Verificar no GitHub.com

1. Vá para: https://github.com
2. Entre na sua conta
3. Você deve ver o repositório **dashboard-economias**
4. Verifique se todos os arquivos estão lá
5. **CONFIRME** que `.env` NÃO está lá (segurança!)

---

## ✅ Checklist Final

Antes de fazer push, verifique:

- [ ] `.gitignore` está na raiz do projeto
- [ ] `.env` NÃO aparece na lista de arquivos a commitar
- [ ] README.md existe e está completo
- [ ] CONVERSATION_SUMMARY.md foi criado
- [ ] Todos os arquivos de documentação estão incluídos
- [ ] Nenhuma credencial ou senha está hardcoded

---

## 🔄 Commits Futuros (Em Casa)

### Quando fizer alterações em casa:

1. **Fazer alterações** nos arquivos

2. **Abrir GitHub Desktop**

3. **Ver as mudanças** (aparecerão automaticamente)

4. **Escrever mensagem do commit**, exemplo:
   ```
   Configuração do Supabase concluída
   ```

5. **Commit to main**

6. **Push origin** (enviar para GitHub)

### Sincronizar entre computadores:

**No trabalho (antes de sair):**
1. Commit + Push (enviar alterações)

**Em casa (ao chegar):**
1. Abrir GitHub Desktop
2. Clicar em **Fetch origin**
3. Se houver atualizações, clicar em **Pull origin**

**Em casa (antes de sair):**
1. Commit + Push

**No trabalho (ao chegar):**
1. Fetch + Pull

---

## 🆘 Problemas Comuns

### Problema: ".env aparece na lista"
**Solução:**
1. NO GitHub Desktop, clique com botão direito em `.env`
2. Escolha **Discard Changes** ou **Ignore**
3. Certifique-se que `.gitignore` contém `.env`

### Problema: "Muitos arquivos para commitar"
**Solução:**
- É normal no primeiro commit
- Pode demorar alguns minutos
- Aguarde até completar

### Problema: "Failed to push"
**Solução:**
1. Fetch origin primeiro
2. Pode ter conflito
3. Resolva conflitos se houver
4. Tente push novamente

### Problema: "Repository already exists"
**Solução:**
1. Use nome diferente, ex: `dashboard-economias-v2`
2. Ou delete o repositório existente no GitHub.com primeiro

---

## 📝 Boas Práticas

### Mensagens de Commit:

✅ **BOM:**
- "Adiciona funcionalidade de desconto"
- "Corrige bug de conversão USD"
- "Atualiza documentação Supabase"

❌ **RUIM:**
- "aaa"
- "teste"
- "mudanças"

### Frequência de Commits:

- ✅ Commit frequente (a cada feature completa)
- ✅ Push pelo menos 1x por dia
- ❌ Não deixe dias sem commitar

### Branches (Avançado):

Para features grandes:
1. Criar branch: **Branch** → **New Branch**
2. Nome: `feature/nome-da-feature`
3. Trabalhar na branch
4. Quando terminar: **Merge** de volta para `main`

---

## 🎯 Resultado Esperado

Após seguir este guia, você terá:

1. ✅ Repositório no GitHub.com
2. ✅ Todos os arquivos sincronizados
3. ✅ Histórico de commits iniciado
4. ✅ Pronto para trabalhar em casa
5. ✅ Credenciais protegidas (.env não commitado)

---

## 📞 Próximos Passos

**No trabalho (agora):**
1. ✅ Seguir este guia
2. ✅ Push para GitHub
3. ✅ Verificar no GitHub.com

**Em casa:**
1. ⏳ Clone/Pull do repositório
2. ⏳ Continue de onde parou
3. ⏳ Leia CONVERSATION_SUMMARY.md
4. ⏳ Configure Supabase
5. ⏳ Commit + Push quando terminar

**No trabalho (amanhã):**
1. ⏳ Pull para pegar alterações de casa
2. ⏳ Continue trabalhando
3. ⏳ Commit + Push novamente

---

## 🔐 Lembrete de Segurança

### ❌ NUNCA commite:
- Arquivo `.env`
- Senhas
- Tokens
- Client IDs/Secrets reais
- Dados sensíveis

### ✅ Use placeholders:
```javascript
// ✅ BOM (em supabase-config.js)
const SUPABASE_URL = 'https://seu-projeto.supabase.co';

// ❌ RUIM (não faça isso)
const SUPABASE_URL = 'https://abcdefg123456.supabase.co';
```

---

**Criado em:** 30/01/2026  
**Versão:** 1.0  
**Para:** Trabalhar em casa + GitHub sync
