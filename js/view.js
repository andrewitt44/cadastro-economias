/**
 * VIEW - Camada de Visualização
 * Responsável por renderizar a interface e manipular o DOM
 */

const View = {
    currentPage: 1,
    itemsPerPage: 35,
    allEconomias: [],
    
    /**
     * Renderizar informações do usuário no header
     */
    renderUserInfo(user) {
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = `${user.name} (${user.role === 'gestor' ? 'Gestor' : 'Auditor'})`;
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
                    <td colspan="9" style="text-align: center; padding: 40px;">
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
            
            // Sempre usar valorEconomia que já está em BRL
            const valorExibir = parseFloat(economia.valorEconomia) || 0;
            
            const moeda = economia.moeda || 'BRL';
            
            return `
                <tr>
                    <td>${economia.tipoEconomia || 'Correção'}</td>
                    <td>${economia.tipo || '-'}</td>
                    <td>${economia.codigoFornecedor || '-'}</td>
                    <td>${economia.userName || '-'}</td>
                    <td>${Model.formatCurrency(valorExibir)}</td>
                    <td>${moeda}</td>
                    <td>${Model.formatDate(economia.data || economia.dataCriacao)}</td>
                    <td><span class="badge-status ${statusClass}">${economia.status}</span></td>
                    <td>
                        <button class="btn-icon" onclick="window.location.href='detalhes.html?id=${economia.id}'" title="Ver detalhes">
                            👁️
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
            this.populateUserFilter();
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
     * Popular filtro de usuários
     */
    populateUserFilter() {
        const filtroUsuario = document.getElementById('filtroUsuario');
        if (!filtroUsuario) return;
        
        const users = Model.getUsers();
        const auditors = users.filter(u => u.role === 'auditor');
        
        filtroUsuario.innerHTML = '<option value="">Todos os usuários</option>';
        auditors.forEach(user => {
            filtroUsuario.innerHTML += `<option value="${user.id}">${user.name}</option>`;
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
     * Exibir mensagem de erro
     */
    showError(message) {
        alert(message);
    },
    
    /**
     * Exibir mensagem de sucesso
     */
    showSuccess(message) {
        alert(message);
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
        
        // Abrir em nova aba
        const newWindow = window.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${arquivo.nome}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    embed {
                        width: 100%;
                        height: 100vh;
                    }
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
    },
    
    /**
     * Limpar filtros
     */
    clearFilters() {
        document.getElementById('filtroUsuario').value = '';
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
        const valorOriginal = parseFloat(document.getElementById('corr_valorOriginal').value) || 0;
        const valorCorrigido = parseFloat(document.getElementById('corr_valorCorrigido').value) || 0;
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
        document.getElementById('detalheFornecedor').textContent = economia.codigoFornecedor || '-';
        document.getElementById('detalheAuditor').textContent = economia.userName || '-';
        document.getElementById('detalheData').textContent = Model.formatDate(economia.data || economia.dataCriacao);
        document.getElementById('detalheMoeda').textContent = economia.moeda || 'BRL';
        document.getElementById('detalhePTAX').textContent = economia.ptax ? economia.ptax.toFixed(4) : '-';
        document.getElementById('detalheAgio').textContent = economia.agio ? `${economia.agio}%` : '0%';
        document.getElementById('detalheTipoEconomia').textContent = economia.tipoEconomia || '-';
        
        // Sempre usar valorEconomia que já está em BRL
        const valorBRLExibir = parseFloat(economia.valorEconomia) || 0;
        document.getElementById('detalheValorBRL').textContent = Model.formatCurrency(valorBRLExibir);
        
        // Seção Detalhes - Criar tabela de itens
        const detalheItens = document.getElementById('detalheItens');
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
            document.getElementById('totalUSD').textContent = moeda === 'USD' ? valor.toFixed(2) : '0.00';
        } else {
            const moeda = economia.moeda || 'BRL';
            const ptax = economia.ptax || 1;
            const valorOriginal = economia.valorOriginal;
            const valorCorrigido = economia.valorCorrigido;
            const valorEconomia = economia.valorEconomia;
            const valorOriginalBRL = economia.valorOriginalBRL || valorOriginal;
            const valorCorrigidoBRL = economia.valorCorrigidoBRL || valorCorrigido;
            const valorEconomiaBRL = economia.valorEconomiaBRL || valorEconomia;
            
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
                    <td><strong>${valorEconomia.toFixed(2)}</strong></td>
                    <td>0.00</td>
                    <td>${moeda}</td>
                    <td>${ptax.toFixed(4)}</td>
                    <td><strong>${valorEconomia.toFixed(2)}</strong></td>
                    <td><strong>${Model.formatCurrency(valorEconomiaBRL)}</strong></td>
                </tr>
            `;
            document.getElementById('totalBRL').textContent = Model.formatCurrency(valorEconomiaBRL);
            document.getElementById('totalUSD').textContent = moeda === 'USD' ? valorEconomia.toFixed(2) : '0.00';
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
        Controller.loadEconomias();
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
