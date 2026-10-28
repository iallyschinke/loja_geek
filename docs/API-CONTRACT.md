# Contrato da API — GeekShop Analytics

## Inicialização

- API: `http://localhost:3000/api`
- Saúde: `GET /api/health`
- Frontend local: `http://localhost:5500` ou `http://127.0.0.1:5500`
- A origem do frontend é controlada por `FRONTEND_ORIGIN` no `.env`.

## Listagens

Sem `page` e `limit`, os quatro endpoints retornam o array completo para o frontend calcular indicadores e gráficos corretamente:

- `GET /api/clientes`
- `GET /api/produtos`
- `GET /api/pedidos`
- `GET /api/itens_pedido`

### Paginação

Ao enviar `page` ou `limit`, a resposta usa o formato:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 100,
    "totalPages": 9,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

`page` começa em 1. `limit` aceita de 1 a 100 e assume 12 quando omitido junto com `page`.

### Pesquisa e filtros

- Clientes: `?busca=Ana`, `?estado=AL`, `?cidade=Arapiraca`
- Produtos: `?busca=Mouse`, `?categoria=Perifericos`, `?precoMin=100&precoMax=500`
- Pedidos: `?status=Entregue`, `?inicio=2026-05-01&fim=2026-05-31`, `?cliente_id=10`, `?busca=Entregue`
- Itens: `?pedido_id=1`, `?produto_id=10`, além de status e período do pedido relacionado
- Os filtros podem ser combinados com `page` e `limit`.

Datas devem existir no calendário e usar `AAAA-MM-DD`. Status aceitos são lidos da base de dados. `precoMin` e `precoMax` devem ser números não negativos.

## Dashboard

`GET /api/dashboard/summary?inicio=2026-05-01&fim=2026-05-31&status=Entregue`

Retorna `clientes`, `produtos`, `pedidos`, `pedidosPorStatus`, `entregues`, `faturamento` e `ticketMedio`. Faturamento é calculado apenas sobre itens de pedidos entregues no recorte selecionado; ticket médio é faturamento dividido pelo número de pedidos entregues.

## Erros

As respostas de erro seguem `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`. Parâmetros inválidos retornam HTTP 400; recursos/rotas inexistentes retornam HTTP 404; origem CORS não autorizada retorna HTTP 403; erros inesperados retornam HTTP 500.

## Compatibilidade do frontend

O frontend usa os quatro endpoints sem parâmetros de paginação para obter a base completa. A paginação das tabelas continua sendo feita localmente no navegador; isso é intencional para preservar os cálculos globais dos gráficos. Os endpoints também oferecem paginação para consumidores que precisem carregar partes da base.
