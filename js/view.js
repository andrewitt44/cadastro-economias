/**
 * VIEW - Camada de Visualização
 * Responsável por renderizar a interface e manipular o DOM
 */

const View = {
    currentPage: 1,
    itemsPerPage: 35,
    allEconomias: [],
    
    /**
     * Renderizar informações do usuário no header (com avatar)
     */
    renderUserInfo(user) {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (userName) userName.textContent = user.name || 'Usuário';
        if (userEmail) userEmail.textContent = user.email || '';

        if (userAvatar && user.avatar) {
            const img = document.createElement('img');
            img.src = user.avatar;
            img.alt = user.name || 'Avatar';
            img.className = 'user-avatar';
            img.onerror = () => {
                // Fallback se a imagem não carregar
                const placeholder = document.createElement('div');
                placeholder.className = 'user-avatar-placeholder';
                placeholder.textContent = (user.name || '?').charAt(0).toUpperCase();
                img.replaceWith(placeholder);
            };
            userAvatar.replaceWith(img);
        } else if (userAvatar) {
            userAvatar.textContent = (user.name || '?').charAt(0).toUpperCase();
        }
    },
    
    /**
     * Renderizar indicadores de totais
     */
    renderIndicators(totals) {
        const totalEconomizadoEl = document.getElementById('totalEconomizado');
        const totalAprovadoEl = document.getElementById('totalAprovado');
        const totalPendenteEl = document.getElementById('totalPendente');
        
        if (totalEconomizadoEl) {
            totalEconomizadoEl.textContent = Model.formatCurrency(totals.totalEconomizado);
        }
        
        if (totalAprovadoEl) {
            totalAprovadoEl.textContent = Model.formatCurrency(totals.totalAprovado);
        }
        
        if (totalPendenteEl) {
            totalPendenteEl.textContent = Model.formatCurrency(totals.totalPendente);
        }
    },
    
    /**
     * Renderizar lista de economias em formato de tabela
     */
    renderEconomias(economias, userRole) {
        const container = document.getElementById('listaEconomias');
        
        if (!container) return;
        
        // Armazenar todas as economias
        this.allEconomias = economias;
        
        if (economias.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px;">
                        <h3>Nenhuma economia cadastrada</h3>
                        <p>Clique em "Nova Economia" para começar</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ordenar por data de criação (mais recentes primeiro)
        economias.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        
        // Calcular paginação
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedEconomias = economias.slice(startIndex, endIndex);
        
        container.innerHTML = paginatedEconomias.map(economia => {
            const statusClass = economia.status === 'Aprovado' ? 'badge-aprovado' :
                              economia.status === 'Pendente' ? 'badge-pendente' :
                              economia.status === 'Em Andamento' ? 'badge-andamento' :
                              economia.status === 'Concluído' ? 'badge-concluido' :
                              'badge-reprovado';
            
            const canApprove = userRole === 'gestor' && economia.status === 'Pendente';
            
            // Usar valorEconomiaBRL para exibição no dashboard (sempre em BRL)
            let valorExibir = 0;
            if (economia.tipoEconomia === 'Cancelamento') {
                valorExibir = parseFloat(economia.valorEconomiaBRL) || parseFloat(economia.valorBRL) || parseFloat(economia.valorCancelado) || 0;
            } else {
                valorExibir = parseFloat(economia.valorEconomiaBRL) || parseFloat(economia.valorEconomia) || 0;
            }
            
            const moeda = economia.moeda || 'BRL';
            
            return `
                <tr>
                    <td>${economia.tipoEconomia || 'Correção'}</td>
                    <td>${economia.tipo || '-'}</td>
                    <td title="${economia.codigoFornecedor || ''}">${economia.nomeFornecedor || economia.codigoFornecedor || '-'}</td>
                    <td>${economia.modalServico || '-'}</td>
                    <td>${economia.userName || '-'}</td>
                    <td>${Model.formatCurrency(valorExibir)}</td>
                    <td>${moeda}</td>
                    <td>${Model.formatDate(economia.data || economia.dataCriacao)}</td>
                    <td><span class="badge-status ${statusClass}">${economia.status}</span></td>
                    <td>
                        <button class="btn-icon" onclick="window.location.href='detalhes.html?id=${economia.id}'" title="Ver detalhes">
                            ✏️
                        </button>
                        ${canApprove ? `<button class="btn-icon" onclick="Controller.openApprovalModal('${economia.id}')" title="Aprovar/Reprovar">✓</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    /**
     * Configurar paginação
     */
    setupPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const currentPageSpan = document.getElementById('currentPage');
        const totalPagesSpan = document.getElementById('totalPages');
        const tableInfo = document.getElementById('tableInfo');
        
        if (currentPageSpan) currentPageSpan.textContent = this.currentPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
        
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        
        if (tableInfo) {
            tableInfo.textContent = `Registros ${startItem}-${endItem} de ${totalItems}`;
        }
        
        // Habilitar/desabilitar botões
        const btnFirstPage = document.getElementById('btnFirstPage');
        const btnPrevPage = document.getElementById('btnPrevPage');
        const btnNextPage = document.getElementById('btnNextPage');
        const btnLastPage = document.getElementById('btnLastPage');
        
        if (btnFirstPage) btnFirstPage.disabled = this.currentPage === 1;
        if (btnPrevPage) btnPrevPage.disabled = this.currentPage === 1;
        if (btnNextPage) btnNextPage.disabled = this.currentPage === totalPages || totalPages === 0;
        if (btnLastPage) btnLastPage.disabled = this.currentPage === totalPages || totalPages === 0;
    },
    
    /**
     * Mostrar filtros de gestor
     */
    showGestorFilters() {
        // Mostrar filtro de usuários apenas para gestor
        const filtroUsuario = document.getElementById('filtroUsuario');
        if (filtroUsuario) {
            filtroUsuario.style.display = 'block';
            this.populateUserFilter(); // async - carrega em background
        }
    },
    
    /**
     * Ocultar filtros de gestor
     */
    hideGestorFilters() {
        // Ocultar apenas o filtro de usuários para auditores
        const filtroUsuario = document.getElementById('filtroUsuario');
        if (filtroUsuario) {
            filtroUsuario.style.display = 'none';
        }
    },
    
    /**
     * Mostrar botão Nova Economia
     */
    showNovaEconomiaButton() {
        const btnNovaEconomia = document.getElementById('btnNovaEconomia');
        if (btnNovaEconomia) {
            btnNovaEconomia.style.display = 'inline-flex';
        }
    },
    
    /**
     * Ocultar botão Nova Economia
     */
    hideNovaEconomiaButton() {
        const btnNovaEconomia = document.getElementById('btnNovaEconomia');
        if (btnNovaEconomia) {
            btnNovaEconomia.style.display = 'none';
        }
    },
    
    /**
     * Popular filtro de usuários (busca da tabela profiles via Model)
     */
    async populateUserFilter() {
        const filtroUsuario = document.getElementById('filtroUsuario');
        if (!filtroUsuario) return;
        
        // Buscar usuários do Supabase
        const users = await Model.getAllUsers();
        
        filtroUsuario.innerHTML = '<option value="">Todos os usuários</option>';
        users.forEach(u => {
            filtroUsuario.innerHTML += `<option value="${u.id}">${u.name || u.email}</option>`;
        });
    },
    
    /**
     * Abrir modal de nova economia
     */
    openEconomiaModal() {
        const modal = document.getElementById('modalEconomia');
        const form = document.getElementById('formEconomia');
        
        if (modal && form) {
            document.getElementById('modalTitle').textContent = 'Nova Economia';
            form.reset();
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Fechar modal de economia
     */
    closeEconomiaModal() {
        const modal = document.getElementById('modalEconomia');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Abrir modal de aprovação
     */
    openApprovalModal(economia) {
        const modal = document.getElementById('modalAprovacao');
        const detalhesDiv = document.getElementById('detalhesEconomia');
        
        if (modal && detalhesDiv) {
            const arquivos = economia.arquivos || [];
            const arquivosList = arquivos.map((arq, idx) => 
                `<a href="#" onclick="Controller.viewFile('${economia.id}', ${idx}); return false;" style="display: block; margin: 4px 0;">📎 ${arq.nome}</a>`
            ).join('');
            
            detalhesDiv.innerHTML = `
                <div class="economia-valores mb-16">
                    <p><strong>Tipo:</strong> ${economia.tipo}</p>
                    ${economia.codigoFornecedor ? `<p><strong>Fornecedor:</strong> ${economia.codigoFornecedor}</p>` : ''}
                    <p><strong>Valor Original:</strong> ${Model.formatCurrency(economia.valorOriginal)}</p>
                    <p><strong>Valor Corrigido:</strong> ${Model.formatCurrency(economia.valorCorrigido)}</p>
                    <p><strong>Economia:</strong> ${Model.formatCurrency(economia.valorEconomia)}</p>
                    <p><strong>Cadastrado por:</strong> ${economia.userName}</p>
                    <p><strong>Data:</strong> ${Model.formatDateTime(economia.dataCriacao)}</p>
                    ${economia.descricao ? `<p><strong>Descrição:</strong> ${economia.descricao}</p>` : ''}
                    ${arquivos.length > 0 ? `<p><strong>Arquivos anexados:</strong><br>${arquivosList}</p>` : ''}
                </div>
            `;
            
            // Armazenar ID da economia no modal
            modal.setAttribute('data-economia-id', economia.id);
            
            // Limpar observações
            document.getElementById('observacoes').value = '';
            
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Fechar modal de aprovação
     */
    closeApprovalModal() {
        const modal = document.getElementById('modalAprovacao');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Mostrar toast de notificação
     */
    showToast(message, type = 'error') {
        // Criar container se não existir
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = { success: '✓', error: '✕', warning: '⚠' };
        const icon = icons[type] || icons.error;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        container.appendChild(toast);

        // Fechar ao clicar
        toast.addEventListener('click', () => toast.remove());

        // Auto-remover após 4s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Mostrar diálogo de confirmação bonito (substitui confirm() nativo)
     * @param {Object} options
     * @param {string} options.title - Título do diálogo
     * @param {string} options.message - Mensagem/descrição
     * @param {string} [options.icon='warning'] - Tipo do ícone: warning, danger, info, success
     * @param {string} [options.confirmText='Confirmar'] - Texto do botão de confirmar
     * @param {string} [options.cancelText='Cancelar'] - Texto do botão de cancelar
     * @param {boolean} [options.danger=false] - Se true, botão confirmar fica vermelho
     * @returns {Promise<boolean>} true se confirmou, false se cancelou
     */
    showConfirm({ title, message, icon = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false }) {
        return new Promise((resolve) => {
            const iconMap = {
                warning: '⚠️',
                danger: '🗑️',
                info: 'ℹ️',
                success: '✅'
            };

            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-icon confirm-icon-${icon}">${iconMap[icon] || iconMap.warning}</div>
                    <div class="confirm-body">
                        <h3>${title}</h3>
                        <p>${message}</p>
                    </div>
                    <div class="confirm-actions">
                        <button class="btn confirm-btn-cancel">${cancelText}</button>
                        <button class="btn ${danger ? 'confirm-btn-danger' : 'confirm-btn-confirm'}">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cleanup = (result) => {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.15s';
                setTimeout(() => overlay.remove(), 150);
                resolve(result);
            };

            // Botão cancelar
            overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => cleanup(false));

            // Botão confirmar
            overlay.querySelector(`.${danger ? 'confirm-btn-danger' : 'confirm-btn-confirm'}`).addEventListener('click', () => cleanup(true));

            // Fechar ao clicar no fundo
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(false);
            });

            // Fechar com Escape
            const onKey = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', onKey);
                    cleanup(false);
                }
            };
            document.addEventListener('keydown', onKey);

            // Focar no botão de cancelar para acessibilidade
            setTimeout(() => overlay.querySelector('.confirm-btn-cancel').focus(), 100);
        });
    },
    
    /**
     * Exibir mensagem de erro (compat)
     */
    showError(message) {
        this.showToast(message, 'error');
    },
    
    /**
     * Exibir mensagem de sucesso (compat)
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    },
    
    /**
     * Calcular e atualizar valor da economia no formulário
     */
    updateEconomiaValue() {
        const valorOriginal = parseFloat(document.getElementById('valorOriginal').value) || 0;
        const valorCorrigido = parseFloat(document.getElementById('valorCorrigido').value) || 0;
        const valorEconomia = valorOriginal - valorCorrigido;
        
        document.getElementById('valorEconomia').value = valorEconomia.toFixed(2);
    },
    
    /**
     * Visualizar arquivo em nova aba
     */
    viewFile(economia, fileIndex = 0) {
        const arquivos = economia.arquivos || [];
        
        if (arquivos.length === 0) {
            this.showError('Nenhum arquivo anexado');
            return;
        }
        
        const arquivo = arquivos[fileIndex];
        
        if (!arquivo) {
            this.showError('Arquivo não encontrado');
            return;
        }
        
        // Se tem URL do Storage, abrir diretamente
        if (arquivo.url) {
            window.open(arquivo.url, '_blank');
            return;
        }

        // Fallback para dados base64 (compatibilidade)
        if (arquivo.dados) {
            const newWindow = window.open();
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${arquivo.nome}</title>
                    <style>
                        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                        img { max-width: 100%; height: auto; }
                        embed { width: 100%; height: 100vh; }
                    </style>
                </head>
                <body>
                    <h2>${arquivo.nome}</h2>
                    ${arquivo.dados.startsWith('data:application/pdf') ? 
                        `<embed src="${arquivo.dados}" type="application/pdf">` :
                        `<img src="${arquivo.dados}" alt="${arquivo.nome}">`
                    }
                </body>
                </html>
            `);
            return;
        }

        this.showError('Não foi possível abrir o arquivo');
    },
    
    /**
     * Limpar filtros
     */
    clearFilters() {
        document.getElementById('filtroUsuario').value = '';
        const filtroTipoEconomia = document.getElementById('filtroTipoEconomia');
        if (filtroTipoEconomia) filtroTipoEconomia.value = '';
        document.getElementById('filtroTipo').value = '';
        document.getElementById('filtroStatus').value = '';
        document.getElementById('filtroDataInicio').value = '';
        document.getElementById('filtroDataFim').value = '';
    },
    
    /**
     * Abrir modal de seleção de tipo
     */
    openTipoModal() {
        const modal = document.getElementById('modalTipoEconomia');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Fechar modal de seleção de tipo
     */
    closeTipoModal() {
        const modal = document.getElementById('modalTipoEconomia');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Abrir modal de cancelamento
     */
    openCancelamentoModal() {
        const modal = document.getElementById('modalCancelamento');
        const form = document.getElementById('formCancelamento');
        
        if (modal && form) {
            form.reset();
            // Limpar badge do fornecedor
            const infoDiv = document.getElementById('canc_fornecedorInfo');
            const nomeDisplay = document.getElementById('canc_fornecedorNomeDisplay');
            const nomeHidden = document.getElementById('canc_nomeFornecedor');
            const agioHint = document.getElementById('canc_agioHint');
            if (infoDiv) infoDiv.style.display = 'none';
            if (nomeDisplay) nomeDisplay.textContent = '';
            if (nomeHidden) nomeHidden.value = '';
            if (agioHint) agioHint.textContent = '';
            // Resetar modal de serviço
            const cancModalGroup = document.getElementById('canc_modalServicoGroup');
            const cancModalSelect = document.getElementById('canc_modalServico');
            if (cancModalGroup) cancModalGroup.style.display = 'none';
            if (cancModalSelect) { cancModalSelect.innerHTML = '<option value="">Selecione o fornecedor primeiro...</option>'; cancModalSelect.disabled = false; }
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Fechar modal de cancelamento
     */
    closeCancelamentoModal() {
        const modal = document.getElementById('modalCancelamento');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Abrir modal de correção
     */
    openCorrecaoModal() {
        const modal = document.getElementById('modalCorrecao');
        const form = document.getElementById('formCorrecao');
        
        if (modal && form) {
            form.reset();
            // Limpar badge do fornecedor
            const infoDiv = document.getElementById('corr_fornecedorInfo');
            const nomeDisplay = document.getElementById('corr_fornecedorNomeDisplay');
            const nomeHidden = document.getElementById('corr_nomeFornecedor');
            const agioHint = document.getElementById('corr_agioHint');
            if (infoDiv) infoDiv.style.display = 'none';
            if (nomeDisplay) nomeDisplay.textContent = '';
            if (nomeHidden) nomeHidden.value = '';
            if (agioHint) agioHint.textContent = '';
            // Resetar modal de serviço
            const corrModalGroup = document.getElementById('corr_modalServicoGroup');
            const corrModalSelect = document.getElementById('corr_modalServico');
            if (corrModalGroup) corrModalGroup.style.display = 'none';
            if (corrModalSelect) { corrModalSelect.innerHTML = '<option value="">Selecione o fornecedor primeiro...</option>'; corrModalSelect.disabled = false; }
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Fechar modal de correção
     */
    closeCorrecaoModal() {
        const modal = document.getElementById('modalCorrecao');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Calcular e atualizar valor da economia no formulário de correção
     */
    updateEconomiaValueCorrecao() {
        const parseVal = v => parseFloat(String(v || '').replace(',', '.')) || 0;
        const valorOriginal = parseVal(document.getElementById('corr_valorOriginal').value);
        const valorCorrigido = parseVal(document.getElementById('corr_valorCorrigido').value);
        const valorEconomia = valorOriginal - valorCorrigido;
        
        document.getElementById('corr_valorEconomia').value = valorEconomia.toFixed(2);
    },
    
    /**
     * Renderizar detalhes de uma economia
     */
    renderEconomiaDetails(economia, userRole) {
        // Atualizar título e código
        document.getElementById('detalheTitulo').textContent = 'Detalhes da Economia';
        
        // Botões de ação (apenas para gestor)
        const actionsDiv = document.getElementById('detalheActions');
        if (userRole === 'gestor' && economia.status === 'Pendente') {
            actionsDiv.innerHTML = `
                <button class="btn btn-success" onclick="Controller.handleApproval('Aprovado')">Aprovar</button>
                <button class="btn btn-danger" onclick="Controller.handleApproval('Reprovado')">Reprovar</button>
            `;
        } else {
            actionsDiv.innerHTML = '';
        }
        
        // Seção Cotação
        const fornecedorDisplay = economia.nomeFornecedor 
            ? `${economia.nomeFornecedor} (${economia.codigoFornecedor})`
            : economia.codigoFornecedor || '-';
        document.getElementById('detalheFornecedor').textContent = fornecedorDisplay;
        document.getElementById('detalheAuditor').textContent = economia.userName || '-';
        document.getElementById('detalheData').textContent = Model.formatDate(economia.data || economia.dataCriacao);
        document.getElementById('detalheMoeda').textContent = economia.moeda || 'BRL';
        document.getElementById('detalhePTAX').textContent = economia.ptax ? economia.ptax.toFixed(4) : '-';
        document.getElementById('detalheAgio').textContent = economia.agio ? `${economia.agio}%` : '0%';
        document.getElementById('detalheTipoEconomia').textContent = economia.tipoEconomia || '-';
        const detalheModalServico = document.getElementById('detalheModalServico');
        if (detalheModalServico) detalheModalServico.textContent = economia.modalServico || '-';
        
        // Usar valorEconomiaBRL para o header de detalhes
        let valorBRLExibir = 0;
        if (economia.tipoEconomia === 'Cancelamento') {
            valorBRLExibir = parseFloat(economia.valorEconomiaBRL) || parseFloat(economia.valorBRL) || parseFloat(economia.valorCancelado) || 0;
        } else {
            valorBRLExibir = parseFloat(economia.valorEconomiaBRL) || parseFloat(economia.valorEconomia) || 0;
        }
        document.getElementById('detalheValorBRL').textContent = Model.formatCurrency(valorBRLExibir);
        
        // Seção Detalhes - Criar tabela de itens
        const detalheItens = document.getElementById('detalheItens');
        const totalMoedaLabel = document.getElementById('totalMoedaLabel');
        if (totalMoedaLabel) totalMoedaLabel.textContent = economia.moeda || 'BRL';
        if (economia.tipoEconomia === 'Cancelamento') {
            const moeda = economia.moeda || 'BRL';
            const ptax = economia.ptax || 1;
            const valor = economia.valorCancelado;
            const valorBRL = economia.valorBRL || valor;
            
            detalheItens.innerHTML = `
                <tr>
                    <td>Valor Cancelado</td>
                    <td>${valor.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>${moeda}</td>
                    <td>${ptax.toFixed(4)}</td>
                    <td>${valor.toFixed(2)}</td>
                    <td>${Model.formatCurrency(valorBRL)}</td>
                </tr>
            `;
            document.getElementById('totalBRL').textContent = Model.formatCurrency(valorBRL);
            document.getElementById('totalUSD').textContent = moeda !== 'BRL' ? valor.toFixed(2) : '0.00';
        } else {
            const moeda = economia.moeda || 'BRL';
            const ptax = economia.ptax || 1;
            const valorOriginal = economia.valorOriginal;
            const valorCorrigido = economia.valorCorrigido;
            // Calcular economia na moeda original a partir dos valores originais
            const economiaMoedaOriginal = valorOriginal - valorCorrigido;
            const valorOriginalBRL = economia.valorOriginalBRL || valorOriginal;
            const valorCorrigidoBRL = economia.valorCorrigidoBRL || valorCorrigido;
            const valorEconomiaBRL = valorOriginalBRL - valorCorrigidoBRL;
            
            detalheItens.innerHTML = `
                <tr>
                    <td>Valor Original</td>
                    <td>${valorOriginal.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>${moeda}</td>
                    <td>${ptax.toFixed(4)}</td>
                    <td>${valorOriginal.toFixed(2)}</td>
                    <td>${Model.formatCurrency(valorOriginalBRL)}</td>
                </tr>
                <tr>
                    <td>Valor Corrigido</td>
                    <td>${valorCorrigido.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>${moeda}</td>
                    <td>${ptax.toFixed(4)}</td>
                    <td>${valorCorrigido.toFixed(2)}</td>
                    <td>${Model.formatCurrency(valorCorrigidoBRL)}</td>
                </tr>
                <tr style="background-color: #d1fae5;">
                    <td><strong>Economia</strong></td>
                    <td><strong>${economiaMoedaOriginal.toFixed(2)}</strong></td>
                    <td>0.00</td>
                    <td>${moeda}</td>
                    <td>${ptax.toFixed(4)}</td>
                    <td><strong>${economiaMoedaOriginal.toFixed(2)}</strong></td>
                    <td><strong>${Model.formatCurrency(valorEconomiaBRL)}</strong></td>
                </tr>
            `;
            document.getElementById('totalBRL').textContent = Model.formatCurrency(valorEconomiaBRL);
            document.getElementById('totalUSD').textContent = moeda !== 'BRL' ? economiaMoedaOriginal.toFixed(2) : '0.00';
        }
        
        // Descrição
        const descricaoSection = document.getElementById('descricaoSection');
        const detalheDescricao = document.getElementById('detalheDescricao');
        
        if (economia.descricao && economia.descricao.trim() !== '') {
            if (descricaoSection) descricaoSection.style.display = 'block';
            if (detalheDescricao) detalheDescricao.textContent = economia.descricao;
        } else {
            if (descricaoSection) descricaoSection.style.display = 'none';
        }
        
        // Observações
        if (economia.observacoes && economia.observacoes.trim() !== '') {
            document.getElementById('observacoesSection').style.display = 'block';
            document.getElementById('detalheObservacoes').textContent = economia.observacoes;
        } else {
            document.getElementById('observacoesSection').style.display = 'none';
        }
        
        // Arquivos Anexados
        const arquivosDiv = document.getElementById('detalheArquivos');
        const arquivos = economia.arquivos || [];
        
        if (arquivos.length > 0) {
            arquivosDiv.innerHTML = arquivos.map((arquivo, index) => `
                <a href="#" class="arquivo-item" onclick="Controller.viewFile('${economia.id}', ${index}); return false;">
                    📎 ${arquivo.nome}
                </a>
            `).join('');
        } else {
            arquivosDiv.innerHTML = '<p style="color: var(--text-secondary);">Nenhum arquivo anexado</p>';
        }
    },
    
    /**
     * Paginação - Ir para página
     */
    goToPage(page) {
        this.currentPage = page;
        Controller.loadEconomias(); // async mas não precisamos aguardar
    },
    
    /**
     * Paginação - Página anterior
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            Controller.loadEconomias();
        }
    },
    
    /**
     * Paginação - Próxima página
     */
    nextPage() {
        const totalPages = Math.ceil(this.allEconomias.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            Controller.loadEconomias();
        }
    },
    
    /**
     * Paginação - Última página
     */
    goToLastPage() {
        const totalPages = Math.ceil(this.allEconomias.length / this.itemsPerPage);
        this.currentPage = totalPages;
        Controller.loadEconomias();
    }
};
