/**
 * SUPABASE CONFIGURATION
 * Configuração do cliente Supabase
 */

// Configuração usando variáveis de ambiente (produção)
// ou valores diretos (desenvolvimento)
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'sua_chave_anon_aqui';

// Criar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
 * Obter usuário atual
 */
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Buscar informações adicionais do usuário
    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    return userData;
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
    
    // Obter URL pública (assinada por 1 ano)
    const { data: urlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 31536000); // 1 ano em segundos
    
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
        .createSignedUrl(path, 3600); // 1 hora
    
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
    uploadFile,
    getFileUrl,
    deleteFile
};
