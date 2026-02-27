-- ============================================================
-- SUPABASE SCHEMA - Sistema de Economias
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- LIMPEZA: Remover tabela 'users' duplicada (se existir)
-- e remover policies/triggers antigos
-- ============================================================
DROP TABLE IF EXISTS public.users CASCADE;

-- Remover policies existentes para recriar
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop ALL policies on all tables (limpa qualquer policy velha)
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'economias', 'economia_arquivos')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- 1) Tabela de perfis (roles e dados extras)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'auditor' CHECK (role IN ('auditor', 'gestor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Tabela de economias
CREATE TABLE IF NOT EXISTS economias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    tipo_economia TEXT NOT NULL CHECK (tipo_economia IN ('Cancelamento', 'Correção')),
    codigo_fornecedor TEXT DEFAULT '',
    data DATE,
    moeda TEXT DEFAULT 'BRL',
    ptax NUMERIC,
    agio NUMERIC DEFAULT 0,
    valor_cancelado NUMERIC DEFAULT 0,
    valor_brl NUMERIC DEFAULT 0,
    valor_original NUMERIC DEFAULT 0,
    valor_corrigido NUMERIC DEFAULT 0,
    valor_original_brl NUMERIC DEFAULT 0,
    valor_corrigido_brl NUMERIC DEFAULT 0,
    valor_economia NUMERIC DEFAULT 0,
    valor_economia_brl NUMERIC DEFAULT 0,
    tipo TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Reprovado', 'Em Andamento', 'Concluído')),
    observacoes TEXT DEFAULT '',
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_aprovacao TIMESTAMPTZ
);

-- 3) Tabela de arquivos das economias
CREATE TABLE IF NOT EXISTS economia_arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    economia_id UUID NOT NULL REFERENCES economias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNÇÃO AUXILIAR: Verificar role do usuário (SECURITY DEFINER)
-- Roda com permissões elevadas para evitar problemas de RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid()),
        'auditor'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Versão corrigida
-- Usa a função get_my_role() para evitar subqueries recursivas
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE economias ENABLE ROW LEVEL SECURITY;
ALTER TABLE economia_arquivos ENABLE ROW LEVEL SECURITY;

-- PROFILES: Todos autenticados podem ler (usando TO authenticated)
CREATE POLICY "profiles_select"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_insert"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ECONOMIAS: Todos autenticados podem ler todas
-- (a filtragem auditor/gestor é feita pela aplicação)
CREATE POLICY "economias_select"
    ON economias FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "economias_insert"
    ON economias FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Update: próprio usuário OU gestor
CREATE POLICY "economias_update_own"
    ON economias FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "economias_update_gestor"
    ON economias FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'gestor');

-- ECONOMIA_ARQUIVOS: Todos autenticados podem ler/inserir/deletar
CREATE POLICY "arquivos_select"
    ON economia_arquivos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "arquivos_insert"
    ON economia_arquivos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "arquivos_delete"
    ON economia_arquivos FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- TRIGGER: Criar perfil automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'auditor')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Criar perfis para usuários existentes que ainda não têm
-- ============================================================
INSERT INTO public.profiles (id, email, name, avatar_url, role)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
    'auditor'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- ============================================================
-- STORAGE: Bucket para arquivos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('economia-arquivos', 'economia-arquivos', false)
ON CONFLICT (id) DO NOTHING;

-- Limpar policies de storage existentes
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
    DROP POLICY IF EXISTS "Auth users can upload files" ON storage.objects;
    DROP POLICY IF EXISTS "Auth users can read files" ON storage.objects;
    DROP POLICY IF EXISTS "Auth users can delete files" ON storage.objects;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Auth users can upload files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'economia-arquivos');

CREATE POLICY "Auth users can read files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'economia-arquivos');

CREATE POLICY "Auth users can delete files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'economia-arquivos');

-- ============================================================
-- FUNÇÃO: Deletar conta do usuário (para testes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = auth.uid();
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
