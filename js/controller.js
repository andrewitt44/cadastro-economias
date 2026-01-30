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
        
        // Mostrar/ocultar botão nova economia e filtros baseado no perfil
        if (currentUser.role === 'gestor') {
            View.showGestorFilters();
            View.hideNovaEconomiaButton();
        } else {
            View.hideGestorFilters();
            View.showNovaEconomiaButton();
        }
        
        // Inicializar paginação
        View.currentPage = 1;
        View.itemsPerPage = 35;
        
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
        View.setupPagination(economias.length);
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
        
        // Nova economia - abrir modal de seleção de tipo
        const btnNovaEconomia = document.getElementById('btnNovaEconomia');
        if (btnNovaEconomia) {
            btnNovaEconomia.addEventListener('click', () => View.openTipoModal());
        }
        
        // Botões de seleção de tipo
        const btnCancelamento = document.getElementById('btnCancelamento');
        const btnCorrecao = document.getElementById('btnCorrecao');
        if (btnCancelamento) {
            btnCancelamento.addEventListener('click', () => {
                View.closeTipoModal();
                View.openCancelamentoModal();
            });
        }
        if (btnCorrecao) {
            btnCorrecao.addEventListener('click', () => {
                View.closeTipoModal();
                View.openCorrecaoModal();
            });
        }
        
        // Fechar modal de tipo
        const closeModalTipo = document.getElementById('closeModalTipo');
        if (closeModalTipo) {
            closeModalTipo.addEventListener('click', () => View.closeTipoModal());
        }
        
        // Modal de Cancelamento
        const closeCancelamento = document.getElementById('closeCancelamento');
        const cancelCancelamento = document.getElementById('cancelCancelamento');
        if (closeCancelamento) {
            closeCancelamento.addEventListener('click', () => View.closeCancelamentoModal());
        }
        if (cancelCancelamento) {
            cancelCancelamento.addEventListener('click', () => View.closeCancelamentoModal());
        }
        
        const formCancelamento = document.getElementById('formCancelamento');
        if (formCancelamento) {
            formCancelamento.addEventListener('submit', (e) => this.handleCancelamentoSubmit(e));
            
            // Event listeners para moeda e data (Cancelamento)
            document.getElementById('canc_moeda').addEventListener('change', () => this.handleMoedaChange('canc'));
            document.getElementById('canc_data').addEventListener('change', () => this.handleDataChange('canc'));
            document.getElementById('canc_agio').addEventListener('input', () => this.calculateConversion('canc'));
            document.getElementById('canc_valorCancelado').addEventListener('input', () => this.calculateConversion('canc'));
        }
        
        // Modal de Correção
        const closeCorrecao = document.getElementById('closeCorrecao');
        const cancelCorrecao = document.getElementById('cancelCorrecao');
        if (closeCorrecao) {
            closeCorrecao.addEventListener('click', () => View.closeCorrecaoModal());
        }
        if (cancelCorrecao) {
            cancelCorrecao.addEventListener('click', () => View.closeCorrecaoModal());
        }
        
        const formCorrecao = document.getElementById('formCorrecao');
        if (formCorrecao) {
            formCorrecao.addEventListener('submit', (e) => this.handleCorrecaoSubmit(e));
            
            // Calcular economia automaticamente
            document.getElementById('corr_valorOriginal').addEventListener('input', () => this.handleDescontoCalculation());
            document.getElementById('corr_valorCorrigido').addEventListener('input', () => View.updateEconomiaValueCorrecao());
            
            // Event listeners para desconto
            document.getElementById('corr_useDesconto').addEventListener('change', () => this.handleDescontoToggle());
            document.getElementById('corr_desconto').addEventListener('input', () => this.handleDescontoCalculation());
            
            // Event listeners para moeda e data (Correção)
            document.getElementById('corr_moeda').addEventListener('change', () => this.handleMoedaChange('corr'));
            document.getElementById('corr_data').addEventListener('change', () => this.handleDataChange('corr'));
            document.getElementById('corr_agio').addEventListener('input', () => this.handleValorChange('corr'));
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
        
        // Paginação (se existir)
        const btnFirstPage = document.getElementById('btnFirstPage');
        const btnPrevPage = document.getElementById('btnPrevPage');
        const btnNextPage = document.getElementById('btnNextPage');
        const btnLastPage = document.getElementById('btnLastPage');
        
        if (btnFirstPage) btnFirstPage.addEventListener('click', () => View.goToPage(1));
        if (btnPrevPage) btnPrevPage.addEventListener('click', () => View.previousPage());
        if (btnNextPage) btnNextPage.addEventListener('click', () => View.nextPage());
        if (btnLastPage) btnLastPage.addEventListener('click', () => View.goToLastPage());
    },
    
    /**
     * Buscar PTAX do BACEN
     */
    async fetchPTAX(date) {
        try {
            // Formatar data para API do BACEN (MM-DD-YYYY)
            const [year, month, day] = date.split('-');
            const formattedDate = `${month}-${day}-${year}`;
            
            // API do BACEN para cotação dólar
            const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formattedDate}'&$format=json`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.value && data.value.length > 0) {
                // Pegar cotação de venda
                return data.value[0].cotacaoVenda;
            } else {
                View.showError('Não foi encontrada cotação PTAX para esta data. Verifique se é dia útil.');
                return null;
            }
        } catch (error) {
            console.error('Erro ao buscar PTAX:', error);
            View.showError('Erro ao buscar cotação PTAX. Por favor, tente novamente.');
            return null;
        }
    },
    
    /**
     * Handler para mudança de moeda
     */
    async handleMoedaChange(prefix) {
        const moeda = document.getElementById(`${prefix}_moeda`).value;
        const agioGroup = document.getElementById(`${prefix}_agioGroup`);
        const ptaxGroup = document.getElementById(`${prefix}_ptaxGroup`);
        const moedaLabel = document.getElementById(`${prefix}_moedaLabel`);
        
        if (prefix === 'corr') {
            const moedaLabelOriginal = document.getElementById(`${prefix}_moedaLabelOriginal`);
            const moedaLabelCorrigido = document.getElementById(`${prefix}_moedaLabelCorrigido`);
            const moedaLabelEconomia = document.getElementById(`${prefix}_moedaLabelEconomia`);
            
            if (moeda === 'USD') {
                moedaLabelOriginal.textContent = 'Valor Original (USD)';
                moedaLabelCorrigido.textContent = 'Valor Corrigido (USD)';
                moedaLabelEconomia.textContent = 'Valor da Economia (USD)';
            } else {
                moedaLabelOriginal.textContent = 'Valor Original (BRL)';
                moedaLabelCorrigido.textContent = 'Valor Corrigido (BRL)';
                moedaLabelEconomia.textContent = 'Valor da Economia (BRL)';
            }
        }
        
        if (moeda === 'USD') {
            agioGroup.style.display = 'block';
            ptaxGroup.style.display = 'block';
            if (moedaLabel) moedaLabel.textContent = 'Valor Cancelado (USD)';
            
            // Buscar PTAX se data já estiver preenchida
            const data = document.getElementById(`${prefix}_data`).value;
            if (data) {
                await this.handleDataChange(prefix);
            }
        } else {
            agioGroup.style.display = 'none';
            ptaxGroup.style.display = 'none';
            if (moedaLabel) moedaLabel.textContent = 'Valor Cancelado (BRL)';
            
            // Limpar PTAX
            const ptaxInput = document.getElementById(`${prefix}_ptax`);
            if (ptaxInput) ptaxInput.value = '';
        }
        
        // Recalcular conversão
        if (prefix === 'canc') {
            this.calculateConversion(prefix);
        } else {
            this.handleValorChange(prefix);
        }
    },
    
    /**
     * Handler para mudança de data
     */
    async handleDataChange(prefix) {
        const moeda = document.getElementById(`${prefix}_moeda`).value;
        const data = document.getElementById(`${prefix}_data`).value;
        
        if (moeda === 'USD' && data) {
            const ptax = await this.fetchPTAX(data);
            if (ptax) {
                document.getElementById(`${prefix}_ptax`).value = ptax.toFixed(4);
                
                // Recalcular conversão
                if (prefix === 'canc') {
                    this.calculateConversion(prefix);
                } else {
                    this.handleValorChange(prefix);
                }
            }
        }
    },
    
    /**
     * Calcular conversão para cancelamento
     */
    calculateConversion(prefix) {
        const moeda = document.getElementById(`${prefix}_moeda`).value;
        
        if (moeda === 'USD') {
            const valorUSD = parseFloat(document.getElementById(`${prefix}_valorCancelado`).value) || 0;
            const ptax = parseFloat(document.getElementById(`${prefix}_ptax`).value) || 0;
            const agio = parseFloat(document.getElementById(`${prefix}_agio`).value) || 0;
            
            if (valorUSD && ptax) {
                // Aplicar ágio: valor * (1 + agio/100)
                const valorComAgio = valorUSD * (1 + agio / 100);
                const valorBRL = valorComAgio * ptax;
                
                const valorBRLGroup = document.getElementById(`${prefix}_valorBRLGroup`);
                const valorBRLInput = document.getElementById(`${prefix}_valorBRL`);
                
                if (valorBRLGroup) valorBRLGroup.style.display = 'block';
                if (valorBRLInput) valorBRLInput.value = valorBRL.toFixed(2);
            }
        } else {
            const valorBRLGroup = document.getElementById(`${prefix}_valorBRLGroup`);
            if (valorBRLGroup) valorBRLGroup.style.display = 'none';
        }
    },
    
    /**
     * Handler para mudança de valores (correção)
     */
    handleValorChange(prefix) {
        View.updateEconomiaValueCorrecao();
    },
    
    /**
     * Handler para toggle do checkbox de desconto
     */
    handleDescontoToggle() {
        const useDesconto = document.getElementById('corr_useDesconto').checked;
        const descontoGroup = document.getElementById('corr_descontoGroup');
        const valorCorrigidoInput = document.getElementById('corr_valorCorrigido');
        
        if (useDesconto) {
            // Mostrar campo de desconto
            descontoGroup.style.display = 'block';
            // Desabilitar campo valor corrigido
            valorCorrigidoInput.readOnly = true;
            valorCorrigidoInput.style.backgroundColor = '#f0f0f0';
            // Calcular automaticamente
            this.handleDescontoCalculation();
        } else {
            // Esconder campo de desconto
            descontoGroup.style.display = 'none';
            // Habilitar campo valor corrigido
            valorCorrigidoInput.readOnly = false;
            valorCorrigidoInput.style.backgroundColor = '';
            // Limpar desconto
            document.getElementById('corr_desconto').value = '0';
        }
    },
    
    /**
     * Calcular valor corrigido com desconto
     */
    handleDescontoCalculation() {
        const useDesconto = document.getElementById('corr_useDesconto').checked;
        
        if (useDesconto) {
            const valorOriginal = parseFloat(document.getElementById('corr_valorOriginal').value) || 0;
            const desconto = parseFloat(document.getElementById('corr_desconto').value) || 0;
            
            if (valorOriginal > 0 && desconto >= 0 && desconto <= 100) {
                // Calcular: valorCorrigido = valorOriginal * (1 - desconto/100)
                const valorCorrigido = valorOriginal * (1 - desconto / 100);
                document.getElementById('corr_valorCorrigido').value = valorCorrigido.toFixed(2);
            }
        }
        
        // Atualizar valor da economia
        View.updateEconomiaValueCorrecao();
    },
    
    /**
     * Processar submissão de cancelamento
     */
    async handleCancelamentoSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        try {
            const codigoFornecedor = document.getElementById('canc_codigoFornecedor').value;
            const data = document.getElementById('canc_data').value;
            const moeda = document.getElementById('canc_moeda').value;
            const agio = parseFloat(document.getElementById('canc_agio').value) || 0;
            const valorCancelado = parseFloat(document.getElementById('canc_valorCancelado').value);
            const tipo = document.getElementById('canc_tipo').value;
            const descricao = document.getElementById('canc_descricao').value;
            const arquivoInput = document.getElementById('canc_arquivo');
            
            if (!codigoFornecedor || !data || !valorCancelado || !tipo) {
                View.showError('Preencha todos os campos obrigatórios');
                return;
            }
            
            let ptax = null;
            let valorBRL = valorCancelado; // Valor padrão para BRL
            
            if (moeda === 'USD') {
                ptax = parseFloat(document.getElementById('canc_ptax').value);
                if (!ptax) {
                    View.showError('Aguarde o carregamento da cotação PTAX');
                    return;
                }
                // Pegar o valor BRL já calculado automaticamente
                valorBRL = parseFloat(document.getElementById('canc_valorBRL').value);
                if (!valorBRL || valorBRL <= 0) {
                    View.showError('Erro ao calcular valor em BRL');
                    return;
                }
            }
            
            if (!arquivoInput.files || arquivoInput.files.length === 0) {
                View.showError('É obrigatório anexar pelo menos um arquivo de prova');
                return;
            }
            
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const arquivos = [];
            
            for (let i = 0; i < arquivoInput.files.length; i++) {
                const arquivo = arquivoInput.files[i];
                
                if (!allowedTypes.includes(arquivo.type)) {
                    View.showError(`Arquivo "${arquivo.name}" tem formato inválido. Use PDF, PNG ou JPG`);
                    return;
                }
                
                try {
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
            
            const economiaData = {
                tipoEconomia: 'Cancelamento',
                codigoFornecedor,
                data,
                moeda,
                ptax,
                agio,
                valorCancelado: valorCancelado,
                valorBRL: valorBRL,
                tipo,
                descricao,
                arquivos
            };
            
            const result = Model.saveEconomiaCancelamento(economiaData);
            
            if (result.success) {
                View.showSuccess('Economia (Cancelamento) cadastrada com sucesso!');
                View.closeCancelamentoModal();
                this.loadEconomias();
            } else {
                View.showError(result.message);
            }
            
        } catch (error) {
            View.showError('Erro ao salvar economia: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar';
        }
    },
    
    /**
     * Processar submissão de correção
     */
    async handleCorrecaoSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        try {
            const codigoFornecedor = document.getElementById('corr_codigoFornecedor').value;
            const data = document.getElementById('corr_data').value;
            const moeda = document.getElementById('corr_moeda').value;
            const agio = parseFloat(document.getElementById('corr_agio').value) || 0;
            const valorOriginal = parseFloat(document.getElementById('corr_valorOriginal').value);
            const valorCorrigido = parseFloat(document.getElementById('corr_valorCorrigido').value);
            const tipo = document.getElementById('corr_tipo').value;
            const descricao = document.getElementById('corr_descricao').value;
            const arquivoInput = document.getElementById('corr_arquivo');
            
            if (!codigoFornecedor || !data || !valorOriginal || !valorCorrigido || !tipo) {
                View.showError('Preencha todos os campos obrigatórios');
                return;
            }
            
            let ptax = null;
            let valorOriginalBRL = valorOriginal;
            let valorCorrigidoBRL = valorCorrigido;
            
            if (moeda === 'USD') {
                ptax = parseFloat(document.getElementById('corr_ptax').value);
                if (!ptax) {
                    View.showError('Aguarde o carregamento da cotação PTAX');
                    return;
                }
                // Aplicar ágio e converter para BRL
                const fatorConversao = ptax * (1 + agio / 100);
                valorOriginalBRL = valorOriginal * fatorConversao;
                valorCorrigidoBRL = valorCorrigido * fatorConversao;
            }
            
            if (!arquivoInput.files || arquivoInput.files.length === 0) {
                View.showError('É obrigatório anexar pelo menos um arquivo de prova');
                return;
            }
            
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const arquivos = [];
            
            for (let i = 0; i < arquivoInput.files.length; i++) {
                const arquivo = arquivoInput.files[i];
                
                if (!allowedTypes.includes(arquivo.type)) {
                    View.showError(`Arquivo "${arquivo.name}" tem formato inválido. Use PDF, PNG ou JPG`);
                    return;
                }
                
                try {
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
            
            const economiaData = {
                tipoEconomia: 'Correção',
                codigoFornecedor,
                data,
                moeda,
                ptax,
                agio,
                valorOriginal: valorOriginal,
                valorCorrigido: valorCorrigido,
                valorOriginalBRL: valorOriginalBRL,
                valorCorrigidoBRL: valorCorrigidoBRL,
                tipo,
                descricao,
                arquivos
            };
            
            const result = Model.saveEconomiaCorrecao(economiaData);
            
            if (result.success) {
                View.showSuccess('Economia (Correção) cadastrada com sucesso!');
                View.closeCorrecaoModal();
                this.loadEconomias();
            } else {
                View.showError(result.message);
            }
            
        } catch (error) {
            View.showError('Erro ao salvar economia: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar';
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
    },
    
    /**
     * Carregar detalhes de uma economia específica
     */
    loadEconomiaDetails(economiaId) {
        const economia = Model.getEconomiaById(economiaId);
        
        if (!economia) {
            View.showError('Economia não encontrada');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }
        
        View.renderEconomiaDetails(economia, this.getCurrentUser().role);
    }
};
