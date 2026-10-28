import { CONFIG } from './config.js';

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function unwrapRecords(value, name) {
  // Os endpoints sem paginação retornam arrays. Também aceitamos envelopes {data:[]}.
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) {
    if (value.pagination && value.pagination.total > value.data.length) {
      throw new Error(
        `A API de ${name} retornou somente uma página. O frontend precisa dos dados completos para calcular os gráficos.`
      );
    }
    return value.data;
  }
  throw new Error(`Formato de resposta inválido para ${name}.`);
}

export async function loadData() {
  const names = ['clientes', 'produtos', 'pedidos', 'itens_pedido'];
  const paths = CONFIG.dataSource === 'mock'
    ? names.map((name) => `./data/${name}.json`)
    : names.map((name) => `${CONFIG.apiBaseUrl}/${name}`);

  const values = await Promise.all(paths.map(get));
  return Object.fromEntries(
    names.map((name, index) => [name, unwrapRecords(values[index], name)])
  );
}
