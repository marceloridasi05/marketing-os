# Google Search Console - Setup Guide

## 1. Configuração de Variáveis de Ambiente

Para usar Google Search Console, você precisa configurar as credenciais OAuth do Google.

### Passos:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Ative a API "Google Search Console API"
4. Crie credenciais OAuth 2.0:
   - Tipo: Aplicação Web
   - URIs autorizados (JavaScript):
     - `http://localhost:3000`
     - `https://marketing-os-production-dadb.up.railway.app` (sua URL de produção)
   - URIs de redirecionamento autorizados:
     - `http://localhost:3000/gsc-callback`
     - `https://marketing-os-production-dadb.up.railway.app/gsc-callback`

5. Copie o Client ID e Client Secret

### Variáveis de Ambiente (.env):

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/gsc-callback  # ou sua URL de produção
```

## 2. Usar o Componente de Conexão

No seu componente/página, importe e use `GscConnect`:

```tsx
import { GscConnect } from '../components/GscConnect';

export function MyPage() {
  return (
    <GscConnect onConnected={() => {
      // Recarregar dados após conexão bem-sucedida
      fetchGscData();
    }} />
  );
}
```

## 3. Fluxo de Autenticação

1. Usuário clica em "Conectar com Google"
2. Nova aba abre com formulário de consentimento do Google
3. Usuário autoriza o acesso
4. Google redireciona para `/gsc-callback` com código de autorização
5. Backend troca o código por um token de acesso
6. Token é armazenado no banco de dados (`apiCredentials` table)
7. Nova aba se fecha automaticamente
8. Frontend volta ao normal e pode sincronizar dados

## 4. Endpoints Disponíveis

### OAuth
- `POST /api/gsc/oauth/authorize?siteId=X` - Obter URL de autorização
- `POST /api/gsc/oauth/callback?siteId=X&code=Y` - Trocar código por token

### Propriedades
- `GET /api/gsc/properties?siteId=X` - Listar propriedades conectadas
- `POST /api/gsc/properties?siteId=X` - Registrar nova propriedade

### Dados
- `POST /api/gsc/sync?siteId=X&propertyId=Y` - Sincronizar dados do GSC
- `GET /api/gsc/queries?siteId=X&propertyId=Y` - Listar queries
- `GET /api/gsc/pages?siteId=X&propertyId=Y` - Listar páginas

### Insights
- `GET /api/gsc/insights?siteId=X` - Listar insights de otimização

## 5. Banco de Dados

Os tokens são armazenados em:
- Tabela: `api_credentials`
- Campos: `accessToken`, `refreshToken`, `expiresAt`, `scope`

Os dados são armazenados em:
- Tabela: `gsc_properties` - propriedades do GSC
- Tabela: `gsc_metrics` - queries e páginas com métricas
- Tabela: `gsc_insights` - insights de otimização
