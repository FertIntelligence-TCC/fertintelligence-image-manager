# FertIntelligence Image Manager

API Node.js, Express e MongoDB para armazenamento de imagens.

## Configuração local

Copie `.env.example` para `.env`. `MONGODB_URI` é obrigatório e secreto.
`IMAGE_MANAGER_ALLOWED_ORIGINS` aceita uma lista de origens separadas por
vírgulas.

```bash
npm ci
npm start
npm test
```

O serviço escuta em `0.0.0.0` e usa `PORT` (padrão local: `8081`). Verifique:

```bash
curl http://localhost:8081/health
```

## Render Blueprint

Em **New + > Blueprint**, conecte este repositório na branch
`m-fertilization`. Antes de aplicar, preencha manualmente `MONGODB_URI`,
declarada com `sync: false`. O Blueprint não cria banco ou armazenamento.
