# 🎯 Arquivos Criados para Migração Supabase

## ✅ Arquivos Novos

1. **SUPABASE_SETUP.md** - Guia completo passo a passo
2. **.env.example** - Template de variáveis de ambiente
3. **.gitignore** - Proteção de credenciais
4. **js/supabase-config.js** - Configuração do Supabase
5. **js/supabase-model.js** - Model com Supabase
6. **login-supabase.html** - Página de login com Microsoft/Google
7. **js/model-localstorage.js** - Backup do model antigo

## 📝 Próximos Passos

### 1. Configurar Supabase (15-20 minutos)
Siga o arquivo **SUPABASE_SETUP.md** linha por linha:
- Criar conta e projeto
- Executar SQL para criar tabelas
- Configurar Storage
- Configurar Microsoft Auth (Azure AD)
- Configurar Google Auth
- Copiar credenciais

### 2. Atualizar arquivos HTML

**dashboard.html** - Adicionar antes de `</head>`:
```html
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
```

**dashboard.html** - Trocar os scripts no final:
```html
<!-- Trocar estas linhas: -->
<script src="js/model.js"></script>
<script src="js/view.js"></script>
<script src="js/controller.js"></script>

<!-- Por estas: -->
<script src="js/supabase-model.js"></script>
<script src="js/view.js"></script>
<script src="js/controller.js"></script>
```

**dashboard.html** - Trocar o script de verificação:
```html
<script>
    // Verificar se usuário está logado (NOVO COM SUPABASE)
    (async () => {
        const session = await SupabaseConfig.checkAuth();
        if (!session) {
            window.location.href = 'login-supabase.html';
            return;
        }
        
        const currentUser = await Model.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login-supabase.html';
        } else {
            // Inicializar dashboard
            Controller.initDashboard();
        }
    })();
</script>
```

### 3. Atualizar controller.js

Adicionar no início do arquivo:
```javascript
// Tornar funções async onde necessário
async initDashboard() {
    const currentUser = await Model.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login-supabase.html';
        return;
    }
    
    View.renderUserInfo(currentUser);
    await this.loadEconomias(); // Adicionar await
    this.setupEventListeners();
    // ... resto do código
}

async loadEconomias() {
    const economias = await Model.getEconomias(); // Adicionar await
    const currentUser = await Model.getCurrentUser();
    // ... resto do código
}
```

Atualizar o logout:
```javascript
async logout() {
    await Model.logout();
    window.location.href = 'login-supabase.html';
}
```

### 4. Atualizar detalhes.html

Adicionar os scripts Supabase igual ao dashboard.html

### 5. Atualizar vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "echo 'No build needed'",
  "devCommand": "npx serve .",
  "installCommand": "echo 'No install needed'",
  "framework": null,
  "outputDirectory": ".",
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 6. Criar arquivo .env

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...sua_chave_aqui
```

### 7. Testar

1. Configure tudo no Supabase
2. Atualize os arquivos conforme acima
3. Abra `login-supabase.html` com Live Server
4. Teste login com Microsoft ou Google
5. Verifique se dashboard carrega corretamente

## ⚠️ Importante

**ANTES DE COMEÇAR:**
1. Faça backup de todo o projeto
2. Teste em ambiente local primeiro
3. Não commit as credenciais (.env no .gitignore)

**LIMITES GRATUITOS:**
- 50.000 requisições/mês
- 500MB banco de dados
- 1GB storage de arquivos
- 50MB por arquivo

## 🔧 Configuração Mínima Necessária

Para funcionar, você PRECISA:
1. ✅ Conta Supabase criada
2. ✅ SQL executado (tabelas users e economias)
3. ✅ Storage configurado (bucket economia-arquivos)
4. ✅ Pelo menos 1 provider configurado (Microsoft OU Google)
5. ✅ Credenciais copiadas (URL e Anon Key)
6. ✅ Arquivos HTML atualizados com os scripts Supabase

## 🆘 Precisa de Ajuda?

Se tiver dúvidas em algum passo específico, me pergunte!
Posso ajudar com:
- Configuração do Azure AD
- Configuração do Google Cloud
- Problemas com SQL
- Erros de autenticação
- Deploy no Vercel

---

**Status:** ✅ Arquivos base criados  
**Próximo:** Configurar Supabase seguindo o guia
