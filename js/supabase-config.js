/**
 * SUPABASE CONFIGURATION
 * Configuração do cliente Supabase
 */

// Configuração usando variáveis de ambiente (produção)
// ou valores diretos (desenvolvimento)
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://yfokhgvqmswsztjhlwyo.supabase.co';
// ⚠️ Atualize a ANON KEY abaixo com a chave correta do Supabase Dashboard:
// Project Settings → API → Project API keys → "anon public"
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmb2toZ3ZxbXN3c3p0amhsd3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTU0MzAsImV4cCI6MjA4NzYzMTQzMH0.9bCbHYPorAZUPQbPQhxZZZasnVYrS3BS9q4uzKqnAbI';

// Tentar encontrar o SDK do Supabase (pode estar em window.supabase ou window.supabase.supabase)
const _sdk = window.supabase || window._supabase;
const _createClient = _sdk?.createClient || _sdk?.supabase?.createClient;

if (!_createClient) {
    console.error('[supabase-config] SDK não encontrado. window.supabase =', window.supabase);
    // Define SupabaseConfig com funções que retornam erro legível
    window.SupabaseConfig = {
        _error: 'SDK do Supabase não carregou. Verifique o arquivo js/supabase.js.',
        client: null,
        checkAuth: async () => { throw new Error('SDK não carregou'); },
        getCurrentUser: async () => null,
        loginWithMicrosoft: async () => { throw new Error('SDK não carregou'); },
        loginWithGoogle: async () => { throw new Error('SDK não carregou'); },
        logout: async () => { throw new Error('SDK não carregou'); },
        uploadFile: async () => { throw new Error('SDK não carregou'); },
        getFileUrl: async () => null,
        deleteFile: async () => { throw new Error('SDK não carregou'); },
    };
} else {
    // Criar cliente Supabase normalmente
    const supabase = _createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[supabase-config] Cliente criado com sucesso. URL:', SUPABASE_URL);

    // Nome do bucket de storage
    const STORAGE_BUCKET = 'economia-arquivos';

    /**
     * Verificar se usuário está autenticado
     */
    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }

    /**
     * Obter usuário atual (auth + perfil da tabela profiles)
     * A role vem da tabela profiles, não do user_metadata
     */
    async function getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Buscar perfil da tabela profiles (onde a role é gerenciada)
        let profile = null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                profile = data;
            } else if (error && error.code === 'PGRST116') {
                // Perfil não existe - criar automaticamente
                const newProfile = {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                    role: 'auditor'
                };
                const { data: created } = await supabase
                    .from('profiles')
                    .insert(newProfile)
                    .select()
                    .single();
                profile = created || newProfile;
            }
        } catch (e) {
            console.warn('Erro ao buscar perfil, usando dados do auth:', e);
        }

        return {
            id: user.id,
            email: user.email,
            name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            avatar: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            role: profile?.role || 'auditor',
            provider: user.app_metadata?.provider || 'unknown',
            lastSignIn: user.last_sign_in_at
        };
    }

    /**
     * Deletar conta do usuário atual (para testes)
     * Usa a função SQL delete_own_account() criada no schema
     */
    async function deleteAccount() {
        const { error } = await supabase.rpc('delete_own_account');
        if (error) {
            console.error('Erro ao deletar conta:', error);
            throw error;
        }
        // Fazer sign out local
        await supabase.auth.signOut();
    }

    /**
     * Fazer login com Microsoft
     */
    async function loginWithMicrosoft() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                scopes: 'email',
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });

        if (error) {
            console.error('Erro ao fazer login com Microsoft:', error);
            throw error;
        }

        return data;
    }

    /**
     * Fazer login com Google
     */
    async function loginWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'email profile',
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });

        if (error) {
            console.error('Erro ao fazer login com Google:', error);
            throw error;
        }

        return data;
    }

    /**
     * Fazer logout
     */
    async function logout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Erro ao fazer logout:', error);
            throw error;
        }
    }

    /**
     * Upload de arquivo para o Storage
     */
    async function uploadFile(file, path) {
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Erro ao fazer upload:', error);
            throw error;
        }

        const { data: urlData } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(path, 31536000);

        return {
            path: data.path,
            url: urlData.signedUrl
        };
    }

    /**
     * Download de arquivo do Storage
     */
    async function getFileUrl(path) {
        const { data } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(path, 3600);

        return data?.signedUrl;
    }

    /**
     * Deletar arquivo do Storage
     */
    async function deleteFile(path) {
        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([path]);

        if (error) {
            console.error('Erro ao deletar arquivo:', error);
            throw error;
        }
    }

    // Exportar configuração global
    window.SupabaseConfig = {
        client: supabase,
        bucket: STORAGE_BUCKET,
        checkAuth,
        getCurrentUser,
        loginWithMicrosoft,
        loginWithGoogle,
        logout,
        deleteAccount,
        uploadFile,
        getFileUrl,
        deleteFile,
        onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback)
    };
} // fim do else (SDK carregou)
