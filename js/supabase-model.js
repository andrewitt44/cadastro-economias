/**
 * MODEL COM SUPABASE
 * Camada de dados usando Supabase em vez de localStorage
 */

const SupabaseModel = {
    
    /**
     * Obter usuário atual
     */
    async getCurrentUser() {
        return await SupabaseConfig.getCurrentUser();
    },
    
    /**
     * Obter sessão atual
     */
    async getCurrentSession() {
        return await SupabaseConfig.checkAuth();
    },
    
    /**
     * Fazer logout
     */
    async logout() {
        await SupabaseConfig.logout();
        window.location.href = 'login-supabase.html';
    },
    
    /**
     * Buscar todas as economias
     */
    async getEconomias() {
        const { data, error } = await SupabaseConfig.client
            .from('economias')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao buscar economias:', error);
            return [];
        }
        
        return this.normalizeEconomias(data);
    },
    
    /**
     * Buscar economia por ID
     */
    async getEconomiaById(id) {
        const { data, error } = await SupabaseConfig.client
            .from('economias')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Erro ao buscar economia:', error);
            return null;
        }
        
        return this.normalizeEconomia(data);
    },
    
    /**
     * Normalizar economias do formato snake_case para camelCase
     */
    normalizeEconomias(economias) {
        return economias.map(e => this.normalizeEconomia(e));
    },
    
    /**
     * Normalizar economia individual
     */
    normalizeEconomia(e) {
        return {
            id: e.id,
            userId: e.user_id,
            userName: e.user_name,
            tipoEconomia: e.tipo_economia,
            codigoFornecedor: e.codigo_fornecedor,
            data: e.data,
            moeda: e.moeda,
            ptax: e.ptax,
            agio: e.agio,
            valorCancelado: parseFloat(e.valor_cancelado) || 0,
            valorBRL: parseFloat(e.valor_brl) || 0,
            valorOriginal: parseFloat(e.valor_original) || 0,
            valorCorrigido: parseFloat(e.valor_corrigido) || 0,
            valorOriginalBRL: parseFloat(e.valor_original_brl) || 0,
            valorCorrigidoBRL: parseFloat(e.valor_corrigido_brl) || 0,
            valorEconomia: parseFloat(e.valor_economia) || 0,
            valorEconomiaBRL: parseFloat(e.valor_economia_brl) || 0,
            tipo: e.tipo,
            descricao: e.descricao,
            status: e.status,
            observacoes: e.observacoes,
            arquivos: e.arquivos || [],
            dataCriacao: e.created_at,
            dataAprovacao: e.data_aprovacao
        };
    },
    
    /**
     * Salvar economia de Cancelamento
     */
    async saveEconomiaCancelamento(economiaData) {
        const user = await this.getCurrentUser();
        if (!user) {
            return { success: false, message: 'Usuário não autenticado' };
        }
        
        if (user.role !== 'auditor') {
            return { success: false, message: 'Apenas auditores podem criar economias' };
        }
        
        const valorCancelado = parseFloat(economiaData.valorCancelado);
        const valorBRL = parseFloat(economiaData.valorBRL);
        
        if (valorCancelado <= 0) {
            return { success: false, message: 'Valor cancelado deve ser maior que zero' };
        }
        
        try {
            // Upload de arquivos
            const arquivosUrls = [];
            for (const arquivo of economiaData.arquivos) {
                const timestamp = Date.now();
                const fileName = `${user.id}/${timestamp}-${arquivo.nome}`;
                
                // Converter base64 para blob
                const blob = await this.base64ToBlob(arquivo.dados, arquivo.tipo);
                const file = new File([blob], arquivo.nome, { type: arquivo.tipo });
                
                const uploadResult = await SupabaseConfig.uploadFile(file, fileName);
                arquivosUrls.push({
                    nome: arquivo.nome,
                    url: uploadResult.url,
                    path: uploadResult.path
                });
            }
            
            // Inserir economia no banco
            const { data, error } = await SupabaseConfig.client
                .from('economias')
                .insert([{
                    user_id: user.id,
                    user_name: user.name,
                    tipo_economia: 'Cancelamento',
                    codigo_fornecedor: economiaData.codigoFornecedor || '',
                    data: economiaData.data,
                    moeda: economiaData.moeda || 'BRL',
                    ptax: economiaData.ptax || null,
                    agio: economiaData.agio || 0,
                    valor_cancelado: valorCancelado,
                    valor_brl: valorBRL,
                    valor_original: 0,
                    valor_corrigido: 0,
                    valor_economia: valorBRL,
                    tipo: economiaData.tipo,
                    descricao: economiaData.descricao || '',
                    arquivos: arquivosUrls,
                    status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
                    data_aprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
                    observacoes: ''
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            return { success: true, economia: this.normalizeEconomia(data) };
        } catch (error) {
            console.error('Erro ao salvar economia:', error);
            return { success: false, message: 'Erro ao salvar economia: ' + error.message };
        }
    },
    
    /**
     * Salvar economia de Correção
     */
    async saveEconomiaCorrecao(economiaData) {
        const user = await this.getCurrentUser();
        if (!user) {
            return { success: false, message: 'Usuário não autenticado' };
        }
        
        if (user.role !== 'auditor') {
            return { success: false, message: 'Apenas auditores podem criar economias' };
        }
        
        const valorOriginal = parseFloat(economiaData.valorOriginal);
        const valorCorrigido = parseFloat(economiaData.valorCorrigido);
        const valorOriginalBRL = parseFloat(economiaData.valorOriginalBRL);
        const valorCorrigidoBRL = parseFloat(economiaData.valorCorrigidoBRL);
        const valorEconomia = valorOriginal - valorCorrigido;
        const valorEconomiaBRL = valorOriginalBRL - valorCorrigidoBRL;
        
        if (valorEconomia < 0) {
            return { success: false, message: 'Valor da economia não pode ser negativo' };
        }
        
        try {
            // Upload de arquivos
            const arquivosUrls = [];
            for (const arquivo of economiaData.arquivos) {
                const timestamp = Date.now();
                const fileName = `${user.id}/${timestamp}-${arquivo.nome}`;
                
                const blob = await this.base64ToBlob(arquivo.dados, arquivo.tipo);
                const file = new File([blob], arquivo.nome, { type: arquivo.tipo });
                
                const uploadResult = await SupabaseConfig.uploadFile(file, fileName);
                arquivosUrls.push({
                    nome: arquivo.nome,
                    url: uploadResult.url,
                    path: uploadResult.path
                });
            }
            
            // Inserir economia no banco
            const { data, error } = await SupabaseConfig.client
                .from('economias')
                .insert([{
                    user_id: user.id,
                    user_name: user.name,
                    tipo_economia: 'Correção',
                    codigo_fornecedor: economiaData.codigoFornecedor || '',
                    data: economiaData.data,
                    moeda: economiaData.moeda || 'BRL',
                    ptax: economiaData.ptax || null,
                    agio: economiaData.agio || 0,
                    valor_original: valorOriginal,
                    valor_corrigido: valorCorrigido,
                    valor_original_brl: valorOriginalBRL,
                    valor_corrigido_brl: valorCorrigidoBRL,
                    valor_economia: valorEconomiaBRL,
                    valor_economia_brl: valorEconomiaBRL,
                    valor_cancelado: 0,
                    tipo: economiaData.tipo,
                    descricao: economiaData.descricao || '',
                    arquivos: arquivosUrls,
                    status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
                    data_aprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
                    observacoes: ''
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            return { success: true, economia: this.normalizeEconomia(data) };
        } catch (error) {
            console.error('Erro ao salvar economia:', error);
            return { success: false, message: 'Erro ao salvar economia: ' + error.message };
        }
    },
    
    /**
     * Converter base64 para Blob
     */
    async base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    },
    
    /**
     * Atualizar status de economia
     */
    async updateEconomiaStatus(economiaId, newStatus, observacoes = '') {
        const user = await this.getCurrentUser();
        if (!user || user.role !== 'gestor') {
            return { success: false, message: 'Apenas gestores podem aprovar/reprovar economias' };
        }
        
        try {
            const { data, error} = await SupabaseConfig.client
                .from('economias')
                .update({
                    status: newStatus,
                    observacoes: observacoes,
                    data_aprovacao: new Date().toISOString()
                })
                .eq('id', economiaId)
                .select()
                .single();
            
            if (error) throw error;
            
            return { success: true, economia: this.normalizeEconomia(data) };
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            return { success: false, message: 'Erro ao atualizar status: ' + error.message };
        }
    },
    
    /**
     * Calcular totais
     */
    calculateTotals(economias) {
        const totals = {
            totalEconomizado: 0,
            totalAprovado: 0,
            totalPendente: 0,
            totalReprovado: 0
        };
        
        economias.forEach(e => {
            let valorEconomia = 0;
            
            if (e.tipoEconomia === 'Cancelamento') {
                valorEconomia = parseFloat(e.valorBRL) || parseFloat(e.valorCancelado) || 0;
            } else {
                valorEconomia = parseFloat(e.valorEconomiaBRL) || parseFloat(e.valorEconomia) || 0;
            }
            
            if (e.status !== 'Reprovado') {
                totals.totalEconomizado += valorEconomia;
            }
            
            if (e.status === 'Aprovado') {
                totals.totalAprovado += valorEconomia;
            } else if (e.status === 'Pendente') {
                totals.totalPendente += valorEconomia;
            } else if (e.status === 'Reprovado') {
                totals.totalReprovado += valorEconomia;
            }
        });
        
        return totals;
    },
    
    /**
     * Buscar todos os usuários
     */
    async getUsers() {
        const { data, error } = await SupabaseConfig.client
            .from('users')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
        
        return data;
    },
    
    /**
     * Converter arquivo para Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (file.size > 50 * 1024 * 1024) { // 50MB
                reject(new Error('Arquivo muito grande. Máximo: 50MB'));
                return;
            }
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },
    
    /**
     * Formatar moeda
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    /**
     * Formatar data
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateFormat('pt-BR').format(date);
    }
};

// Exportar como Model para compatibilidade
window.Model = SupabaseModel;
