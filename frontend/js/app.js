import { loadData } from "./dataService.js";
import { CONFIG } from "./config.js";
import {
  money,
  num,
  normalize,
  dateBR,
  sum,
  group,
  buildRows,
  delivered,
  selectRows,
  monthly,
  productStats,
  clientStats,
} from "./analytics.js";
import { chart, clearCharts } from "./charts.js";
import { missions } from "./missions.js";
const $ = (s) => document.querySelector(s);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const app = {
  data: null,
  rows: [],
  page: "dashboard",
  search: "",
  filters: {},
  tablePage: 1,
  tableSort: null,
  missionId: 1,
  questionId: null,
  shownRows: [],
  viewRows: [],
  currentFilterMode: "",
  missionsDone: new Set(),
};
const labels = {
  dashboard: [
    "Visão geral",
    "Explore seus dados. Encontre padrões. Transforme informação em decisões.",
  ],
  produtos: [
    "Explorador de produtos",
    "Analise preços, categorias e desempenho dos 50 produtos cadastrados.",
  ],
  clientes: [
    "Base de clientes",
    "Conheça a distribuição geográfica e o perfil de compras.",
  ],
  pedidos: [
    "Central de pedidos",
    "Investigue os 1.000 pedidos, os status e cada transação.",
  ],
  analytics: [
    "Inteligência de dados",
    "Explore tendências, rankings e comparações comerciais.",
  ],
  missoes: [
    "Missões SQL",
    "Dez desafios de investigação baseados nos dados reais da Loja_geek.",
  ],
  laboratorio: [
    "Laboratório de perguntas",
    "Faça perguntas pré-definidas e obtenha respostas baseadas no banco.",
  ],
};
const statusClass = (s) =>
  ["Entregue", "Pendente", "Cancelado"].includes(s) ? s : "";
const b = (label, value, icon, foot, color = "#22d3ee") =>
  `<article class="panel kpi" style="--accent:${color}"><div class="kpi-icon">${icon}</div><div class="kpi-label">${escape(label)}</div><div class="kpi-value">${escape(value)}</div><div class="kpi-foot">${escape(foot)}</div></article>`;
