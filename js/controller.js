/**
 * CONTROLLER - Camada de Controle
 * Responsável por coordenar Model e View, gerenciar eventos e lógica de negócio
 * Autenticação via Supabase (Google/Microsoft OAuth)
 */

// Aceita vírgula ou ponto como separador decimal
function parseVal(v) {
    return parseFloat(String(v || '').replace(',', '.')) || 0;
}

const Controller = {
    _currentUser: null,

    isFutureDate(dateStr) {
        if (!dateStr) return false;
        const [year, month, day] = dateStr.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return selectedDate > todayStart;
    },

    /**
     * Inicializar autenticação via Supabase
     * Retorna o usuário autenticado ou redireciona para login
     */
    async initAuth() {
        if (typeof SupabaseConfig === 'undefined' || !SupabaseConfig.client) {
            window.location.href = 'login-supabase.html';
            return null;
        }
        try {
            const session = await SupabaseConfig.checkAuth();
            if (!session) {
                window.location.href = 'login-supabase.html';
                return null;
            }
            this._currentUser = await SupabaseConfig.getCurrentUser();
            if (!this._currentUser) {
                window.location.href = 'login-supabase.html';
                return null;
            }
            // Sincronizar com Model para que save methods funcionem
            Model.setCurrentUser(this._currentUser);

            // Monitorar expiração da sessão
            SupabaseConfig.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                    this._currentUser = null;
                    window.location.href = 'login-supabase.html';
                }
            });

            return this._currentUser;
        } catch (error) {
            console.error('Erro na autenticação:', error);
            window.location.href = 'login-supabase.html';
            return null;
        }
    },

    /**
     * Obter usuário atual (síncrono - já carregado por initAuth)
     */
    getCurrentUser() {
        return this._currentUser;
    },
    
    /**
     * Fazer logout via Supabase
     */
    async logout() {
        try {
            if (typeof SupabaseConfig !== 'undefined' && SupabaseConfig.client) {
                await SupabaseConfig.logout();
            }
        } catch (e) {
            console.error('Erro ao deslogar:', e);
        }
        this._currentUser = null;
        window.location.href = 'login-supabase.html';
    },
    
    /**
     * Inicializar dashboard (async - verifica auth Supabase)
     */
    async initDashboard() {
        const currentUser = await this.initAuth();
        
        if (!currentUser) return;
        
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
        await this.loadEconomias();
        
        // Configurar event listeners
        this.setupEventListeners();
    },
    
    /**
     * Carregar e renderizar economias (async - Supabase DB)
     */
    async loadEconomias(filters = null) {
        const currentUser = this.getCurrentUser();
        let economias;
        
        console.log('[Controller] loadEconomias - role:', currentUser.role, 'id:', currentUser.id);
        
        try {
            if (currentUser.role === 'gestor') {
                if (filters) {
                    economias = await Model.filterEconomias(filters);
                } else {
                    economias = await Model.getEconomias();
                }
            } else {
                // Auditor: buscar apenas as próprias economias e filtrar cliente-side
                economias = await Model.getEconomiasByUser(currentUser.id);
                if (filters && economias) {
                    economias = this._applyFiltersClientSide(economias, filters);
                }
            }
        } catch (error) {
            console.error('[Controller] Erro ao carregar economias:', error);
            View.showToast('Erro ao carregar economias do servidor', 'error');
            economias = [];
        }
        
        console.log('[Controller] economias carregadas:', (economias || []).length);
        
        if (!economias) economias = [];
        
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
        const todayISO = new Date().toISOString().split('T')[0];

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Excluir conta (para testes)
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
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

            const cancDataPTAXInput = document.getElementById('canc_dataPTAX');
            if (cancDataPTAXInput) {
                cancDataPTAXInput.setAttribute('max', todayISO);
            }
            
            // Event listeners para moeda e data (Cancelamento)
            document.getElementById('canc_moeda').addEventListener('change', () => this.handleMoedaChange('canc'));
            document.getElementById('canc_data').addEventListener('change', () => this.handleDataPagamentoChange('canc'));
            document.getElementById('canc_dataPTAX')?.addEventListener('change', () => this.handleDataChange('canc'));
            document.getElementById('canc_agio').addEventListener('input', () => this.calculateConversion('canc'));
            document.getElementById('canc_valorCancelado').addEventListener('input', () => this.calculateConversion('canc'));
            document.getElementById('canc_ptax').addEventListener('input', () => this.calculateConversion('canc'));
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

            const corrDataPTAXInput = document.getElementById('corr_dataPTAX');
            if (corrDataPTAXInput) {
                corrDataPTAXInput.setAttribute('max', todayISO);
            }
            
            // Calcular economia automaticamente
            document.getElementById('corr_valorOriginal').addEventListener('input', () => this.handleDescontoCalculation());
            document.getElementById('corr_valorCorrigido').addEventListener('input', () => View.updateEconomiaValueCorrecao());
            
            // Event listeners para desconto
            document.getElementById('corr_useDesconto').addEventListener('change', () => this.handleDescontoToggle());
            document.getElementById('corr_desconto').addEventListener('input', () => this.handleDescontoCalculation());
            
            // Event listeners para moeda e data (Correção)
            document.getElementById('corr_moeda').addEventListener('change', () => this.handleMoedaChange('corr'));
            document.getElementById('corr_data').addEventListener('change', () => this.handleDataPagamentoChange('corr'));
            document.getElementById('corr_dataPTAX')?.addEventListener('change', () => this.handleDataChange('corr'));
            document.getElementById('corr_agio').addEventListener('input', () => this.handleValorChange('corr'));
            document.getElementById('corr_ptax').addEventListener('input', () => this.handleValorChange('corr'));
        }
        
        // Filtros (apenas gestor)
        const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => this.applyFilters());
        }
        
        const btnLimparFiltros = document.getElementById('btnLimparFiltros');
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', async () => {
                View.clearFilters();
                await this.loadEconomias();
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

        // Export buttons
        const btnExportCSV = document.getElementById('btnExportCSV');
        const btnExportJSON = document.getElementById('btnExportJSON');
        if (btnExportCSV) {
            btnExportCSV.addEventListener('click', () => {
                if (View.allEconomias && View.allEconomias.length > 0) {
                    Model.exportToCSV(View.allEconomias);
                    View.showToast('Exportação CSV iniciada!', 'success');
                } else {
                    View.showToast('Nenhuma economia para exportar', 'error');
                }
            });
        }
        if (btnExportJSON) {
            btnExportJSON.addEventListener('click', () => {
                if (View.allEconomias && View.allEconomias.length > 0) {
                    Model.exportToJSON(View.allEconomias);
                    View.showToast('Exportação JSON iniciada!', 'success');
                } else {
                    View.showToast('Nenhuma economia para exportar', 'error');
                }
            });
        }

        // Fornecedor autocomplete (Cancelamento + Correção)
        this._setupFornecedorAutocomplete('canc');
        this._setupFornecedorAutocomplete('corr');
    },

    /**
     * Configurar autocomplete de fornecedor para um prefixo (canc ou corr)
     */
    _setupFornecedorAutocomplete(prefix) {
        const input = document.getElementById(`${prefix}_codigoFornecedor`);
        const dropdown = document.getElementById(`${prefix}_fornecedorDropdown`);
        const nomeHidden = document.getElementById(`${prefix}_nomeFornecedor`);
        const infoDiv = document.getElementById(`${prefix}_fornecedorInfo`);
        const nomeDisplay = document.getElementById(`${prefix}_fornecedorNomeDisplay`);
        const agioInput = document.getElementById(`${prefix}_agio`);
        const agioHint = document.getElementById(`${prefix}_agioHint`);
        if (!input || !dropdown) return;

        let debounceTimer = null;
        let selectedIndex = -1;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const query = input.value.trim();
                if (query.length < 1) {
                    dropdown.classList.remove('show');
                    return;
                }

                const results = await Model.searchFornecedores(query);
                selectedIndex = -1;

                if (results.length === 0) {
                    dropdown.innerHTML = `
                        <div class="autocomplete-item ac-empty">
                            Nenhum fornecedor encontrado para "<strong>${query}</strong>"
                        </div>`;
                } else {
                    dropdown.innerHTML = results.map((f, i) => `
                        <div class="autocomplete-item" data-index="${i}" data-codigo="${f.codigo}" data-nome="${f.nome}" data-agio="${f.agio || 0}">
                            <span class="ac-code">${f.codigo}</span>
                            <span class="ac-name">${f.nome}</span>
                            ${f.agio ? `<span class="ac-agio">Ágio: ${f.agio}%</span>` : ''}
                        </div>
                    `).join('');
                }

                dropdown.classList.add('show');

                // Click handlers for items
                dropdown.querySelectorAll('.autocomplete-item:not(.ac-new)').forEach(item => {
                    item.addEventListener('click', () => {
                        this._selectFornecedor(prefix, {
                            codigo: item.dataset.codigo,
                            nome: item.dataset.nome,
                            agio: parseFloat(item.dataset.agio) || 0
                        });
                        dropdown.classList.remove('show');
                    });
                });

            }, 200);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.autocomplete-item');
            if (!dropdown.classList.contains('show') || items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.classList.remove('show');
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    },

    /**
     * Selecionar fornecedor do autocomplete
     */
    _selectFornecedor(prefix, fornecedor) {
        const input = document.getElementById(`${prefix}_codigoFornecedor`);
        const nomeHidden = document.getElementById(`${prefix}_nomeFornecedor`);
        const infoDiv = document.getElementById(`${prefix}_fornecedorInfo`);
        const nomeDisplay = document.getElementById(`${prefix}_fornecedorNomeDisplay`);
        const agioInput = document.getElementById(`${prefix}_agio`);
        const agioHint = document.getElementById(`${prefix}_agioHint`);
        input.value = fornecedor.codigo;
        if (nomeHidden) nomeHidden.value = fornecedor.nome;

        // Mostrar nome do fornecedor
        if (infoDiv && nomeDisplay) {
            nomeDisplay.textContent = `🏢 ${fornecedor.nome}`;
            infoDiv.style.display = 'block';
        }

        // Auto-preencher ágio (editável)
        if (agioInput && fornecedor.agio) {
            agioInput.value = fornecedor.agio;
            if (agioHint) agioHint.textContent = `Ágio padrão do fornecedor: ${fornecedor.agio}%`;
        }

        // Atualizar dropdown de modal de serviço
        const modais = this._getModaisForFornecedor(fornecedor.codigo);
        this._updateModalDropdown(prefix, modais);

        // Recalcular se necessário
        if (prefix === 'canc') {
            this.calculateConversion(prefix);
        } else {
            this.handleValorChange(prefix);
        }
    },

    /**
     * Obter modais disponíveis para um fornecedor (DB cache + fallback estático)
     */
    _getModaisForFornecedor(codigo) {
        const fornecedores = Model._fornecedoresCache || [];
        const forn = fornecedores.find(f => f.codigo === String(codigo));
        if (forn && forn.modais_servico && Array.isArray(forn.modais_servico) && forn.modais_servico.length > 0) {
            return forn.modais_servico;
        }
        return Model.getModaisForCodigo(codigo);
    },

    /**
     * Atualizar dropdown de modal de serviço baseado nos modais disponíveis
     */
    _updateModalDropdown(prefix, modais) {
        const select = document.getElementById(`${prefix}_modalServico`);
        const group = document.getElementById(`${prefix}_modalServicoGroup`);
        if (!select || !group) return;

        select.innerHTML = '';

        if (!modais || modais.length === 0) {
            group.style.display = 'none';
            select.removeAttribute('required');
            return;
        }

        group.style.display = 'block';
        select.setAttribute('required', 'required');

        if (modais.length === 1) {
            select.innerHTML = `<option value="${modais[0].nome}" selected>${modais[0].nome}</option>`;
            select.disabled = true;
        } else {
            select.innerHTML = '<option value="">Selecione o modal...</option>' +
                modais.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
            select.disabled = false;
        }
    },
    
    /**
     * Buscar PTAX do BACEN
     */
    // Mapeamento de códigos ISO para códigos BACEN PTAX
    _bacenMoedaMap: {
        'USD': 'USD',
        'EUR': 'EUR',
        'GBP': 'GBP',
        'CHF': 'CHF',
        'CAD': 'CAD',
        'SEK': 'SEK',
    },

    /**
     * Regra de referência da PTAX:
     * usa a menor data entre a data selecionada e ontem.
     */
    getPTAXReferenceDate(date) {
        const [year, month, day] = date.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);

        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        yesterday.setDate(yesterday.getDate() - 1);

        return selectedDate > yesterday ? yesterday : selectedDate;
    },

    async fetchPTAX(date, moeda = 'USD', codigoFornecedor = '') {
        try {
            const bacenCodigo = this._bacenMoedaMap[moeda] || moeda;
            const referenceDate = this.getPTAXReferenceDate(date);
            
            // Formatar data para API do BACEN (MM-DD-YYYY)
            const year = referenceDate.getFullYear();
            const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
            const day = String(referenceDate.getDate()).padStart(2, '0');
            const formattedDate = `${month}-${day}-${year}`;
            
            const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${encodeURIComponent(bacenCodigo)}'&@dataCotacao='${formattedDate}'&$format=json`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Falha na API PTAX (${response.status})`);
            }
            const data = await response.json();
            
            if (Array.isArray(data.value) && data.value.length > 0) {
                // Usa a última cotação disponível do dia (não assume índice fixo).
                const ultimaCotacao = data.value[data.value.length - 1];
                const usaCotacaoCompra = String(codigoFornecedor) === '50079' || String(codigoFornecedor) === '134262';
                const cotacao = usaCotacaoCompra
                    ? (ultimaCotacao.cotacaoCompra ?? ultimaCotacao.cotacaoVenda)
                    : (ultimaCotacao.cotacaoVenda ?? ultimaCotacao.cotacaoCompra);
                return cotacao ? Number(cotacao) : null;
            } else {
                View.showToast(`Cotação PTAX não encontrada para ${moeda} nesta data. Você pode digitar o valor manualmente.`, 'warning');
                return null;
            }
        } catch (error) {
            console.error('Erro ao buscar PTAX:', error);
            View.showToast('Erro ao buscar cotação PTAX. Você pode digitar o valor manualmente.', 'warning');
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
        const dataPTAXGroup = document.getElementById(`${prefix}_dataPTAXGroup`);
        const moedaLabel = document.getElementById(`${prefix}_moedaLabel`);
        const ptaxLabel = document.getElementById(`${prefix}_ptaxLabel`);
        const dataPagamento = document.getElementById(`${prefix}_data`)?.value || '';
        const dataPTAXInput = document.getElementById(`${prefix}_dataPTAX`);
        const isForeign = moeda !== 'BRL';
        
        if (prefix === 'corr') {
            const moedaLabelOriginal = document.getElementById(`${prefix}_moedaLabelOriginal`);
            const moedaLabelCorrigido = document.getElementById(`${prefix}_moedaLabelCorrigido`);
            const moedaLabelEconomia = document.getElementById(`${prefix}_moedaLabelEconomia`);
            
            if (isForeign) {
                moedaLabelOriginal.textContent = `Valor Original (${moeda})`;
                moedaLabelCorrigido.textContent = `Valor Corrigido (${moeda})`;
                moedaLabelEconomia.textContent = `Valor da Economia (${moeda})`;
            } else {
                moedaLabelOriginal.textContent = 'Valor Original (BRL)';
                moedaLabelCorrigido.textContent = 'Valor Corrigido (BRL)';
                moedaLabelEconomia.textContent = 'Valor da Economia (BRL)';
            }
        }
        
        if (isForeign) {
            agioGroup.style.display = 'block';
            ptaxGroup.style.display = 'block';
            if (dataPTAXGroup) dataPTAXGroup.style.display = 'block';
            if (dataPTAXInput) dataPTAXInput.required = true;
            if (moedaLabel) moedaLabel.textContent = `Valor Cancelado (${moeda})`;
            if (ptaxLabel) ptaxLabel.textContent = `PTAX (${moeda})`;
            
            // Buscar PTAX se data PTAX já estiver preenchida
            if (dataPTAXInput && dataPTAXInput.value) {
                await this.handleDataChange(prefix);
            }
        } else {
            agioGroup.style.display = 'none';
            ptaxGroup.style.display = 'none';
            if (dataPTAXGroup) dataPTAXGroup.style.display = 'none';
            if (dataPTAXInput) {
                dataPTAXInput.required = false;
                dataPTAXInput.value = '';
            }
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
     * Handler para mudança da data de pagamento
     */
    async handleDataPagamentoChange(prefix) {
        const dataPagamentoInput = document.getElementById(`${prefix}_data`);
        const moeda = document.getElementById(`${prefix}_moeda`).value;

        if (moeda !== 'BRL') {
            await this.handleDataChange(prefix);
        }
    },

    /**
     * Handler para mudança de data
     */
    async handleDataChange(prefix) {
        const moeda = document.getElementById(`${prefix}_moeda`).value;
        const data = document.getElementById(`${prefix}_dataPTAX`)?.value || '';
        const codigoFornecedor = document.getElementById(`${prefix}_codigoFornecedor`)?.value || '';

        if (this.isFutureDate(data)) {
            View.showToast('Data PTAX futura não é permitida.', 'error');
            const dataPTAXInput = document.getElementById(`${prefix}_dataPTAX`);
            if (dataPTAXInput) dataPTAXInput.value = '';
            const ptaxInput = document.getElementById(`${prefix}_ptax`);
            if (ptaxInput) ptaxInput.value = '';
            return;
        }
        
        if (moeda !== 'BRL' && data) {
            const ptax = await this.fetchPTAX(data, moeda, codigoFornecedor);
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
        
        if (moeda !== 'BRL') {
            const valorMoeda = parseVal(document.getElementById(`${prefix}_valorCancelado`).value);
            const ptax = parseFloat(document.getElementById(`${prefix}_ptax`).value) || 0;
            const agio = parseVal(document.getElementById(`${prefix}_agio`).value);
            
            if (valorMoeda && ptax) {
                // Aplicar ágio: valor * (1 + agio/100)
                const valorComAgio = valorMoeda * (1 + agio / 100);
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
            const valorOriginal = parseVal(document.getElementById('corr_valorOriginal').value);
            const desconto = parseVal(document.getElementById('corr_desconto').value);
            
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
            const nomeFornecedor = document.getElementById('canc_nomeFornecedor').value || '';
            const descricaoTaxa = document.getElementById('canc_descricaoTaxa').value || '';
            const dataPagamento = document.getElementById('canc_data').value;
            const dataPTAX = document.getElementById('canc_dataPTAX')?.value || '';
            const moeda = document.getElementById('canc_moeda').value;
            const agio = parseVal(document.getElementById('canc_agio').value);
            const valorCancelado = parseVal(document.getElementById('canc_valorCancelado').value);
            const tipo = document.getElementById('canc_tipo').value;
            const modalServico = document.getElementById('canc_modalServico')?.value || '';
            const descricao = document.getElementById('canc_descricao').value;
            const arquivoInput = document.getElementById('canc_arquivo');
            
            if (!codigoFornecedor || !dataPagamento || !valorCancelado || !tipo || !descricaoTaxa) {
                View.showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            let ptax = null;
            let valorBRL = valorCancelado; // Valor padrão para BRL
            
            if (moeda !== 'BRL') {
                if (!dataPTAX) {
                    View.showToast('Preencha a Data PTAX para moeda estrangeira.', 'error');
                    return;
                }
                if (this.isFutureDate(dataPTAX)) {
                    View.showToast('Data PTAX futura não é permitida para cadastro.', 'error');
                    return;
                }
                ptax = parseFloat(document.getElementById('canc_ptax').value);
                if (!ptax) {
                    View.showToast('Aguarde o carregamento da cotação PTAX', 'error');
                    return;
                }
                // Pegar o valor BRL já calculado automaticamente
                valorBRL = parseFloat(document.getElementById('canc_valorBRL').value);
                if (!valorBRL || valorBRL <= 0) {
                    View.showToast('Erro ao calcular valor em BRL', 'error');
                    return;
                }
            }
            
            if (!arquivoInput.files || arquivoInput.files.length === 0) {
                View.showToast('É obrigatório anexar pelo menos um arquivo de prova', 'error');
                return;
            }
            
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const arquivos = [];
            
            for (let i = 0; i < arquivoInput.files.length; i++) {
                const arquivo = arquivoInput.files[i];
                
                if (!allowedTypes.includes(arquivo.type)) {
                    View.showToast(`Arquivo "${arquivo.name}" tem formato inválido. Use PDF, PNG ou JPG`, 'error');
                    return;
                }
                
                if (arquivo.size > 50 * 1024 * 1024) {
                    View.showToast(`Arquivo "${arquivo.name}" muito grande. Máximo 50MB`, 'error');
                    return;
                }
                
                // Converter para base64 para upload via Model
                try {
                    const arquivoBase64 = await Model.fileToBase64(arquivo);
                    arquivos.push({
                        nome: arquivo.name,
                        tipo: arquivo.type,
                        dados: arquivoBase64
                    });
                } catch (error) {
                    View.showToast(`Erro ao processar arquivo "${arquivo.name}": ${error.message}`, 'error');
                    return;
                }
            }
            
            const economiaData = {
                tipoEconomia: 'Cancelamento',
                codigoFornecedor,
                nomeFornecedor,
                descricaoTaxa,
                modalServico,
                data: dataPagamento,
                dataPagamento,
                dataPTAX,
                moeda,
                ptax,
                agio,
                valorCancelado: valorCancelado,
                valorBRL: valorBRL,
                tipo,
                descricao,
                arquivos
            };
            
            const result = await Model.saveEconomiaCancelamento(economiaData);
            
            if (result.success) {
                View.showToast('Economia (Cancelamento) cadastrada com sucesso!', 'success');
                View.closeCancelamentoModal();
                await this.loadEconomias();
            } else {
                View.showToast(result.message, 'error');
            }
            
        } catch (error) {
            View.showToast('Erro ao salvar economia: ' + error.message, 'error');
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
            const nomeFornecedor = document.getElementById('corr_nomeFornecedor').value || '';
            const descricaoTaxa = document.getElementById('corr_descricaoTaxa').value || '';
            const dataPagamento = document.getElementById('corr_data').value;
            const dataPTAX = document.getElementById('corr_dataPTAX')?.value || '';
            const moeda = document.getElementById('corr_moeda').value;
            const agio = parseVal(document.getElementById('corr_agio').value);
            const valorOriginal = parseVal(document.getElementById('corr_valorOriginal').value);
            const valorCorrigido = parseVal(document.getElementById('corr_valorCorrigido').value);
            const tipo = document.getElementById('corr_tipo').value;
            const modalServico = document.getElementById('corr_modalServico')?.value || '';
            const descricao = document.getElementById('corr_descricao').value;
            const arquivoInput = document.getElementById('corr_arquivo');
            
            if (!codigoFornecedor || !dataPagamento || !valorOriginal || !valorCorrigido || !tipo || !descricaoTaxa) {
                View.showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            let ptax = null;
            let valorOriginalBRL = valorOriginal;
            let valorCorrigidoBRL = valorCorrigido;
            
            if (moeda !== 'BRL') {
                if (!dataPTAX) {
                    View.showToast('Preencha a Data PTAX para moeda estrangeira.', 'error');
                    return;
                }
                if (this.isFutureDate(dataPTAX)) {
                    View.showToast('Data PTAX futura não é permitida para cadastro.', 'error');
                    return;
                }
                ptax = parseFloat(document.getElementById('corr_ptax').value);
                if (!ptax) {
                    View.showToast('Aguarde o carregamento da cotação PTAX', 'error');
                    return;
                }
                // Aplicar ágio e converter para BRL
                const fatorConversao = ptax * (1 + agio / 100);
                valorOriginalBRL = valorOriginal * fatorConversao;
                valorCorrigidoBRL = valorCorrigido * fatorConversao;
            }
            
            if (!arquivoInput.files || arquivoInput.files.length === 0) {
                View.showToast('É obrigatório anexar pelo menos um arquivo de prova', 'error');
                return;
            }
            
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const arquivos = [];
            
            for (let i = 0; i < arquivoInput.files.length; i++) {
                const arquivo = arquivoInput.files[i];
                
                if (!allowedTypes.includes(arquivo.type)) {
                    View.showToast(`Arquivo "${arquivo.name}" tem formato inválido. Use PDF, PNG ou JPG`, 'error');
                    return;
                }
                
                if (arquivo.size > 50 * 1024 * 1024) {
                    View.showToast(`Arquivo "${arquivo.name}" muito grande. Máximo 50MB`, 'error');
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
                    View.showToast(`Erro ao processar arquivo "${arquivo.name}": ${error.message}`, 'error');
                    return;
                }
            }
            
            const economiaData = {
                tipoEconomia: 'Correção',
                codigoFornecedor,
                nomeFornecedor,
                descricaoTaxa,
                modalServico,
                data: dataPagamento,
                dataPagamento,
                dataPTAX,
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
            
            const result = await Model.saveEconomiaCorrecao(economiaData);
            
            if (result.success) {
                View.showToast('Economia (Correção) cadastrada com sucesso!', 'success');
                View.closeCorrecaoModal();
                await this.loadEconomias();
            } else {
                View.showToast(result.message, 'error');
            }
            
        } catch (error) {
            View.showToast('Erro ao salvar economia: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar';
        }
    },
    
    /**
     * Aplicar filtros
     */
    /**
     * Aplicar filtros cliente-side (usado para auditores)
     */
    _applyFiltersClientSide(economias, filters) {
        return economias.filter(e => {
            if (filters.tipoEconomia && e.tipoEconomia !== filters.tipoEconomia) return false;
            if (filters.tipo && e.tipo !== filters.tipo) return false;
            if (filters.status && e.status !== filters.status) return false;
            if (filters.dataInicio && e.data < filters.dataInicio) return false;
            if (filters.dataFim && e.data > filters.dataFim) return false;
            return true;
        });
    },

    async applyFilters() {
        const filters = {
            userId: document.getElementById('filtroUsuario').value,
            tipoEconomia: document.getElementById('filtroTipoEconomia') ? document.getElementById('filtroTipoEconomia').value : '',
            tipo: document.getElementById('filtroTipo').value,
            status: document.getElementById('filtroStatus').value,
            dataInicio: document.getElementById('filtroDataInicio').value,
            dataFim: document.getElementById('filtroDataFim').value
        };
        
        await this.loadEconomias(filters);
    },
    
    /**
     * Visualizar arquivo (async - busca URL do Supabase Storage)
     */
    async viewFile(economiaId, fileIndex = 0) {
        const economia = await Model.getEconomiaById(economiaId);
        
        if (!economia) {
            View.showToast('Economia não encontrada', 'error');
            return;
        }
        
        const arquivos = economia.arquivos || [];
        if (arquivos.length === 0) {
            View.showToast('Nenhum arquivo anexado', 'error');
            return;
        }

        const arquivo = arquivos[fileIndex];
        if (!arquivo) {
            View.showToast('Arquivo não encontrado', 'error');
            return;
        }

        // Se tem URL do Storage, buscar URL atualizada
        if (arquivo.storagePath) {
            try {
                const url = await Model.getFileUrl(arquivo.storagePath);
                if (url) {
                    window.open(url, '_blank');
                    return;
                }
            } catch (err) {
                console.error('Erro ao obter URL do arquivo:', err);
            }
        }

        // Fallback para dados inline (base64) se existir
        if (arquivo.dados) {
            View.viewFile(economia, fileIndex);
            return;
        }

        View.showToast('Não foi possível abrir o arquivo', 'error');
    },
    
    /**
     * Abrir modal de aprovação (async)
     */
    async openApprovalModal(economiaId) {
        const economia = await Model.getEconomiaById(economiaId);
        
        if (!economia) {
            View.showToast('Economia não encontrada', 'error');
            return;
        }
        
        View.openApprovalModal(economia);
    },
    
    /**
     * Processar aprovação/reprovação (async)
     */
    async handleApproval(status) {
        const modal = document.getElementById('modalAprovacao');
        const economiaId = modal.getAttribute('data-economia-id');
        const observacoes = document.getElementById('observacoes').value;
        
        if (!economiaId) {
            View.showToast('Erro ao processar aprovação', 'error');
            return;
        }
        
        // Confirmar ação
        const action = status === 'Aprovado' ? 'aprovar' : 'reprovar';
        const confirmed = await View.showConfirm({
            title: `${status === 'Aprovado' ? 'Aprovar' : 'Reprovar'} Economia`,
            message: `Tem certeza que deseja ${action} esta economia?`,
            icon: status === 'Aprovado' ? 'success' : 'warning',
            confirmText: status === 'Aprovado' ? 'Aprovar' : 'Reprovar',
            danger: status !== 'Aprovado'
        });
        if (!confirmed) return;
        
        // Atualizar status
        const result = await Model.updateEconomiaStatus(economiaId, status, observacoes);
        
        if (result.success) {
            View.showToast(`Economia ${status.toLowerCase()} com sucesso!`, 'success');
            View.closeApprovalModal();
            await this.loadEconomias();
        } else {
            View.showToast(result.message, 'error');
        }
    },
    
    /**
     * Carregar detalhes de uma economia específica (async)
     */
    async loadEconomiaDetails(economiaId) {
        const economia = await Model.getEconomiaById(economiaId);
        
        if (!economia) {
            View.showToast('Economia não encontrada', 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return;
        }
        
        View.renderEconomiaDetails(economia, this.getCurrentUser().role);
    },

    /**
     * Deletar conta do usuário (para testes)
     */
    async deleteAccount() {
        const step1 = await View.showConfirm({
            title: 'Excluir Conta',
            message: 'Isso irá excluir permanentemente sua conta e todos os dados associados. Deseja continuar?',
            icon: 'danger',
            confirmText: 'Sim, excluir',
            danger: true
        });
        if (!step1) return;

        const step2 = await View.showConfirm({
            title: 'Confirmação Final',
            message: 'Esta ação NÃO pode ser desfeita. Confirma a exclusão da conta?',
            icon: 'danger',
            confirmText: 'Excluir permanentemente',
            danger: true
        });
        if (!step2) return;
        
        try {
            await SupabaseConfig.deleteAccount();
            View.showToast('Conta excluída com sucesso', 'success');
            setTimeout(() => {
                window.location.href = 'login-supabase.html';
            }, 1500);
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            View.showToast('Erro ao excluir conta: ' + error.message, 'error');
        }
    }
};
