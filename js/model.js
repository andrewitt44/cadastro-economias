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
            nomeFornecedor: row.nome_fornecedor || '',
            descricaoTaxa: row.descricao_taxa || '',
            data: row.data || null,
            dataPagamento: row.data_pagamento || row.data || null,
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
            areaResponsavel: row.area_responsavel || '',
            descricao: row.descricao || '',
            status: row.status,
            observacoes: row.observacoes || '',
            modalServico: row.modal_servico || '',
            dataCriacao: row.data_criacao,
            dataAprovacao: row.data_aprovacao,
            arquivos: row._arquivos || []
        };
    },

    // ===== FORNECEDORES =====

    /** Cache local de fornecedores para autocomplete rápido */
    _fornecedoresCache: null,
    _fornecedoresCacheTime: 0,

    /** Nomes dos modais de serviço */
    MODAL_NAMES: {1: 'Aéreo', 2: 'Marítimo', 3: 'Rodoviário', 4: 'Ferroviário'},

    /** Mapeamento estático: código fornecedor → códigos de modal (fallback) */
    MODAIS_MAP: {
        '52598':[1,2],'15152':[1,2,3,4],'15821':[2],'12757':[3],'16627':[1],'131048':[1],
        '59497':[1,2,3],'13815':[3],'34218':[3],'57876':[3],'16662':[1],'85103':[1,2,3],
        '28065':[1,3],'84957':[3],'110394':[3],'121904':[2,3,4],'26100':[2,3,4],
        '13251':[3],'105243':[1,3],'51876':[1,2,3,4],'41828':[1,2,3],'44946':[1],
        '97225':[3],'26798':[1,2,3,4],'32814':[3],'18366':[2,3],'50079':[3],
        '97513':[1,2,3,4],'87298':[1,2],'15306':[3],'80139':[2],'29260':[1,2,3],
        '40932':[1,2],'63349':[1,2,3],'95066':[1],'75770':[3],'80978':[1],
        '13041':[1,3],'26859':[1,2,3],'48965':[1,2,3],'108000':[1,2],'60170':[1,2,3,4],
        '138520':[3],'49440':[1,2,3],'39656':[2],'11382':[1],'93868':[3],
        '15292':[1,2,3],'75558':[1,2,3],'117133':[1,2,3],'122737':[1,2,3],
        '15206':[2],'115817':[3],'15252':[1,2],'105305':[2,3],'98598':[1,2,3,4],
        '58668':[1,2,3],'55289':[1,2],'24355':[2,3],'15207':[2],'102190':[3],
        '15107':[1,2,3,4],'51360':[1,2],'91053':[3],'138589':[3],'117047':[2],
        '26353':[1,2,3,4],'116735':[1,2,3],'29224':[1,2,3,4],'55577':[3],'97348':[3],
        '30051':[1,2,3],'104381':[3],'115821':[1,2],'26675':[1,2,3,4],'64914':[1,2],
        '74149':[3],'118898':[1],'16658':[2],'81966':[2],'63485':[2],
        '139642':[1,2,3],'100385':[1,2],'102270':[1,2,3,4],'26219':[1,2],
        '138867':[2],'19532':[1],'109403':[2],'129011':[2],'137105':[1,2,3],
        '39506':[1,2,3],'101676':[1,2,3],'55001':[1,2,3],'16726':[1,2],
        '48185':[1,2,3],'137199':[3],'128969':[1,2],'15187':[1,2]
    },

    /**
     * Obter modais de serviço para um código de fornecedor (fallback estático)
     */
    getModaisForCodigo(codigo) {
        const codigos = this.MODAIS_MAP[String(codigo)];
        if (!codigos || codigos.length === 0) return [];
        return codigos.map(c => ({codigo: c, nome: this.MODAL_NAMES[c]}));
    },

    /**
     * Obter todos os fornecedores (com cache de 5 min)
     */
    async getFornecedores(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this._fornecedoresCache && (now - this._fornecedoresCacheTime < 300000)) {
            return this._fornecedoresCache;
        }

        const supabase = this._getClient();
        const { data, error } = await supabase
            .from('fornecedores')
            .select('*')
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) {
            console.warn('[Model] Erro ao carregar fornecedores:', error);
            return this._fornecedoresCache || [];
        }

        this._fornecedoresCache = data || [];
        this._fornecedoresCacheTime = now;
        return this._fornecedoresCache;
    },

    /**
     * Buscar fornecedor por código (exata) ou nome (parcial)
     */
    async searchFornecedores(query) {
        if (!query || query.length < 1) return [];
        
        const fornecedores = await this.getFornecedores();
        const q = query.toLowerCase().trim();
        
        return fornecedores.filter(f =>
            f.codigo.toLowerCase().includes(q) ||
            f.nome.toLowerCase().includes(q)
        ).slice(0, 10); // máximo 10 resultados
    },

    /**
     * Obter fornecedor por código exato
     */
    async getFornecedorByCodigo(codigo) {
        const fornecedores = await this.getFornecedores();
        return fornecedores.find(f => f.codigo.toLowerCase() === codigo.toLowerCase()) || null;
    },

    // ===== EXPORT =====

    /**
     * Exportar economias para CSV (compatível com Excel e Power BI)
     */
    exportToCSV(economias, filename = 'economias') {
        const BOM = '\uFEFF'; // BOM para Excel reconhecer UTF-8
        const sep = ';'; // Ponto-e-vírgula para Excel BR

        // Formatar número para CSV brasileiro (vírgula como decimal)
        const fmtNum = (v) => {
            if (v === null || v === undefined || v === '') return '';
            return String(Number(v)).replace('.', ',');
        };

        const headers = [
            'Operação', 'Modal', 'Código Fornecedor', 'Nome Fornecedor', 'Modal Serviço',
            'Auditor', 'Área Responsável', 'Data PTAX', 'Data Pagamento', 'Moeda', 'PTAX', 'Ágio (%)', 'Descrição Taxa',
            'Valor Original', 'Valor Corrigido',
            'Valor Original BRL', 'Valor Corrigido BRL', 'Valor Economia', 'Valor Economia BRL',
            'Status', 'Descrição', 'Data Criação'
        ];

        const rows = economias.map(e => {
            // Para cancelamento, usar valorCancelado como Valor Original
            const valorOrigCSV = e.tipoEconomia === 'Cancelamento' ? e.valorCancelado : e.valorOriginal;
            const valorOrigBRLCSV = e.tipoEconomia === 'Cancelamento' ? e.valorBRL : e.valorOriginalBRL;
            // Valor economia na moeda original
            const valorEconomiaCSV = e.tipoEconomia === 'Cancelamento' ? e.valorCancelado : (e.valorOriginal - e.valorCorrigido);
            const valorEconomiaBRLCSV = e.tipoEconomia === 'Cancelamento' ? e.valorBRL : (e.valorOriginalBRL - e.valorCorrigidoBRL);

            return [
                e.tipoEconomia,
                e.tipo,
                e.codigoFornecedor,
                e.nomeFornecedor || '',
                e.modalServico || '',
                e.userName,
                e.areaResponsavel || '',
                e.data || '',
                e.dataPagamento || '',
                e.moeda,
                fmtNum(e.ptax),
                fmtNum(e.agio || 0),
                e.descricaoTaxa || '',
                fmtNum(valorOrigCSV),
                fmtNum(e.tipoEconomia === 'Cancelamento' ? 0 : e.valorCorrigido),
                fmtNum(valorOrigBRLCSV),
                fmtNum(e.tipoEconomia === 'Cancelamento' ? 0 : e.valorCorrigidoBRL),
                fmtNum(valorEconomiaCSV),
                fmtNum(valorEconomiaBRLCSV),
                e.status,
                e.descricao,
                // e.observacoes,
                e.dataCriacao ? new Date(e.dataCriacao).toLocaleString('pt-BR') : ''
                // e.dataAprovacao ? new Date(e.dataAprovacao).toLocaleString('pt-BR') : ''
            ];
        });

        const csvContent = BOM +
            headers.join(sep) + '\n' +
            rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(sep)).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Exportar economias para JSON (Power BI import direto)
     */
    exportToJSON(economias, filename = 'economias') {
        const exportData = economias.map(e => {
            // Mesma regra do CSV para cancelamento.
            const valorOrig = e.tipoEconomia === 'Cancelamento' ? e.valorCancelado : e.valorOriginal;
            const valorOrigBRL = e.tipoEconomia === 'Cancelamento' ? e.valorBRL : e.valorOriginalBRL;
            const valorEconomia = e.tipoEconomia === 'Cancelamento' ? e.valorCancelado : (e.valorOriginal - e.valorCorrigido);
            const valorEconomiaBRL = e.tipoEconomia === 'Cancelamento' ? e.valorBRL : (e.valorOriginalBRL - e.valorCorrigidoBRL);

            return {
                operacao: e.tipoEconomia,
                modal: e.tipo,
                codigo_fornecedor: e.codigoFornecedor,
                nome_fornecedor: e.nomeFornecedor || '',
                modal_servico: e.modalServico || '',
                auditor: e.userName,
                area_responsavel: e.areaResponsavel || '',
                data_ptax: e.data || '',
                data_pagamento: e.dataPagamento || '',
                moeda: e.moeda,
                ptax: e.ptax,
                agio_pct: e.agio || 0,
                descricao_taxa: e.descricaoTaxa || '',
                valor_original: valorOrig,
                valor_corrigido: e.tipoEconomia === 'Cancelamento' ? 0 : e.valorCorrigido,
                valor_original_brl: valorOrigBRL,
                valor_corrigido_brl: e.tipoEconomia === 'Cancelamento' ? 0 : e.valorCorrigidoBRL,
                valor_economia: valorEconomia,
                valor_economia_brl: valorEconomiaBRL,
                status: e.status,
                descricao: e.descricao,
                data_criacao: e.dataCriacao
            };
        });

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
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

        // Regra temporária: aprovar automaticamente BID e Cotação.
        const aprovaAutomatico = economiaData.tipo === 'BID' || economiaData.tipo === 'Cotação';

        const registro = {
            user_id: currentSession.id,
            user_name: currentSession.name,
            tipo_economia: 'Cancelamento',
            codigo_fornecedor: economiaData.codigoFornecedor || '',
            nome_fornecedor: economiaData.nomeFornecedor || '',
            descricao_taxa: economiaData.descricaoTaxa || '',
            data: economiaData.dataPTAX || economiaData.data || economiaData.dataPagamento || null,
            data_pagamento: economiaData.dataPagamento || economiaData.data || null,
            moeda: economiaData.moeda || 'BRL',
            ptax: economiaData.ptax || null,
            agio: economiaData.agio || 0,
            valor_cancelado: valorCancelado,
            valor_brl: valorBRL,
            valor_original: 0,
            valor_corrigido: 0,
            valor_economia: valorCancelado,
            valor_economia_brl: valorBRL,
            tipo: economiaData.tipo,
            area_responsavel: economiaData.areaResponsavel || '',
            modal_servico: economiaData.modalServico || '',
            descricao: economiaData.descricao || '',
            status: aprovaAutomatico ? 'Aprovado' : 'Pendente',
            data_aprovacao: aprovaAutomatico ? new Date().toISOString() : null,
            observacoes: ''
        };

        const { data, error } = await supabase
            .from('economias')
            .insert(registro)
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar cancelamento:', error);
            if (String(error.message || '').toLowerCase().includes('area_responsavel')) {
                return { success: false, message: 'A coluna area_responsavel ainda não existe no banco. Atualize a tabela economias para incluir esse campo.' };
            }
            if (String(error.message || '').toLowerCase().includes('data_pagamento')) {
                return { success: false, message: 'A coluna data_pagamento ainda não existe no banco. Atualize a tabela economias para incluir esse campo.' };
            }
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

        // Regra temporária: aprovar automaticamente BID e Cotação.
        const aprovaAutomatico = economiaData.tipo === 'BID' || economiaData.tipo === 'Cotação';

        const registro = {
            user_id: currentSession.id,
            user_name: currentSession.name,
            tipo_economia: 'Correção',
            codigo_fornecedor: economiaData.codigoFornecedor || '',
            nome_fornecedor: economiaData.nomeFornecedor || '',
            descricao_taxa: economiaData.descricaoTaxa || '',
            data: economiaData.dataPTAX || economiaData.data || economiaData.dataPagamento || null,
            data_pagamento: economiaData.dataPagamento || economiaData.data || null,
            moeda: economiaData.moeda || 'BRL',
            ptax: economiaData.ptax || null,
            agio: economiaData.agio || 0,
            valor_original: valorOriginal,
            valor_corrigido: valorCorrigido,
            valor_original_brl: valorOriginalBRL,
            valor_corrigido_brl: valorCorrigidoBRL,
            valor_economia: valorEconomia,
            valor_economia_brl: valorEconomiaBRL,
            valor_cancelado: 0,
            valor_brl: 0,
            tipo: economiaData.tipo,
            area_responsavel: economiaData.areaResponsavel || '',
            modal_servico: economiaData.modalServico || '',
            descricao: economiaData.descricao || '',
            status: aprovaAutomatico ? 'Aprovado' : 'Pendente',
            data_aprovacao: aprovaAutomatico ? new Date().toISOString() : null,
            observacoes: ''
        };

        const { data, error } = await supabase
            .from('economias')
            .insert(registro)
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar correção:', error);
            if (String(error.message || '').toLowerCase().includes('area_responsavel')) {
                return { success: false, message: 'A coluna area_responsavel ainda não existe no banco. Atualize a tabela economias para incluir esse campo.' };
            }
            if (String(error.message || '').toLowerCase().includes('data_pagamento')) {
                return { success: false, message: 'A coluna data_pagamento ainda não existe no banco. Atualize a tabela economias para incluir esse campo.' };
            }
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
            .order('data', { ascending: false });

        // Filtrar por usuário
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        // Filtrar por tipo de operação (Cancelamento / Correção)
        if (filters.tipoEconomia) {
            query = query.eq('tipo_economia', filters.tipoEconomia);
        }

        // Filtrar por tipo de câmbio (BID / Cotação)
        if (filters.tipo) {
            query = query.eq('tipo', filters.tipo);
        }

        // Filtrar por status
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        // Filtrar por data de início (usa coluna 'data' = data da operação)
        if (filters.dataInicio) {
            query = query.gte('data', filters.dataInicio);
        }

        // Filtrar por data de fim
        if (filters.dataFim) {
            query = query.lte('data', filters.dataFim);
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

        // Para datas sem horário (YYYY-MM-DD), evitar new Date() para não deslocar por fuso.
        const raw = String(isoDate).trim();
        const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            return `${day}/${month}/${year}`;
        }

        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return raw;
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
