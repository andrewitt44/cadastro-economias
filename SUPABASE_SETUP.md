# 🚀 Migração para Supabase - Dashboard de Economias

## 📋 Passo a Passo Completo

### 1️⃣ Criar Conta no Supabase

1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Faça login com GitHub
4. Clique em "New Project"
5. Preencha:
   - **Name:** dashboard-economias
   - **Database Password:** Crie uma senha forte (anote!)
   - **Region:** South America (São Paulo) ou US East (mais próximo)
6. Aguarde ~2 minutos para criar o projeto

### 2️⃣ Configurar Banco de Dados

1. No painel Supabase, vá em **SQL Editor**
2. Clique em **+ New query**
3. Cole o SQL abaixo e clique em **Run**:

```sql
-- Tabela de Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('auditor', 'gestor')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Tabela de Economias
CREATE TABLE economias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  tipo_economia TEXT NOT NULL CHECK (tipo_economia IN ('Cancelamento', 'Correção')),
  codigo_fornecedor TEXT,
  data DATE NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK (moeda IN ('BRL', 'USD')),
  ptax DECIMAL(10, 4),
  agio DECIMAL(5, 2) DEFAULT 0,
  valor_cancelado DECIMAL(15, 2) DEFAULT 0,
  valor_brl DECIMAL(15, 2) DEFAULT 0,
  valor_original DECIMAL(15, 2) DEFAULT 0,
  valor_corrigido DECIMAL(15, 2) DEFAULT 0,
  valor_original_brl DECIMAL(15, 2) DEFAULT 0,
  valor_corrigido_brl DECIMAL(15, 2) DEFAULT 0,
  valor_economia DECIMAL(15, 2) NOT NULL,
  valor_economia_brl DECIMAL(15, 2) DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('BID', 'Cotação')),
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Reprovado')),
  observacoes TEXT,
  arquivos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  data_aprovacao TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_economias_user_id ON economias(user_id);
CREATE INDEX idx_economias_status ON economias(status);
CREATE INDEX idx_economias_tipo ON economias(tipo);
CREATE INDEX idx_economias_data ON economias(data);
CREATE INDEX idx_economias_created_at ON economias(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE economias ENABLE ROW LEVEL SECURITY;

-- Políticas para Users
CREATE POLICY "Usuários podem ver todos os perfis"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para Economias
CREATE POLICY "Todos podem ver economias"
  ON economias FOR SELECT
  USING (true);

CREATE POLICY "Auditores podem criar economias"
  ON economias FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'auditor'
    )
  );

CREATE POLICY "Auditores podem atualizar suas próprias economias pendentes"
  ON economias FOR UPDATE
  USING (
    user_id = auth.uid() 
    AND status = 'Pendente'
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'auditor'
    )
  );

CREATE POLICY "Gestores podem aprovar/reprovar economias"
  ON economias FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'gestor'
    )
  );

-- Função para criar usuário automaticamente após auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'auditor', -- Padrão: auditor (você pode mudar manualmente para gestor depois)
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar usuário automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 3️⃣ Configurar Storage para Arquivos

1. No painel Supabase, vá em **Storage**
2. Clique em **Create a new bucket**
3. Preencha:
   - **Name:** `economia-arquivos`
   - **Public:** ❌ (deixe desmarcado - privado)
4. Clique em **Create bucket**

5. Clique no bucket `economia-arquivos` → **Policies** → **New policy**
6. Crie 2 políticas:

**Política 1 - Upload:**
```sql
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'economia-arquivos');
```

**Política 2 - Download:**
```sql
CREATE POLICY "Usuários autenticados podem baixar"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'economia-arquivos');
```

### 4️⃣ Configurar Autenticação Microsoft

1. **Criar App no Azure AD:**
   - Acesse: https://portal.azure.com
   - Vá em **Azure Active Directory** → **App registrations** → **New registration**
   - Nome: `Dashboard Economias`
   - Supported account types: **Accounts in any organizational directory**
   - Redirect URI: 
     - Type: **Web**
     - URL: `https://[SEU_PROJETO].supabase.co/auth/v1/callback`
       (Pegue essa URL no Supabase em Authentication → Settings)
   - Clique em **Register**

2. **Configurar Credenciais:**
   - Copie o **Application (client) ID**
   - Vá em **Certificates & secrets** → **New client secret**
   - Copie o **Value** (secret)

3. **Configurar no Supabase:**
   - No Supabase, vá em **Authentication** → **Providers**
   - Procure **Azure (Microsoft)**
   - Habilite
   - Cole:
     - **Client ID:** (do Azure)
     - **Client Secret:** (do Azure)
   - Clique em **Save**

### 5️⃣ Configurar Autenticação Google

1. **Criar Projeto no Google Cloud:**
   - Acesse: https://console.cloud.google.com
   - Crie um novo projeto: "Dashboard Economias"
   
2. **Configurar OAuth:**
   - Vá em **APIs & Services** → **Credentials**
   - Clique em **Configure Consent Screen**
   - User Type: **External**
   - Preencha nome do app e email
   - Clique em **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: 
     `https://[SEU_PROJETO].supabase.co/auth/v1/callback`
   - Copie **Client ID** e **Client Secret**

3. **Configurar no Supabase:**
   - No Supabase, vá em **Authentication** → **Providers**
   - Procure **Google**
   - Habilite
   - Cole Client ID e Client Secret
   - Clique em **Save**

### 6️⃣ Obter Credenciais do Supabase

1. No painel Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGc...` (chave longa)

### 7️⃣ Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...sua_chave_aqui
```

⚠️ **IMPORTANTE:** Adicione `.env` no `.gitignore`!

### 8️⃣ Instalar Supabase Client

No terminal do projeto:

```bash
npm install @supabase/supabase-js
```

Ou use via CDN (já incluído nos novos arquivos).

### 9️⃣ Configurar Vercel para Deploy

1. No arquivo `vercel.json` (já atualizado), as variáveis de ambiente são automáticas

2. No painel Vercel:
   - Vá em **Settings** → **Environment Variables**
   - Adicione:
     - `SUPABASE_URL` = (sua URL)
     - `SUPABASE_ANON_KEY` = (sua chave)

### 🔟 Testar Localmente

1. Abra `index.html` com Live Server
2. Teste login com Microsoft ou Google
3. O sistema criará automaticamente o usuário na tabela
4. Primeiro usuário será **auditor**
5. No Supabase, vá em **Table Editor** → **users** e mude o role para **gestor** se necessário

---

## 🎯 Próximos Passos

Após configurar tudo acima, os novos arquivos JavaScript (`supabase-config.js`, `supabase-model.js`, etc) já estarão prontos para usar!

O sistema agora tem:
- ✅ Login Microsoft/Google
- ✅ Banco de dados PostgreSQL
- ✅ Storage de arquivos até 1GB (50MB por arquivo)
- ✅ Segurança com RLS
- ✅ Escalável e gratuito

## 🆘 Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Verifique logs no Supabase (Logs section)
3. Teste as credenciais do Azure/Google

---

**Criado para Dashboard de Economias - Migração Supabase**
