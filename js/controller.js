/**
 * CONTROLLER - Camada de Controle
 * Responsável por coordenar Model e View, gerenciar eventos e lógica de negócio
 */

const Controller = {
    /**
     * Fazer login
     */
    login(username, password) {
        return Model.authenticateUser(username, password);
    },
    
    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        return Model.getCurrentSession();
    },
    
    /**
     * Fazer logout
     */
    logout() {
        Model.logout();
        window.location.href = 'index.html';
    },
    
    /**
     * Inicializar dashboard
     */
    initDashboard() {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Renderizar informações do usuário
        View.renderUserInfo(currentUser);
        
        // Mostrar/ocultar filtros baseado no perfil
        if (currentUser.role === 'gestor') {
            View.showGestorFilters();
        } else {
            View.hideGestorFilters();
        }
        
        // Carregar economias
        this.loadEconomias();
        
        // Configurar event listeners
        this.setupEventListeners();
    },
    
    /**
     * Carregar e renderizar economias
     */
    loadEconomias(filters = null) {
        const currentUser = this.getCurrentUser();
        let economias;
        
        if (currentUser.role === 'gestor') {
            // Gestor vê todas as economias
            if (filters) {
                economias = Model.filterEconomias(filters);
            } else {
                economias = Model.getEconomias();
            }
        } else {
            // Auditor vê apenas suas próprias economias
            economias = Model.getEconomiasByUser(currentUser.id);
        }
        
        // Calcular totais
        const totals = Model.calculateTotals(economias);
        
        // Renderizar
        View.renderIndicators(totals);
        View.renderEconomias(economias, currentUser.role);
    },
    
    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Nova economia
        const btnNovaEconomia = document.getElementById('btnNovaEconomia');
        if (btnNovaEconomia) {
            btnNovaEconomia.addEventListener('click', () => View.openEconomiaModal());
        }
        
        // Fechar modal de economia
        const closeModal = document.getElementById('closeModal');
        const cancelModal = document.getElementById('cancelModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => View.closeEconomiaModal());
        }
        if (cancelModal) {
            cancelModal.addEventListener('click', () => View.closeEconomiaModal());
        }
        
        // Fechar modal ao clicar fora
        const modalEconomia = document.getElementById('modalEconomia');
        if (modalEconomia) {
            modalEconomia.addEventListener('click', (e) => {
                if (e.target === modalEconomia) {
                    View.closeEconomiaModal();
                }
            });
        }
        
        // Formulário de economia
        const formEconomia = document.getElementById('formEconomia');
        if (formEconomia) {
            formEconomia.addEventListener('submit', (e) => this.handleEconomiaSubmit(e));
            
            // Calcular economia automaticamente
            document.getElementById('valorOriginal').addEventListener('input', () => View.updateEconomiaValue());
            document.getElementById('valorCorrigido').addEventListener('input', () => View.updateEconomiaValue());
        }
        
        // Filtros (apenas gestor)
        const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => this.applyFilters());
        }
        
        const btnLimparFiltros = document.getElementById('btnLimparFiltros');
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                View.clearFilters();
                this.loadEconomias();
            });
        }
        
        // Modal de aprovação
        const closeModalAprovacao = document.getElementById('closeModalAprovacao');
        const cancelAprovacao = document.getElementById('cancelAprovacao');
        if (closeModalAprovacao) {
            closeModalAprovacao.addEventListener('click', () => View.closeApprovalModal());
        }
        if (cancelAprovacao) {
            cancelAprovacao.addEventListener('click', () => View.closeApprovalModal());
        }
        
        const modalAprovacao = document.getElementById('modalAprovacao');
        if (modalAprovacao) {
            modalAprovacao.addEventListener('click', (e) => {
                if (e.target === modalAprovacao) {
                    View.closeApprovalModal();
                }
            });
        }
        
        // Botões de aprovação/reprovação
        const btnAprovar = document.getElementById('btnAprovar');
        const btnReprovar = document.getElementById('btnReprovar');
        if (btnAprovar) {
            btnAprovar.addEventListener('click', () => this.handleApproval('Aprovado'));
        }
        if (btnReprovar) {
            btnReprovar.addEventListener('click', () => this.handleApproval('Reprovado'));
        }
    },
    
    /**
     * Processar submissão de economia
     */
    async handleEconomiaSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Desabilitar botão para evitar múltiplos cliques
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        try {
            // Obter dados do formulário
            const codigoFornecedor = document.getElementById('codigoFornecedor').value;
            const valorOriginal = document.getElementById('valorOriginal').value;
            const valorCorrigido = document.getElementById('valorCorrigido').value;
            const tipo = document.getElementById('tipo').value;
            const descricao = document.getElementById('descricao').value;
            const arquivoInput = document.getElementById('arquivo');
            
            // Validar campos obrigatórios
            if (!codigoFornecedor || !valorOriginal || !valorCorrigido || !tipo) {
                View.showError('Preencha todos os campos obrigatórios');
                return;
            }
            
            // Validar arquivos
            if (!arquivoInput.files || arquivoInput.files.length === 0) {
                View.showError('É obrigatório anexar pelo menos um arquivo de prova');
                return;
            }
            
            // Validar e processar todos os arquivos
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const arquivos = [];
            
            for (let i = 0; i < arquivoInput.files.length; i++) {
                const arquivo = arquivoInput.files[i];
                
                // Validar tipo de arquivo
                if (!allowedTypes.includes(arquivo.type)) {
                    View.showError(`Arquivo "${arquivo.name}" tem formato inválido. Use PDF, PNG ou JPG`);
                    return;
                }
                
                try {
                    // Converter arquivo para Base64
                    const arquivoBase64 = await Model.fileToBase64(arquivo);
                    arquivos.push({
                        nome: arquivo.name,
                        tipo: arquivo.type,
                        dados: arquivoBase64
                    });
                } catch (error) {
                    View.showError(`Erro ao processar arquivo "${arquivo.name}": ${error.message}`);
                    return;
                }
            }
            
            // Preparar dados
            const economiaData = {
                codigoFornecedor,
                valorOriginal,
                valorCorrigido,
                tipo,
                descricao,
                arquivos: arquivos
            };
            
            // Salvar economia
            const result = Model.saveEconomia(economiaData);
            
            if (result.success) {
                View.showSuccess('Economia cadastrada com sucesso!');
                View.closeEconomiaModal();
                this.loadEconomias();
            } else {
                View.showError(result.message);
            }
            
        } catch (error) {
            View.showError('Erro ao salvar economia: ' + error.message);
        } finally {
            // Reabilitar botão
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar';
        }
    },
    
    /**
     * Aplicar filtros
     */
    applyFilters() {
        const filters = {
            userId: document.getElementById('filtroUsuario').value,
            tipo: document.getElementById('filtroTipo').value,
            status: document.getElementById('filtroStatus').value,
            dataInicio: document.getElementById('filtroDataInicio').value,
            dataFim: document.getElementById('filtroDataFim').value
        };
        
        this.loadEconomias(filters);
    },
    
    /**
     * Visualizar arquivo
     */
    viewFile(economiaId, fileIndex = 0) {
        const economia = Model.getEconomiaById(economiaId);
        
        if (!economia) {
            View.showError('Economia não encontrada');
            return;
        }
        
        View.viewFile(economia, fileIndex);
    },
    
    /**
     * Abrir modal de aprovação
     */
    openApprovalModal(economiaId) {
        const economia = Model.getEconomiaById(economiaId);
        
        if (!economia) {
            View.showError('Economia não encontrada');
            return;
        }
        
        View.openApprovalModal(economia);
    },
    
    /**
     * Processar aprovação/reprovação
     */
    handleApproval(status) {
        const modal = document.getElementById('modalAprovacao');
        const economiaId = modal.getAttribute('data-economia-id');
        const observacoes = document.getElementById('observacoes').value;
        
        if (!economiaId) {
            View.showError('Erro ao processar aprovação');
            return;
        }
        
        // Confirmar ação
        const action = status === 'Aprovado' ? 'aprovar' : 'reprovar';
        if (!confirm(`Tem certeza que deseja ${action} esta economia?`)) {
            return;
        }
        
        // Atualizar status
        const result = Model.updateEconomiaStatus(economiaId, status, observacoes);
        
        if (result.success) {
            View.showSuccess(`Economia ${status.toLowerCase()} com sucesso!`);
            View.closeApprovalModal();
            this.loadEconomias();
        } else {
            View.showError(result.message);
        }
    }
};
