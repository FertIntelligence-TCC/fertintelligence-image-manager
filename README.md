# FertIntelligence Image Manager

API Node.js, Express e MongoDB para armazenamento de imagens.

## Configuração local

Copie `.env.example` para `.env`. `MONGODB_URI` é obrigatório e secreto.
`CORS_ALLOWED_ORIGINS` aceita uma lista de origens HTTP(S) separadas por
vírgulas. Espaços, duplicatas e uma barra final são normalizados; `*` é
rejeitado. Requisições sem o header `Origin` continuam permitidas para health
checks e integrações servidor-servidor.

```bash
npm ci
npm start
npm test
```

O serviço escuta em `0.0.0.0` e usa `PORT` (padrão local: `8081`). Verifique:

```bash
curl http://localhost:8081/health
```

Exemplo de preflight:

```bash
curl -i -X OPTIONS \
  -H 'Origin: https://fertintelligence-client.onrender.com' \
  -H 'Access-Control-Request-Method: GET' \
  http://localhost:8081/get/507f1f77bcf86cd799439011
```

## Render Blueprint

Em **New + > Blueprint**, conecte este repositório na branch
`m-fertilization`. Antes de aplicar, preencha manualmente `MONGODB_URI`,
declarada com `sync: false`. O Blueprint não cria banco ou armazenamento.
