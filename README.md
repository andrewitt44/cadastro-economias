# 📊 Dashboard de Economias - Sistema de Auditoria

Sistema web para controle e auditoria de economias em processos de exportação, com suporte a múltiplas moedas, conversão automática via API PTAX do Banco Central, e integração com Supabase para autenticação social (Microsoft/Google).

## 🚀 Status do Projeto

**Versão Atual:** 2.0 (Migração Supabase em andamento)
- ✅ Sistema base funcionando com LocalStorage
- ✅ Arquivos de migração Supabase criados
- ⏳ Aguardando configuração do Supabase

## 📋 Funcionalidades

### ✨ Principais Features
- **Dois tipos de economias**: Cancelamento e Correção
- **Conversão de moedas**: BRL e USD com PTAX automático do BACEN
- **Ágio configurável**: Para operações em USD
- **Desconto percentual**: Cálculo automático na correção
- **Upload de arquivos**: PDFs e imagens como comprovação
- **Filtros avançados**: Por tipo, status, data, usuário
- **Paginação**: 35 registros por página
- **Dois perfis**: Auditor (cria) e Gestor (aprova)

### 🎨 Interface
- Design responsivo baseado no sistema WEG
- Tabela com 9 colunas otimizadas
- Cards de indicadores (Total Economizado, Aprovado, Pendente)
- Modal de seleção de tipo
- Página de detalhes completa

## 🛠️ Tecnologias

### Frontend (Atual - LocalStorage)
- HTML5, CSS3, JavaScript Vanilla
- Arquitetura MVC (Model, View, Controller)
- LocalStorage para persistência
- API PTAX do Banco Central

### Backend/Database (Em Migração - Supabase)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Autenticação**: Microsoft Azure AD + Google OAuth
- **Storage**: Até 50MB por arquivo, 1GB total
- **Database**: PostgreSQL com Row Level Security

## 📁 Estrutura do Projeto

```
dashboard-economias/
├── index.html              # Login antigo (LocalStorage)
├── login-supabase.html     # 🆕 Login com Microsoft/Google
├── dashboard.html          # Dashboard principal
├── detalhes.html          # Página de detalhes
├── limpar-dados.html      # Utilitário de limpeza
├── migration-status.html  # 🆕 Status da migração
│
├── css/
│   └── style.css          # Estilos globais (970+ linhas)
│
├── js/
│   ├── model.js           # Model LocalStorage (original)
│   ├── model-localstorage.js  # Backup do model
│   ├── supabase-config.js     # 🆕 Configuração Supabase
│   ├── supabase-model.js      # 🆕 Model com Supabase
│   ├── view.js            # Camada de visualização
│   └── controller.js      # Lógica de negócio
│
├── docs/
│   ├── SUPABASE_SETUP.md        # 🆕 Guia de configuração
│   ├── MIGRATION_CHECKLIST.md   # 🆕 Checklist de migração
│   ├── README_MIGRATION.md      # 🆕 Resumo da migração
│   └── CONVERSATION_SUMMARY.md  # 🆕 Histórico completo
│
├── .env.example           # Template de variáveis
├── .gitignore            # Proteção de credenciais
└── vercel.json           # Configuração de deploy
```

## 🔧 Como Executar Localmente

### Versão Atual (LocalStorage)
1. Clone o repositório
2. Abra `index.html` com Live Server ou qualquer servidor local
3. Use credenciais demo:
   - Auditor: `auditor / 123456`
   - Gestor: `gestor / 123456`

### Versão Supabase (Em Desenvolvimento)
1. Configure o Supabase seguindo `docs/SUPABASE_SETUP.md`
2. Copie `.env.example` para `.env` e preencha as credenciais
3. Atualize `js/supabase-config.js` com suas credenciais
4. Abra `login-supabase.html` para testar

## 🌐 Deploy

### Vercel (Atual)
```bash
# Já configurado com vercel.json
vercel
```

### Variáveis de Ambiente (Supabase)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

