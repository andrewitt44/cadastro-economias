-- ============================================================
-- FIX COMPLETO - Execute no Supabase Dashboard → SQL Editor
-- Corrige colunas faltantes + RLS policies
-- ============================================================

-- ============================================================
-- PASSO 1: Verificar/adicionar colunas faltantes na tabela economias
-- (Se a tabela foi criada com nomes diferentes, isso corrige)
-- ============================================================

-- Adicionar data_criacao se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN data_criacao TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar data_aprovacao se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN data_aprovacao TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar user_name se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN user_name TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar tipo_economia se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN tipo_economia TEXT NOT NULL DEFAULT 'Cancelamento';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar codigo_fornecedor se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN codigo_fornecedor TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar moeda se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN moeda TEXT DEFAULT 'BRL';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar ptax se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN ptax NUMERIC;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar agio se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN agio NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_cancelado se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_cancelado NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_brl se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_brl NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_original se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_original NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_corrigido se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_corrigido NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_original_brl se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_original_brl NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_corrigido_brl se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_corrigido_brl NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_economia se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_economia NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar valor_economia_brl se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN valor_economia_brl NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar tipo se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN tipo TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar descricao se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN descricao TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar status se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN status TEXT NOT NULL DEFAULT 'Pendente';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar observacoes se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN observacoes TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Adicionar data (a data da operação) se não existir
DO $$ BEGIN
    ALTER TABLE economias ADD COLUMN data DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Se existir created_at mas não data_criacao, copiar os valores
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='economias' AND column_name='created_at')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='economias' AND column_name='data_criacao')
    THEN
        UPDATE economias SET data_criacao = created_at WHERE data_criacao IS NULL AND created_at IS NOT NULL;
    END IF;
END $$;

-- ============================================================
-- PASSO 2: Remover TODAS as policies existentes
-- ============================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies 
             WHERE schemaname = 'public' 
             AND tablename IN ('profiles', 'economias', 'economia_arquivos')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================
-- PASSO 3: Garantir RLS habilitado + criar policies corretas
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE economias ENABLE ROW LEVEL SECURITY;
ALTER TABLE economia_arquivos ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ECONOMIAS
CREATE POLICY "economias_select" ON economias FOR SELECT TO authenticated USING (true);
CREATE POLICY "economias_insert" ON economias FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "economias_update" ON economias FOR UPDATE TO authenticated USING (true);

-- ECONOMIA_ARQUIVOS
CREATE POLICY "arquivos_select" ON economia_arquivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "arquivos_insert" ON economia_arquivos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "arquivos_delete" ON economia_arquivos FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PASSO 4: Verificação - listar colunas da tabela economias
-- (o resultado vai aparecer no output do SQL Editor)
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'economias'
ORDER BY ordinal_position;