function title(t, sub = "") {
  return `<div class="panel-title"><h3>${escape(t)}</h3><small>${escape(sub)}</small></div>`;
}
function panel(t, id, sub = "", type = "") {
  return `<article class="panel chart-panel">${title(t, sub)}<div class="chart-wrap ${type}"><canvas id="${id}" role="img" aria-label="${escape(t)}"></canvas></div></article>`;
}
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 2800);
}
function filtered() {
  return selectRows(app.rows, app.filters);
}
function filterProducts() {
  return app.data.produtos.filter(
    (p) => !app.filters.category || p.categoria === app.filters.category,
  );
}
function filterClients() {
  return app.data.clientes.filter(
    (c) =>
      (!app.filters.state || c.estado === app.filters.state) &&
      (!app.filters.city || c.cidade === app.filters.city),
  );
}
function filteredBase() {
  const r = filtered();
  return {
    r,
    del: delivered(r),
    products: filterProducts(),
    clients: filterClients(),
  };
}
function drawDashboard() {
  const { r, del, products, clients } = filteredBase(),
    revenue = sum(del, (x) => x.valor),
    nOrders = new Set(r.map((x) => x.id)).size,
    delOrders = new Set(del.map((x) => x.id)).size;
  const ordersMonthly = monthly(del, (x) => x.valor),
    statuses = group(r, (x) => x.status),
    cat = group(
      del,
      (x) => x.categoria,
      (x) => x.valor,
    ),
    pr = group(
      del,
      (x) => x.produto,
      (x) => x.quantidade,
    ).slice(0, 8),
    cities = group(clients, (x) => x.cidade).slice(0, 5);
  $("#content").innerHTML =
    `<div class="kpi-grid">${b("FATURAMENTO REALIZADO", money(revenue), "◈", "Apenas pedidos entregues", "#22d3ee")}${b("PEDIDOS", num(nOrders), "▤", `${num(delOrders)} entregues · ${num(nOrders - delOrders)} outros`, "#3b82f6")}${b("CLIENTES CADASTRADOS", num(clients.length), "♧", "Base de clientes filtrada", "#8b5cf6")}${b("TICKET MÉDIO", money(delOrders ? revenue / delOrders : 0), "▥", "Por pedido entregue", "#22c55e")}${b("PRODUTOS NO CATÁLOGO", num(products.length), "⬡", "Disponíveis na base", "#f59e0b")}${b("PEDIDOS ENTREGUES", num(delOrders), "✓", "Receita reconhecida", "#22c55e")}${b("PEDIDOS PENDENTES", num(new Set(r.filter((x) => x.status === "Pendente").map((x) => x.id)).size), "◷", "Ainda não faturados", "#f59e0b")}${b("PEDIDOS CANCELADOS", num(new Set(r.filter((x) => x.status === "Cancelado").map((x) => x.id)).size), "×", "Não compõem a receita", "#ef4444")}</div><div class="chart-grid">${panel("Evolução do faturamento", "chartMonthly", "Pedidos entregues · por mês")}${panel("Status dos pedidos", "chartStatuses", "Composição dos pedidos")}</div><div class="chart-grid equal">${panel("Produtos mais vendidos", "chartProducts", "Quantidade · pedidos entregues")}${panel("Receita por categoria", "chartCategories", "Pedidos entregues")}</div><div class="chart-grid equal">${panel("Clientes por cidade", "chartCities", "Top 5 cidades")}<article class="panel chart-panel">${title("Resumo executivo", "Insights do recorte atual")}<div class="mini-insights"><p>◈ <strong>${num(delOrders)}</strong> pedidos entregues neste recorte.</p><p>◈ Maior categoria por receita: <strong>${escape(cat[0]?.name ?? "—")}</strong>.</p><p>◈ Cidade com mais clientes cadastrados: <strong>${escape(cities[0]?.name ?? "—")}</strong>.</p><p>◈ Faturamento calculado pelo preço histórico de cada item.</p><p style="color:#7e90ab;font-size:11px">Use os filtros acima para investigar outros recortes do banco de dados.</p></div></article></div>`;
  chart("chartMonthly", ordersMonthly, "line", true);
  chart("chartStatuses", statuses, "doughnut");
  chart("chartProducts", pr, "horizontal");
  chart("chartCategories", cat, "doughnut", true);
  chart("chartCities", cities, "horizontal");
}
function cellValue(v) {
  return typeof v === "number" ? num(v) : String(v ?? "—");
}
function renderTable(titleText, rows, columns, extra = "") {
  const current = app.tablePage,
    chunk = rows.slice(
      (current - 1) * CONFIG.pageSize,
      current * CONFIG.pageSize,
    );
  const totalPages = Math.max(1, Math.ceil(rows.length / CONFIG.pageSize));
  app.shownRows = rows;
  return `<section class="panel table-panel"><div class="table-top"><h3>${escape(titleText)} <small style="color:#7ca5c4;font-size:11px;margin-left:8px">${num(rows.length)} registros</small></h3><div class="table-actions">${extra}</div></div><div class="table-scroll"><table><thead><tr>${columns.map((c) => `<th>${escape(c[0])}</th>`).join("")}</tr></thead><tbody>${chunk.length ? chunk.map((row) => `<tr>${columns.map((c) => `<td>${c[2] ? c[2](row) : escape(cellValue(row[c[1]]))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}" class="empty">Nenhum registro encontrado.</td></tr>`}</tbody></table></div><div class="pagination"><span>Página ${current} de ${totalPages} · ${num(rows.length)} registros</span><div><button data-pager="prev" ${current <= 1 ? "disabled" : ""}>Anterior</button><button data-pager="next" ${current >= totalPages ? "disabled" : ""}>Próxima</button></div></div></section>`;
}
const detail = (name, obj) =>
  `<button class="row-btn" data-detail="${escape(name)}" data-id="${obj.id}">Ver detalhes ↗</button>`;
function includesSearch(x) {
  return normalize(Object.values(x).join(" ")).includes(normalize(app.search));
}
function sorted(rows) {
  if (!app.tableSort) return rows;
  const [field, order] = app.tableSort.split(":");
  return [...rows].sort((a, b) => {
    const v = a[field],
      w = b[field];
    return (
      (typeof v === "number"
        ? v - w
        : String(v).localeCompare(String(w), "pt-BR")) *
      (order === "asc" ? 1 : -1)
    );
  });
}
function listing(page) {
  const r = filtered();
  let rows = [],
    columns = [],
    name = "",
    opts = "";
  if (page === "produtos") {
    rows = productStats(filterProducts(), r).filter(includesSearch);
    name = "Catálogo de produtos";
    columns = [
      ["ID", "id"],
      ["Produto", "nome", (x) => `<strong>${escape(x.nome)}</strong>`],
      [
        "Categoria",
        "categoria",
        (x) => `<span class="tag">${escape(x.categoria)}</span>`,
      ],
      ["Preço", "preco", (x) => money(x.preco)],
      ["Unidades entregues", "unidades"],
      ["Receita", "faturamento", (x) => money(x.faturamento)],
      ["Ação", "", (x) => detail("produto", x)],
    ];
    opts =
      '<option value="preco:desc">Maior preço</option><option value="preco:asc">Menor preço</option><option value="unidades:desc">Mais vendidos</option><option value="faturamento:desc">Maior receita</option><option value="nome:asc">Nome A–Z</option>';
  }
  if (page === "clientes") {
    rows = clientStats(filterClients(), r).filter(includesSearch);
    name = "Clientes cadastrados";
    columns = [
      ["ID", "id"],
      ["Cliente", "nome", (x) => `<strong>${escape(x.nome)}</strong>`],
      ["Cidade", "cidade"],
      ["Estado", "estado"],
      ["E-mail", "email"],
      ["Pedidos", "pedidos"],
      ["Receita", "faturamento", (x) => money(x.faturamento)],
      ["Ação", "", (x) => detail("cliente", x)],
    ];
    opts =
      '<option value="pedidos:desc">Mais pedidos</option><option value="faturamento:desc">Maior receita</option><option value="nome:asc">Nome A–Z</option>';
  }
  if (page === "pedidos") {
    rows = r.filter(includesSearch);
    name = "Histórico de pedidos";
    columns = [
      ["Pedido", "id", (x) => `<strong>#${x.id}</strong>`],
      ["Data", "data_pedido", (x) => dateBR(x.data_pedido)],
      ["Cliente", "cliente"],
      ["Produto", "produto"],
      ["Qtde", "quantidade"],
      ["Valor", "valor", (x) => money(x.valor)],
      [
        "Status",
        "status",
        (x) =>
          `<span class="tag ${statusClass(x.status)}">${escape(x.status)}</span>`,
      ],
      ["Ação", "", (x) => detail("pedido", x)],
    ];
    opts =
      '<option value="data_pedido:desc">Mais recentes</option><option value="data_pedido:asc">Mais antigos</option><option value="valor:desc">Maior valor</option><option value="valor:asc">Menor valor</option>';
  }
  if (!app.tableSort)
    app.tableSort =
      page === "produtos"
        ? "preco:desc"
        : page === "pedidos"
          ? "data_pedido:desc"
          : "pedidos:desc";
  rows = sorted(rows);
  const [f] = app.tableSort.split(":");
  $("#content").innerHTML =
    `<div class="mini-stats"><div class="panel"><strong>${num(rows.length)}</strong><span>Registros encontrados</span></div><div class="panel"><strong>${
      page === "produtos"
        ? money(rows.reduce((a, x) => a + x.faturamento, 0))
        : page === "clientes"
          ? num(new Set(rows.map((x) => x.cidade)).size)
          : money(
              sum(
                rows.filter((x) => x.status === "Entregue"),
                (x) => x.valor,
              ),
            )
    }</strong><span>${page === "clientes" ? "Cidades" : "Receita realizada"}</span></div><div class="panel"><strong>${page === "produtos" ? num(rows.reduce((a, x) => a + x.unidades, 0)) : page === "clientes" ? num(rows.reduce((a, x) => a + x.pedidos, 0)) : num(rows.filter((x) => x.status === "Entregue").length)}</strong><span>${page === "produtos" ? "Unidades vendidas" : page === "clientes" ? "Pedidos relacionados" : "Entregues"}</span></div></div>${renderTable(name, rows, columns, `<select id="sortSelect" aria-label="Ordenar">${opts}</select>`)}`;
  $("#sortSelect").value = app.tableSort;
}
function drawAnalytics() {
  const { r, del, clients } = filteredBase(),
    m = monthly(del, (x) => x.valor),
    cats = group(
      del,
      (x) => x.categoria,
      (x) => x.valor,
    ),
    byState = group(r, (x) => x.estado),
    products = group(
      del,
      (x) => x.produto,
      (x) => x.quantidade,
    ).slice(0, 10),
    vip = group(
      del,
      (x) => x.cliente,
      (x) => x.valor,
    ).slice(0, 8),
    cancel = monthly(r, (x) => (x.status === "Cancelado" ? 1 : 0)).map((x) => ({
      ...x,
      name: x.name,
    }));
  $("#content").innerHTML =
    `<div class="chart-grid">${panel("Faturamento realizado por mês", "anaMonthly")}${panel("Receita por categoria", "anaCats")}</div><div class="chart-grid equal">${panel("Estados por pedidos", "anaState")}${panel("Top produtos · unidades", "anaProducts")}</div><div class="chart-grid equal">${panel("Clientes que mais compraram", "anaClients")}${panel("Cancelamentos mensais", "anaCancel")}</div>`;
  chart("anaMonthly", m, "line", true);
  chart("anaCats", cats, "doughnut", true);
  chart("anaState", byState, "bar");
  chart("anaProducts", products, "horizontal");
  chart("anaClients", vip, "horizontal", true);
  chart("anaCancel", cancel, "bar");
}
function missionTable(rows) {
  if (!rows.length)
    return '<div class="empty">Sem registros para este desafio.</div>';
  const keys = Object.keys(rows[0]);
  return `<div class="table-scroll"><table><thead><tr>${keys.map((k) => `<th>${escape(k)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${keys.map((k) => `<td>${escape(cellValue(row[k]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function drawMissions() {
  const selected = missions.find((x) => x.id === app.missionId);
  $("#content").innerHTML =
    `<div class="mini-stats"><div class="panel"><strong>10</strong><span>Missões disponíveis</span></div><div class="panel"><strong>${app.missionsDone.size}/10</strong><span>Missões exploradas nesta sessão</span></div><div class="panel"><strong>SQL + JS</strong><span>Consultas de referência · cálculos locais</span></div></div><div class="mission-grid">${missions.map((m) => `<article class="panel mission-card"><div class="mission-top"><span class="mission-number">MISSÃO ${String(m.id).padStart(2, "0")}</span><span class="tag">${app.missionsDone.has(m.id) ? "✓ Explorou" : m.id <= 5 ? "Original" : "Extra"}</span></div><h3>${escape(m.title)}</h3><p>${escape(m.desc)}</p><div class="mission-meta"><span class="muted">${m.id <= 5 ? "DESAFIO OFICIAL" : "DESAFIO COMPLEMENTAR"}</span><button class="btn btn-primary" data-mission="${m.id}">Investigar ↗</button></div></article>`).join("")}</div><section class="panel mission-detail" id="missionResult"><div class="panel-title"><h3>${escape(selected.title)} · Consulta de referência</h3><span class="tag">SIMULAÇÃO SOBRE JSON</span></div><p class="result-text">${escape(selected.desc)}</p><pre class="codebox"><code>${escape(selected.sql)}</code></pre><div style="display:flex;gap:10px;margin:16px 0"><button class="btn btn-primary" id="runMission">▶ Executar análise</button><button class="btn btn-quiet" id="copySQL">▣ Copiar SQL</button></div><div id="missionOutput"><p class="result-text">Clique em executar para calcular sobre os registros locais. Nenhuma consulta SQL é executada no navegador.</p></div></section>`;
}
const questions = [
  [
    "Qual cidade tem mais clientes?",
    () => {
      const x = group(app.data.clientes, (c) => c.cidade)[0];
      return [x.name, `${num(x.value)} clientes cadastrados.`];
    },
  ],
  [
    "Qual é o produto mais caro?",
    () => {
      const p = [...app.data.produtos].sort((a, b) => b.preco - a.preco)[0];
      return [p.nome, `Preço atual: ${money(p.preco)}.`];
    },
  ],
  [
    "Quais produtos contêm Gamer?",
    () => {
      const p = app.data.produtos.filter((x) =>
        normalize(x.nome).includes("gamer"),
      );
      return [
        `${p.length} produtos`,
        p.map((x) => `${x.nome}: ${money(x.preco)}`).join(" · "),
      ];
    },
  ],
  [
    "Qual mês gerou mais receita?",
    () => {
      const a = group(
        delivered(filtered()),
        (x) => x.data_pedido.slice(0, 7),
        (x) => x.valor,
      )[0];
      return a
        ? [a.name, money(a.value) + " em pedidos entregues."]
        : ["Sem dados", "Não há vendas no recorte."];
    },
  ],
  [
    "Qual é o preço médio dos produtos?",
    () => [
      money(
        sum(filterProducts(), (x) => x.preco) / (filterProducts().length || 1),
      ),
      `Média de ${filterProducts().length} produtos no catálogo.`,
    ],
  ],
  [
    "Quais clientes mais compraram?",
    () => {
      const a = group(filtered(), (x) => x.cliente).slice(0, 5);
      return [
        a[0]?.name ?? "Sem dados",
        a.map((x) => `${x.name}: ${num(x.value)} pedidos`).join(" · "),
      ];
    },
  ],
  [
    "Qual categoria gerou mais receita?",
    () => {
      const a = group(
        delivered(filtered()),
        (x) => x.categoria,
        (x) => x.valor,
      )[0];
      return a
        ? [a.name, money(a.value) + " de pedidos entregues."]
        : ["Sem dados", "Não há entregas no recorte."];
    },
  ],
  [
    "Quantos pedidos foram cancelados?",
    () => {
      const a = filtered().filter((x) => x.status === "Cancelado");
      return [
        num(new Set(a.map((x) => x.id)).size),
        "Pedidos cancelados no recorte aplicado.",
      ];
    },
  ],
  [
    "Quais produtos venderam mais unidades?",
    () => {
      const a = group(
        delivered(filtered()),
        (x) => x.produto,
        (x) => x.quantidade,
      ).slice(0, 5);
      return [
        a[0]?.name ?? "Sem dados",
        a.map((x) => `${x.name}: ${num(x.value)} unidades`).join(" · "),
      ];
    },
  ],
  [
    "Qual o faturamento entre as datas filtradas?",
    () => [
      money(sum(delivered(filtered()), (x) => x.valor)),
      "Faturamento de pedidos entregues dentro dos filtros globais.",
    ],
  ],
];
function drawLab() {
  const opts = questions
    .map(([q], i) => ({ q, i }))
    .filter((x) => normalize(x.q).includes(normalize(app.search)));
  $("#content").innerHTML =
    `<section class="panel chart-panel"><div class="eyebrow">✦ PERGUNTAS GUIADAS / SEM IA</div><h2>O que você quer descobrir?</h2><p class="result-text">Selecione uma pergunta para analisar os registros. Os filtros globais se aplicam às perguntas comerciais e temporais; perguntas de cadastro usam o catálogo e a base de clientes.</p><div class="lab-list">${opts.map((x) => `<button class="question" data-question="${x.i}">◈ ${escape(x.q)} ↗</button>`).join("") || '<p class="empty">Nenhuma pergunta corresponde à busca.</p>'}</div></section><div id="answerArea"></div>`;
  if (app.questionId !== null) showAnswer();
}
function showAnswer() {
  const [a, b] = questions[app.questionId][1]();
  $("#answerArea").innerHTML =
    `<section class="panel answer"><span class="eyebrow">RESPOSTA BASEADA NOS DADOS</span><h2>${escape(questions[app.questionId][0])}</h2><div class="big-answer">${escape(a)}</div><p>${escape(b)}</p></section>`;
}
function render() {
  clearCharts();
  const [titleText, desc] = labels[app.page];
  $("#pageTitle").innerHTML =
    `${escape(titleText)} <span class="headline-glow">✳</span>`;
  $("#pageDescription").textContent = desc;
  $("#crumb").textContent = titleText;
  document
    .querySelectorAll("[data-page]")
    .forEach((x) => x.classList.toggle("active", x.dataset.page === app.page));
  $("#globalSearch").value = app.search;
  $("#globalSearch").placeholder = ["produtos", "clientes", "pedidos"].includes(
    app.page,
  )
    ? "Buscar nesta tabela..."
    : app.page === "laboratorio"
      ? "Encontrar uma pergunta..."
      : "Buscar nesta seção...";
  $("#filters").style.display = app.page === "missoes" ? "none" : "";
  $("#resetFilters").style.display = app.page === "missoes" ? "none" : "";
  if (app.page === "dashboard") drawDashboard();
  else if (["produtos", "clientes", "pedidos"].includes(app.page))
    listing(app.page);
  else if (app.page === "analytics") drawAnalytics();
  else if (app.page === "missoes") drawMissions();
  else drawLab();
}
function modal(titleText, html) {
  $("#modalTitle").textContent = titleText;
  $("#modalBody").innerHTML = html;
  $("#modal").hidden = false;
}
function modalDetails(type, id) {
  let p;
  if (type === "produto") {
    p = app.data.produtos.find((x) => x.id === id);
    const s = productStats([p], filtered())[0];
    modal(
      p.nome,
      `<p>Categoria: ${escape(p.categoria)}</p><p>Preço cadastrado: <strong>${money(p.preco)}</strong></p><p>Unidades entregues: <strong>${num(s.unidades)}</strong></p><p>Faturamento realizado: <strong>${money(s.faturamento)}</strong></p>`,
    );
  } else if (type === "cliente") {
    p = app.data.clientes.find((x) => x.id === id);
    const s = clientStats([p], filtered())[0];
    modal(
      p.nome,
      `<p>ID: ${p.id}</p><p>Localização: ${escape(p.cidade)} / ${escape(p.estado)}</p><p>Email: ${escape(p.email)}</p><p>Pedidos: <strong>${num(s.pedidos)}</strong></p><p>Faturamento: <strong>${money(s.faturamento)}</strong></p>`,
    );
  } else {
    p = app.rows.find((x) => x.id === id);
    modal(
      `Pedido #${id}`,
      `<p>Cliente: ${escape(p.cliente)} · ${escape(p.cidade)}/${escape(p.estado)}</p><p>Data: ${dateBR(p.data_pedido)}</p><p>Produto: ${escape(p.produto)}</p><p>Quantidade: ${num(p.quantidade)} · Preço unitário: ${money(p.preco_unitario)}</p><p>Valor: <strong>${money(p.valor)}</strong></p><p>Status: <span class="tag ${statusClass(p.status)}">${escape(p.status)}</span></p>`,
    );
  }
}
function downloadCSV() {
  let rows;
  if (["produtos", "clientes", "pedidos"].includes(app.page))
    rows = app.shownRows;
  else rows = filtered();
  if (!rows.length) {
    toast("Não existem dados para exportar.");
    return;
  }
  const keys = Object.keys(rows[0]);
  const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv =
    "\ufeff" +
    keys.map(esc).join(";") +
    "\r\n" +
    rows.map((r) => keys.map((k) => esc(r[k])).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `geekshop-${app.page}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV exportado com sucesso.");
}
function setupFilters() {
  const set = (id, values) => {
    const s = $(id);
    for (const val of [...new Set(values)].sort((a, b) =>
      String(a).localeCompare(String(b), "pt-BR"),
    )) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = val;
      s.append(o);
    }
  };
  set(
    "#statusFilter",
    app.data.pedidos.map((x) => x.status),
  );
  set(
    "#categoryFilter",
    app.data.produtos.map((x) => x.categoria),
  );
  set(
    "#stateFilter",
    app.data.clientes.map((x) => x.estado),
  );
  set(
    "#cityFilter",
    app.data.clientes.map((x) => x.cidade),
  );
  $("#dateStart").min = "2026-01-01";
  $("#dateEnd").max = "2026-12-31";
  const ids = {
    dateStart: "start",
    dateEnd: "end",
    statusFilter: "status",
    categoryFilter: "category",
    stateFilter: "state",
    cityFilter: "city",
  };
  for (const [id, k] of Object.entries(ids))
    $("#" + id).addEventListener("change", (e) => {
      app.filters[k] = e.target.value;
      app.tablePage = 1;
      updateFilterCount();
      render();
    });
}
function updateFilterCount() {
  const n = Object.values(app.filters).filter(Boolean).length;
  $("#filterCount").textContent = n
    ? `${n} filtro${n > 1 ? "s" : ""} ativo${n > 1 ? "s" : ""}`
    : "Sem filtros";
}
function initEvents() {
  document.querySelector("#nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn) return;
    app.page = btn.dataset.page;
    app.search = "";
    app.tablePage = 1;
    app.tableSort = null;
    app.questionId = null;
    $("#sidebar").classList.remove("open");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#content").addEventListener("click", (e) => {
    const pg = e.target.closest("[data-pager]");
    if (pg) {
      app.tablePage += pg.dataset.pager === "next" ? 1 : -1;
      render();
      return;
    }
    const dt = e.target.closest("[data-detail]");
    if (dt) {
      modalDetails(dt.dataset.detail, Number(dt.dataset.id));
      return;
    }
    const m = e.target.closest("[data-mission]");
    if (m) {
      app.missionId = Number(m.dataset.mission);
      render();
      $("#missionResult").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (e.target.closest("#runMission")) {
      const mission = missions.find((m) => m.id === app.missionId);
      const results = mission.run(app.data, app.rows);
      app.missionsDone.add(mission.id);
      $("#missionOutput").innerHTML =
        `<p class="result-text">✓ Análise concluída sobre dados JSON · ${results.length} resultado(s)</p>${missionTable(results)}`;
      toast("Missão analisada com dados locais.");
      return;
    }
    if (e.target.closest("#copySQL")) {
      const sql = missions.find((m) => m.id === app.missionId).sql;
      navigator.clipboard
        ?.writeText(sql)
        .then(() => toast("SQL copiado."))
        .catch(() => toast("Não foi possível copiar automaticamente."));
      return;
    }
    const q = e.target.closest("[data-question]");
    if (q) {
      app.questionId = Number(q.dataset.question);
      showAnswer();
      $("#answerArea").scrollIntoView({ behavior: "smooth" });
      return;
    }
  });
  $("#content").addEventListener("change", (e) => {
    if (e.target.id === "sortSelect") {
      app.tableSort = e.target.value;
      app.tablePage = 1;
      render();
    }
  });
  $("#globalSearch").addEventListener("input", (e) => {
    app.search = e.target.value;
    app.tablePage = 1;
    render();
    $("#globalSearch").focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $("#globalSearch").focus();
    }
    if (e.key === "Escape") $("#modal").hidden = true;
  });
  $("#resetFilters").onclick = () => {
    app.filters = {};
    for (const id of [
      "dateStart",
      "dateEnd",
      "statusFilter",
      "categoryFilter",
      "stateFilter",
      "cityFilter",
    ])
      $("#" + id).value = "";
    app.tablePage = 1;
    updateFilterCount();
    render();
  };
  $("#exportBtn").onclick = downloadCSV;
  $("#modalClose").onclick = () => ($("#modal").hidden = true);
  $("#modal").addEventListener("click", (e) => {
    if (e.target === $("#modal")) $("#modal").hidden = true;
  });
  $("#menuBtn").onclick = () => $("#sidebar").classList.add("open");
  $("#closeSidebar").onclick = () => $("#sidebar").classList.remove("open");
}
async function boot() {
  try {
    app.data = await loadData();
    for (const key of ["clientes", "produtos", "pedidos", "itens_pedido"])
      if (!Array.isArray(app.data[key]))
        throw Error("Formato inesperado: " + key);
    app.rows = buildRows(app.data);
    if (app.rows.length !== app.data.itens_pedido.length)
      throw Error("Relacionamentos incompletos no dataset");
    setupFilters();
    initEvents();
    $("#footerStats").textContent =
      `${num(app.data.pedidos.length)} pedidos · ${num(app.data.clientes.length)} clientes · dados reais do SQL`;
    render();
  } catch (err) {
    console.error(err);
    $("#content").innerHTML =
      `<div class="panel empty"><h2>Não foi possível carregar os dados</h2><p>${escape(err.message)}</p><p>Abra o projeto com <strong>Live Server</strong> ou <code>python -m http.server 5500</code>, não pelo endereço file://.</p></div>`;
  }
}
boot();
