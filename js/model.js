/**
 * MODEL - Camada de Modelo
 * Responsável por gerenciar os dados via Supabase Database
 * Todas as operações de CRUD são assíncronas
 */

const Model = {
    _currentUser: null,

    /**
     * Obter cliente Supabase
     */
    _getClient() {
        if (typeof SupabaseConfig !== 'undefined' && SupabaseConfig.client) {
            return SupabaseConfig.client;
        }
        throw new Error('Supabase client não disponível');
    },

    /**
     * Definir usuário atual (chamado pelo Controller após auth Supabase)
     */
    setCurrentUser(user) {
        this._currentUser = user;
    },

    /**
     * Obter sessão atual (compatibilidade com save methods)
     */
    getCurrentSession() {
        return this._currentUser;
    },

    /**
     * Converter registro do Supabase para formato da aplicação
     */
    _fromDB(row) {
        return {
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            tipoEconomia: row.tipo_economia,
            codigoFornecedor: row.codigo_fornecedor || '',
            data: row.data,
            moeda: row.moeda || 'BRL',
            ptax: row.ptax ? parseFloat(row.ptax) : null,
            agio: row.agio ? parseFloat(row.agio) : 0,
            valorCancelado: parseFloat(row.valor_cancelado) || 0,
            valorBRL: parseFloat(row.valor_brl) || 0,
            valorOriginal: parseFloat(row.valor_original) || 0,
            valorCorrigido: parseFloat(row.valor_corrigido) || 0,
            valorOriginalBRL: parseFloat(row.valor_original_brl) || 0,
            valorCorrigidoBRL: parseFloat(row.valor_corrigido_brl) || 0,
            valorEconomia: parseFloat(row.valor_economia) || 0,
            valorEconomiaBRL: parseFloat(row.valor_economia_brl) || 0,
            tipo: row.tipo,
            descricao: row.descricao || '',
            status: row.status,
            observacoes: row.observacoes || '',
            dataCriacao: row.data_criacao,
            dataAprovacao: row.data_aprovacao,
            arquivos: row._arquivos || []
        };
    },

    /**
     * Carregar arquivos de uma economia
     */
    async _loadArquivos(economiaId) {
        try {
            const supabase = this._getClient();
            const { data, error } = await supabase
                .from('economia_arquivos')
                .select('*')
                .eq('economia_id', economiaId);

            if (error) {
                console.warn('[Model] Erro ao carregar arquivos da economia', economiaId, error);
                return [];
            }

            return (data || []).map(a => ({
                id: a.id,
                nome: a.nome,
                tipo: a.tipo,
                storagePath: a.storage_path,
                url: a.url
            }));
        } catch (e) {
            console.warn('[Model] Exceção ao carregar arquivos:', e);
            return [];
        }
    },

    /**
     * Carregar arquivos em lote para várias economias (evita N+1 queries)
     */
    async _loadArquivosBatch(economiaIds) {
        if (!economiaIds || economiaIds.length === 0) return {};
        try {
            const supabase = this._getClient();
            const { data, error } = await supabase
                .from('economia_arquivos')
                .select('*')
                .in('economia_id', economiaIds);

            if (error) {
                console.warn('[Model] Erro ao carregar arquivos em lote:', error);
                return {};
            }

            // Agrupar por economia_id
            const map = {};
            (data || []).forEach(a => {
                if (!map[a.economia_id]) map[a.economia_id] = [];
                map[a.economia_id].push({
                    id: a.id,
                    nome: a.nome,
                    tipo: a.tipo,
                    storagePath: a.storage_path,
                    url: a.url
                });
            });
            return map;
        } catch (e) {
            console.warn('[Model] Exceção ao carregar arquivos em lote:', e);
            return {};
        }
    },

    /**
     * Converter lista de rows do Supabase, com arquivos em lote
     */
    async _convertRows(rows) {
        if (!rows || rows.length === 0) return [];

        // Carregar todos os arquivos em uma única query
        const ids = rows.map(r => r.id);
        const arquivosMap = await this._loadArquivosBatch(ids);

        return rows.map(row => {
            row._arquivos = arquivosMap[row.id] || [];
            return this._fromDB(row);
        });
    },

    /**
     * Obter todas as economias (async)
     */
    async getEconomias() {
        const supabase = this._getClient();

        // Diagnóstico: verificar sessão ativa
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[Model] Sessão ativa:', !!sessionData?.session, 'User:', sessionData?.session?.user?.id);

        const { data, error, status, statusText } = await supabase
            .from('economias')
            .select('*')
            .order('data_criacao', { ascending: false });

        console.log('[Model] getEconomias response - status:', status, statusText, 'error:', error, 'data length:', (data || []).length);

        if (error) {
            console.error('[Model] Erro ao carregar economias:', error);
            return [];
        }

        console.log('[Model] getEconomias retornou', (data || []).length, 'registros');
        if (data && data.length > 0) {
            console.log('[Model] Primeira economia:', JSON.stringify(data[0]).substring(0, 200));
        }
        return this._convertRows(data || []);
    },

    /**
     * Obter economias filtradas por usuário (async)
     */
    async getEconomiasByUser(userId) {
        const supabase = this._getClient();

        // Diagnóstico
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[Model] getEconomiasByUser - Sessão:', !!sessionData?.session, 'userId:', userId);

        const { data, error, status } = await supabase
            .from('economias')
            .select('*')
            .eq('user_id', userId)
            .order('data_criacao', { ascending: false });

        console.log('[Model] getEconomiasByUser response - status:', status, 'error:', error, 'data length:', (data || []).length);

        if (error) {
            console.error('[Model] Erro ao carregar economias do usuário:', error);
            return [];
        }

        console.log('[Model] getEconomiasByUser retornou', (data || []).length, 'registros para', userId);
        return this._convertRows(data || []);
    },

    /**
     * Fazer upload de arquivos para o Storage e salvar referências
     */
    async _uploadArquivos(economiaId, arquivos) {
        const supabase = this._getClient();
        const uploadedFiles = [];

        for (const arquivo of arquivos) {
            try {
                // Se o arquivo já tem dados base64, converter para Blob
                let fileBlob;
                let fileName = arquivo.nome;

                if (arquivo.dados && arquivo.dados.startsWith('data:')) {
                    // Converter base64 para Blob
                    const response = await fetch(arquivo.dados);
                    fileBlob = await response.blob();
                } else if (arquivo.file) {
                    fileBlob = arquivo.file;
                } else {
                    console.error('Arquivo sem dados:', arquivo.nome);
                    continue;
                }

                // Gerar path único no storage
                const ext = fileName.split('.').pop();
                const storagePath = `${this._currentUser.id}/${economiaId}/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;

                // Upload para o Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('economia-arquivos')
                    .upload(storagePath, fileBlob, {
                        contentType: arquivo.tipo,
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Erro ao fazer upload:', uploadError);
                    continue;
                }

                // Gerar URL assinada (1 ano)
                const { data: urlData } = await supabase.storage
                    .from('economia-arquivos')
                    .createSignedUrl(storagePath, 31536000);

                // Salvar referência na tabela economia_arquivos
                const { data: refData, error: refError } = await supabase
                    .from('economia_arquivos')
                    .insert({
                        economia_id: economiaId,
                        nome: fileName,
                        tipo: arquivo.tipo,
                        storage_path: storagePath,
                        url: urlData?.signedUrl || ''
                    })
                    .select()
                    .single();

                if (refError) {
                    console.error('Erro ao salvar referência:', refError);
                    continue;
                }

                uploadedFiles.push({
                    id: refData.id,
                    nome: fileName,
                    tipo: arquivo.tipo,
                    storagePath: storagePath,
                    url: urlData?.signedUrl || ''
                });
            } catch (err) {
                console.error('Erro no upload do arquivo:', arquivo.nome, err);
            }
        }

        return uploadedFiles;
    },

    /**
     * Salvar nova economia de Cancelamento (async)
     */
    async saveEconomiaCancelamento(economiaData) {
        const supabase = this._getClient();
        const currentSession = this.getCurrentSession();

        if (!currentSession) {
            return { success: false, message: 'Usuário não autenticado' };
        }

        const valorCancelado = parseFloat(economiaData.valorCancelado);
        const valorBRL = parseFloat(economiaData.valorBRL);

        if (valorCancelado <= 0) {
            return { success: false, message: 'Valor cancelado deve ser maior que zero' };
        }

        const registro = {
            user_id: currentSession.id,
            user_name: currentSession.name,
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
            valor_economia_brl: valorBRL,
            tipo: economiaData.tipo,
            descricao: economiaData.descricao || '',
            status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
            data_aprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
            observacoes: ''
        };

        const { data, error } = await supabase
            .from('economias')
            .insert(registro)
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar cancelamento:', error);
            return { success: false, message: 'Erro ao salvar: ' + error.message };
        }

        // Upload de arquivos
        let arquivos = [];
        if (economiaData.arquivos && economiaData.arquivos.length > 0) {
            arquivos = await this._uploadArquivos(data.id, economiaData.arquivos);
        }

        data._arquivos = arquivos;
        return { success: true, economia: this._fromDB(data) };
    },

    /**
     * Salvar nova economia de Correção (async)
     */
    async saveEconomiaCorrecao(economiaData) {
        const supabase = this._getClient();
        const currentSession = this.getCurrentSession();

        if (!currentSession) {
            return { success: false, message: 'Usuário não autenticado' };
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

        const registro = {
            user_id: currentSession.id,
            user_name: currentSession.name,
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
            valor_brl: 0,
            tipo: economiaData.tipo,
            descricao: economiaData.descricao || '',
            status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
            data_aprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
            observacoes: ''
        };

        const { data, error } = await supabase
            .from('economias')
            .insert(registro)
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar correção:', error);
            return { success: false, message: 'Erro ao salvar: ' + error.message };
        }

        // Upload de arquivos
        let arquivos = [];
        if (economiaData.arquivos && economiaData.arquivos.length > 0) {
            arquivos = await this._uploadArquivos(data.id, economiaData.arquivos);
        }

        data._arquivos = arquivos;
        return { success: true, economia: this._fromDB(data) };
    },

    /**
     * Atualizar status de uma economia (aprovação/reprovação) (async)
     */
    async updateEconomiaStatus(economiaId, status, observacoes = '') {
        const supabase = this._getClient();

        const { data, error } = await supabase
            .from('economias')
            .update({
                status: status,
                observacoes: observacoes,
                data_aprovacao: new Date().toISOString()
            })
            .eq('id', economiaId)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar status:', error);
            return { success: false, message: 'Erro ao atualizar: ' + error.message };
        }

        data._arquivos = await this._loadArquivos(data.id);
        return { success: true, economia: this._fromDB(data) };
    },

    /**
     * Obter economia por ID (async)
     */
    async getEconomiaById(economiaId) {
        const supabase = this._getClient();

        const { data, error } = await supabase
            .from('economias')
            .select('*')
            .eq('id', economiaId)
            .single();

        if (error) {
            console.error('Erro ao carregar economia:', error);
            return null;
        }

        data._arquivos = await this._loadArquivos(data.id);
        return this._fromDB(data);
    },

    /**
     * Aplicar filtros nas economias (async)
     */
    async filterEconomias(filters) {
        const supabase = this._getClient();

        let query = supabase
            .from('economias')
            .select('*')
            .order('data_criacao', { ascending: false });

        // Filtrar por usuário
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        // Filtrar por tipo
        if (filters.tipo) {
            query = query.eq('tipo', filters.tipo);
        }

        // Filtrar por status
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        // Filtrar por data de início
        if (filters.dataInicio) {
            query = query.gte('data_criacao', filters.dataInicio);
        }

        // Filtrar por data de fim
        if (filters.dataFim) {
            const dataFim = new Date(filters.dataFim);
            dataFim.setHours(23, 59, 59, 999);
            query = query.lte('data_criacao', dataFim.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Model] Erro ao filtrar economias:', error);
            return [];
        }

        return this._convertRows(data || []);
    },

    /**
     * Obter URL assinada de um arquivo no Storage
     */
    async getFileUrl(storagePath) {
        const supabase = this._getClient();
        const { data } = await supabase.storage
            .from('economia-arquivos')
            .createSignedUrl(storagePath, 3600);
        return data?.signedUrl || null;
    },

    /**
     * Obter todos os usuários (da tabela profiles) - para filtro de gestor
     */
    async getAllUsers() {
        const supabase = this._getClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email');

        if (error) {
            console.error('Erro ao carregar usuários:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Calcular totais de economias
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
     * Converter arquivo para Base64 (mantido para preview local)
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Arquivo muito grande. Tamanho máximo: 5MB'));
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    /**
     * Gerar ID único (fallback - Supabase gera UUIDs)
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Formatar valor para moeda brasileira
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    /**
     * Formatar data para formato brasileiro
     */
    formatDate(isoDate) {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Formatar data e hora para formato brasileiro
     */
    formatDateTime(isoDate) {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};