## 📊 Funcionalidades Detalhadas

### 1. Cancelamento
- Registro de valores cancelados
- Suporte a BRL e USD
- Conversão automática com PTAX
- Ágio configurável para USD
- Valor BRL calculado automaticamente

### 2. Correção
- Valor original vs. valor corrigido
- Cálculo automático da economia
- Checkbox de desconto (0-100%)
- Quando desconto ativo, valor corrigido é calculado automaticamente
- Suporte a múltiplas moedas com conversão

### 3. Integração BACEN
- API: `olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia`
- Busca automática ao selecionar data + USD
- Usa cotação de venda (cotacaoVenda)
- Apenas dias úteis (fins de semana retornam erro)

### 4. Workflow de Aprovação
- Auditor cria economia → Status: Pendente
- Gestor aprova/reprova → Status: Aprovado/Reprovado
- Tipo BID → Auto-aprovado
- Histórico com observações

## 🔒 Segurança

### LocalStorage (Atual)
- Dados no cliente
- Sem autenticação real
- Apenas para testes/demo

### Supabase (Futuro)
- Row Level Security (RLS)
- Políticas por role (auditor/gestor)
- Autenticação OAuth2
- Storage privado
- SSL/TLS

## 📈 Roadmap

### ✅ Concluído
- [x] Sistema base MVC
- [x] Cancelamento e Correção
- [x] Integração PTAX
- [x] Paginação
- [x] Filtros
- [x] Upload de arquivos
- [x] Cálculo de desconto
- [x] Arquivos de migração Supabase

### 🔄 Em Andamento
- [ ] Configuração Supabase
- [ ] Testes de autenticação Microsoft/Google
- [ ] Migração de dados LocalStorage → Supabase

### 📅 Planejado
- [ ] Dashboard analytics
- [ ] Exportação para Excel/PDF
- [ ] Notificações por email
- [ ] Histórico de alterações
- [ ] API REST

## 👥 Perfis de Usuário

### Auditor
- ✅ Criar economias (Cancelamento/Correção)
- ✅ Ver todas as economias
- ✅ Filtrar e buscar
- ❌ Aprovar/reprovar

### Gestor
- ❌ Criar economias
- ✅ Ver todas as economias
- ✅ Filtrar por usuário (exclusivo)
- ✅ Aprovar/reprovar economias

## 🐛 Problemas Conhecidos

1. **LocalStorage**: Limite de ~10MB total
2. **Arquivos**: Limite de 5MB por arquivo (será 50MB com Supabase)
3. **PTAX**: Não funciona em fins de semana/feriados
4. **Concorrência**: Não suporta múltiplos usuários simultâneos (será resolvido com Supabase)

## 📝 Notas Importantes

### Migração Supabase
- **Não apague** o código LocalStorage ainda
- Mantenha `model-localstorage.js` como backup
- Teste completamente antes de fazer switch
- Leia `docs/SUPABASE_SETUP.md` antes de começar

### GitHub
- `.env` está no `.gitignore` (não será commitado)
- Credenciais devem ser configuradas localmente
- Use `.env.example` como template

### Dados Sensíveis
⚠️ **NUNCA commite**:
- Arquivos `.env`
- Credenciais do Supabase
- Chaves da API do Azure/Google
- Senhas ou tokens

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas sobre:
- **Configuração Supabase**: Veja `docs/SUPABASE_SETUP.md`
- **Histórico de desenvolvimento**: Veja `docs/CONVERSATION_SUMMARY.md`
- **Próximos passos**: Veja `docs/MIGRATION_CHECKLIST.md`

## 📄 Licença

Este projeto é proprietário e de uso interno.

## 🙏 Agradecimentos

- API PTAX do Banco Central do Brasil
- Supabase por fornecer tier gratuito
- Comunidade open-source

---

**Última Atualização:** Janeiro 2026  
**Status:** Em Desenvolvimento  
**Próxima Milestone:** Configuração Supabase + Auth Social
