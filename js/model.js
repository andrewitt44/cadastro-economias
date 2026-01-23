/**
 * MODEL - Camada de Modelo
 * Responsável por gerenciar os dados e a persistência no LocalStorage
 */

const Model = {
    /**
     * Inicializar o sistema com dados padrão
     */
    initializeSystem() {
        // Criar usuários padrão
        const users = [
            {
                id: '1',
                username: 'auditor',
                password: '123456',
                name: 'João Auditor',
                role: 'auditor'
            },
            {
                id: '2',
                username: 'gestor',
                password: '123456',
                name: 'Maria Gestora',
                role: 'gestor'
            }
        ];
        
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('economias', JSON.stringify([]));
        localStorage.setItem('currentSession', null);
    },
    
    /**
     * Obter todos os usuários
     */
    getUsers() {
        const users = localStorage.getItem('users');
        return users ? JSON.parse(users) : [];
    },
    
    /**
     * Autenticar usuário
     */
    authenticateUser(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            const session = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('currentSession', JSON.stringify(session));
            return { success: true, user: session };
        }
        
        return { success: false, message: 'Usuário ou senha incorretos' };
    },
    
    /**
     * Obter sessão atual
     */
    getCurrentSession() {
        const session = localStorage.getItem('currentSession');
        return session && session !== 'null' ? JSON.parse(session) : null;
    },
    
    /**
     * Fazer logout
     */
    logout() {
        localStorage.setItem('currentSession', null);
    },
    
    /**
     * Obter todas as economias
     */
    getEconomias() {
        const economias = localStorage.getItem('economias');
        return economias ? JSON.parse(economias) : [];
    },
    
    /**
     * Obter economias filtradas por usuário
     */
    getEconomiasByUser(userId) {
        const economias = this.getEconomias();
        return economias.filter(e => e.userId === userId);
    },
    
    /**
     * Salvar nova economia
     */
    saveEconomia(economiaData) {
        const economias = this.getEconomias();
        const currentSession = this.getCurrentSession();
        
        if (!currentSession) {
            return { success: false, message: 'Usuário não autenticado' };
        }
        
        // Calcular valor da economia
        const valorOriginal = parseFloat(economiaData.valorOriginal);
        const valorCorrigido = parseFloat(economiaData.valorCorrigido);
        const valorEconomia = valorOriginal - valorCorrigido;
        
        if (valorEconomia < 0) {
            return { success: false, message: 'Valor da economia não pode ser negativo' };
        }
        
        // Criar nova economia
        const novaEconomia = {
            id: this.generateId(),
            userId: currentSession.id,
            userName: currentSession.name,
            codigoFornecedor: economiaData.codigoFornecedor || '',
            valorOriginal: valorOriginal,
            valorCorrigido: valorCorrigido,
            valorEconomia: valorEconomia,
            tipo: economiaData.tipo,
            descricao: economiaData.descricao || '',
            arquivos: economiaData.arquivos || [],
            status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
            dataCriacao: new Date().toISOString(),
            dataAprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
            observacoes: ''
        };
        
        economias.push(novaEconomia);
        localStorage.setItem('economias', JSON.stringify(economias));
        
        return { success: true, economia: novaEconomia };
    },
    
    /**
     * Atualizar status de uma economia (aprovação/reprovação)
     */
    updateEconomiaStatus(economiaId, status, observacoes = '') {
        const economias = this.getEconomias();
        const index = economias.findIndex(e => e.id === economiaId);
        
        if (index === -1) {
            return { success: false, message: 'Economia não encontrada' };
        }
        
        economias[index].status = status;
        economias[index].observacoes = observacoes;
        economias[index].dataAprovacao = new Date().toISOString();
        
        localStorage.setItem('economias', JSON.stringify(economias));
        
        return { success: true, economia: economias[index] };
    },
    
    /**
     * Obter economia por ID
     */
    getEconomiaById(economiaId) {
        const economias = this.getEconomias();
        return economias.find(e => e.id === economiaId);
    },
    
    /**
     * Aplicar filtros nas economias
     */
    filterEconomias(filters) {
        let economias = this.getEconomias();
        
        // Filtrar por usuário
        if (filters.userId) {
            economias = economias.filter(e => e.userId === filters.userId);
        }
        
        // Filtrar por tipo
        if (filters.tipo) {
            economias = economias.filter(e => e.tipo === filters.tipo);
        }
        
        // Filtrar por status
        if (filters.status) {
            economias = economias.filter(e => e.status === filters.status);
        }
        
        // Filtrar por data de início
        if (filters.dataInicio) {
            const dataInicio = new Date(filters.dataInicio);
            economias = economias.filter(e => new Date(e.dataCriacao) >= dataInicio);
        }
        
        // Filtrar por data de fim
        if (filters.dataFim) {
            const dataFim = new Date(filters.dataFim);
            dataFim.setHours(23, 59, 59, 999); // Incluir o dia inteiro
            economias = economias.filter(e => new Date(e.dataCriacao) <= dataFim);
        }
        
        return economias;
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
            // Garantir que valorEconomia está em BRL
            let valorEconomia = 0;
            
            if (e.tipoEconomia === 'Cancelamento') {
                // Para cancelamento, usar valorBRL se existir, senão valorCancelado
                valorEconomia = parseFloat(e.valorBRL) || parseFloat(e.valorCancelado) || 0;
            } else {
                // Para correção, usar valorEconomiaBRL se existir, senão valorEconomia
                valorEconomia = parseFloat(e.valorEconomiaBRL) || parseFloat(e.valorEconomia) || 0;
            }
            
            // Total economizado não inclui reprovadas
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
     * Salvar nova economia de Cancelamento
     */
    saveEconomiaCancelamento(economiaData) {
        const economias = this.getEconomias();
        const currentSession = this.getCurrentSession();
        
        if (!currentSession) {
            return { success: false, message: 'Usuário não autenticado' };
        }
        
        const valorCancelado = parseFloat(economiaData.valorCancelado);
        const valorBRL = parseFloat(economiaData.valorBRL);
        
        if (valorCancelado <= 0) {
            return { success: false, message: 'Valor cancelado deve ser maior que zero' };
        }
        
        const novaEconomia = {
            id: this.generateId(),
            userId: currentSession.id,
            userName: currentSession.name,
            tipoEconomia: 'Cancelamento',
            codigoFornecedor: economiaData.codigoFornecedor || '',
            data: economiaData.data,
            moeda: economiaData.moeda || 'BRL',
            ptax: economiaData.ptax || null,
            agio: economiaData.agio || 0,
            valorCancelado: valorCancelado,
            valorBRL: valorBRL,
            valorOriginal: 0,
            valorCorrigido: 0,
            valorEconomia: valorBRL,
            tipo: economiaData.tipo,
            descricao: economiaData.descricao || '',
            arquivos: economiaData.arquivos || [],
            status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
            dataCriacao: new Date().toISOString(),
            dataAprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
            observacoes: ''
        };
        
        economias.push(novaEconomia);
        localStorage.setItem('economias', JSON.stringify(economias));
        
        return { success: true, economia: novaEconomia };
    },
    
    /**
     * Salvar nova economia de Correção
     */
    saveEconomiaCorrecao(economiaData) {
        const economias = this.getEconomias();
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
        
        const novaEconomia = {
            id: this.generateId(),
            userId: currentSession.id,
            userName: currentSession.name,
            tipoEconomia: 'Correção',
            codigoFornecedor: economiaData.codigoFornecedor || '',
            data: economiaData.data,
            moeda: economiaData.moeda || 'BRL',
            ptax: economiaData.ptax || null,
            agio: economiaData.agio || 0,
            valorOriginal: valorOriginal,
            valorCorrigido: valorCorrigido,
            valorOriginalBRL: valorOriginalBRL,
            valorCorrigidoBRL: valorCorrigidoBRL,
            valorEconomia: valorEconomiaBRL,
            valorEconomiaBRL: valorEconomiaBRL,
            valorCancelado: 0,
            tipo: economiaData.tipo,
            descricao: economiaData.descricao || '',
            arquivos: economiaData.arquivos || [],
            status: economiaData.tipo === 'BID' ? 'Aprovado' : 'Pendente',
            dataCriacao: new Date().toISOString(),
            dataAprovacao: economiaData.tipo === 'BID' ? new Date().toISOString() : null,
            observacoes: ''
        };
        
        economias.push(novaEconomia);
        localStorage.setItem('economias', JSON.stringify(economias));
        
        return { success: true, economia: novaEconomia };
    },
    
    /**
     * Converter arquivo para Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            // Verificar tamanho do arquivo (máximo 5MB)
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
     * Gerar ID único
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
