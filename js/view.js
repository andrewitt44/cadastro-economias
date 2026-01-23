/**
 * VIEW - Camada de Visualização
 * Responsável por renderizar a interface e manipular o DOM
 */

const View = {
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
     * Renderizar lista de economias
     */
    renderEconomias(economias, userRole) {
        const container = document.getElementById('listaEconomias');
        
        if (!container) return;
        
        if (economias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Nenhuma economia cadastrada</h3>
                    <p>Clique em "Nova Economia" para começar</p>
                </div>
            `;
            return;
        }
        
        // Ordenar por data de criação (mais recentes primeiro)
        economias.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        
        container.innerHTML = economias.map(economia => {
            const statusClass = economia.status === 'Aprovado' ? 'status-aprovado' :
                              economia.status === 'Pendente' ? 'status-pendente' :
                              'status-reprovado';
            
            const canApprove = userRole === 'gestor' && economia.status === 'Pendente';
            
            // Gerar botões para cada arquivo
            const arquivos = economia.arquivos || [];
            const arquivosButtons = arquivos.map((arquivo, index) => 
                `<button class="btn btn-secondary btn-small" onclick="Controller.viewFile('${economia.id}', ${index})">
                    📎 ${arquivo.nome}
                </button>`
            ).join('');
            
            return `
                <div class="economia-card" data-id="${economia.id}">
                    <div class="economia-header">
                        <span class="economia-tipo">${economia.tipo}</span>
                        <span class="economia-status ${statusClass}">${economia.status}</span>
                    </div>
                    
                    <div class="economia-valores">
                        <p><strong>Valor Original:</strong> ${Model.formatCurrency(economia.valorOriginal)}</p>
                        <p><strong>Valor Corrigido:</strong> ${Model.formatCurrency(economia.valorCorrigido)}</p>
                        <div class="valor-economia">${Model.formatCurrency(economia.valorEconomia)}</div>
                    </div>
                    
                    ${economia.descricao ? `<p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">${economia.descricao}</p>` : ''}
                    
                    <div class="economia-info">
                        ${economia.codigoFornecedor ? `<p><strong>Fornecedor:</strong> ${economia.codigoFornecedor}</p>` : ''}
                        <p><strong>Cadastrado por:</strong> ${economia.userName}</p>
                        <p><strong>Data:</strong> ${Model.formatDate(economia.dataCriacao)}</p>
                        <p><strong>Arquivos anexados:</strong> ${arquivos.length}</p>
                        ${economia.observacoes ? `<p><strong>Observações:</strong> ${economia.observacoes}</p>` : ''}
                    </div>
                    
                    <div class="economia-actions">
                        ${arquivosButtons}
                        ${canApprove ? `<button class="btn btn-primary btn-small" onclick="Controller.openApprovalModal('${economia.id}')">Aprovar/Reprovar</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Mostrar filtros de gestor
     */
    showGestorFilters() {
        const filtrosGestor = document.getElementById('filtrosGestor');
        if (filtrosGestor) {
            filtrosGestor.style.display = 'flex';
            this.populateUserFilter();
        }
    },
    
    /**
     * Ocultar filtros de gestor
     */
    hideGestorFilters() {
        const filtrosGestor = document.getElementById('filtrosGestor');
        if (filtrosGestor) {
            filtrosGestor.style.display = 'none';
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
    }
};
