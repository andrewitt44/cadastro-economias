# 📊 Dashboard de Economias

Sistema web de auditoria para controle de economias geradas em processos de exportação. Permite registrar, acompanhar e aprovar economias com suporte a múltiplas moedas e conversão automática via API do Banco Central.

## ✨ Funcionalidades

- **Dois tipos de registro**: Cancelamento e Correção de valores
- **Conversão automática**: BRL e USD com cotação PTAX do BACEN em tempo real
- **Workflow de aprovação**: Auditores criam, Gestores aprovam ou reprovam
- **Upload de comprovantes**: PDFs e imagens vinculados a cada registro
- **Filtros e paginação**: Por tipo, status, data e usuário
- **Exportação CSV**: Compatível com Excel e Power BI
- **Login com Google** ou **e-mail e senha**

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, JavaScript Vanilla (MVC) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth — Google OAuth + e-mail/senha |
| Armazenamento | Supabase Storage |
| Hospedagem | Vercel |
| Cotação cambial | API PTAX — Banco Central do Brasil |

## 👥 Perfis de Acesso

**Auditor** — cria e visualiza economias  
**Gestor** — visualiza, filtra por usuário, aprova ou reprova

## 🌐 Acesso

O sistema está hospedado no Vercel e o login é feito via Google ou cadastro com e-mail e senha, com confirmação por e-mail.

---

*Projeto proprietário de uso interno.*

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
- **Login com Google** ou **e-mail e senha**
- **Exportação CSV**: Compatível com Excel e Power BI

### 🎨 Interface
- Design responsivo baseado no sistema WEG
- Tabela com 9 colunas otimizadas
- Cards de indicadores (Total Economizado, Aprovado, Pendente)
- Modal de seleção de tipo
- Página de detalhes completa

## 🛠️ Tecnologias

### Frontend
- HTML5, CSS3, JavaScript Vanilla (sem frameworks)
- Arquitetura MVC (Model, View, Controller)
- API PTAX do Banco Central

### Backend / Infraestrutura
- **Supabase** — PostgreSQL + Auth + Storage
- **Autenticação**: Google OAuth e e-mail/senha com confirmação por e-mail
- **Storage**: Arquivos no bucket `economia-arquivos`
- **Database**: PostgreSQL com Row Level Security (RLS)
- **Hospedagem**: Vercel

## 📁 Estrutura do Projeto

```
dashboard-economias/
├── login-supabase.html     # Página de login (Google / e-mail+senha)
├── dashboard.html          # Dashboard principal
├── detalhes.html           # Página de detalhes de uma economia
├── index.html              # Redireciona para login-supabase.html
│
├── css/
│   └── style.css           # Estilos globais
│
├── js/
│   ├── supabase.js         # SDK do Supabase (local)
│   ├── supabase-config.js  # Configuração e funções de auth/storage
│   ├── model.js            # Camada de dados (CRUD no Supabase)
│   ├── view.js             # Camada de visualização
│   └── controller.js       # Lógica de negócio e eventos
│
├── package.json            # Dependência: @supabase/supabase-js
├── vercel.json             # Configuração de deploy
└── .gitignore              # Proteção de credenciais
```

## 🔧 Como Executar Localmente

1. Clone o repositório
2. Abra com Live Server (VS Code) ou qualquer servidor local
3. Acesse `login-supabase.html`
4. Faça login com Google ou cadastre-se com e-mail e senha

> As credenciais do Supabase já estão configuradas em `js/supabase-config.js`.

## 🌐 Deploy

O projeto está hospedado no Vercel com deploy automático a cada push na branch principal.

```bash
# Para redeploy manual
vercel
```

### Variáveis de Ambiente (Vercel)
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
- Desconto percentual (0–100%)
- Quando desconto ativo, valor corrigido é calculado automaticamente
- Suporte a múltiplas moedas com conversão

### 3. Integração BACEN (PTAX)
- API: `olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia`
- Busca automática ao selecionar data + moeda USD
- Usa cotação de venda (cotacaoVenda)
- Válida apenas para dias úteis

### 4. Workflow de Aprovação
- Auditor cria economia → Status: Pendente
- Gestor aprova/reprova → Status: Aprovado / Reprovado
- Tipo BID → Auto-aprovado
- Histórico com observações

### 5. Autenticação
- Login com **Google** (OAuth via Supabase)
- Login com **e-mail e senha**
- Cadastro com confirmação por e-mail
- Sessão verificada no servidor a cada acesso (evita loops com contas deletadas)
- Perfis gerenciados na tabela `profiles` do banco de dados

## 🔒 Segurança

- Row Level Security (RLS) no PostgreSQL
- Políticas de acesso por role (`auditor` / `gestor`)
- Autenticação OAuth2 (Google) e email/senha via Supabase Auth
- Storage privado com URLs assinadas
- SSL/TLS em toda comunicação
- Credenciais não expostas no repositório (`.gitignore`)

## 👥 Perfis de Usuário

### Auditor
- ✅ Criar economias (Cancelamento / Correção)
- ✅ Ver todas as economias
- ✅ Filtrar e buscar
- ❌ Aprovar / reprovar

### Gestor
- ❌ Criar economias
- ✅ Ver todas as economias
- ✅ Filtrar por usuário (exclusivo)
- ✅ Aprovar / reprovar economias

## ⚠️ Limitações Conhecidas

- **PTAX**: Não disponível em fins de semana e feriados bancários
- **Upload**: Limite definido pelo plano do Supabase Storage

## 📄 Licença

Este projeto é proprietário e de uso interno.

---

**Última Atualização:** Março 2026  
**Status:** Em desenvolvimento.