import { group, sum, delivered, money, num, monthly } from "./analytics.js";
export const missions = [
  {
    id: 1,
    title: "Conhecendo a GeekShop",
    desc: "Descubra quantos clientes, produtos e pedidos existem e quais são os status distintos.",
    sql: "SELECT COUNT(*) AS total_clientes FROM clientes;\nSELECT COUNT(*) AS total_produtos FROM produtos;\nSELECT COUNT(*) AS total_pedidos FROM pedidos;\nSELECT DISTINCT status FROM pedidos;",
    run: (d, r) => [
      { Métrica: "Clientes", Total: d.clientes.length },
      { Métrica: "Produtos", Total: d.produtos.length },
      { Métrica: "Pedidos", Total: d.pedidos.length },
      ...group(r, (x) => x.status).map((x) => ({
        Métrica: `Status: ${x.name}`,
        Total: x.value,
      })),
    ],
  },
  {
    id: 2,
    title: "Produtos de Luxo",
    desc: "Os dez produtos mais caros e a diferença entre os preços máximo e mínimo do catálogo.",
    sql: "SELECT id,nome,preco FROM produtos ORDER BY preco DESC LIMIT 10;\nSELECT MAX(preco)-MIN(preco) AS diferenca FROM produtos;",
    run: (d) => [
      {
        Produto: "Diferença entre maior e menor preço",
        Preço: money(
          Math.max(...d.produtos.map((x) => x.preco)) -
            Math.min(...d.produtos.map((x) => x.preco)),
        ),
      },
      ...[...d.produtos]
        .sort((a, b) => b.preco - a.preco)
        .slice(0, 10)
        .map((x) => ({ Produto: x.nome, Preço: money(x.preco) })),
    ],
  },
  {
    id: 3,
    title: "Operação Gamer",
    desc: "Encontre produtos que contenham Gamer no nome, ordenados por preço crescente.",
    sql: "SELECT id,nome,categoria,preco FROM produtos WHERE nome LIKE '%Gamer%' ORDER BY preco ASC;",
    run: (d) =>
      d.produtos
        .filter((x) => x.nome.toLowerCase().includes("gamer"))
        .sort((a, b) => a.preco - b.preco)
        .map((x) => ({
          Produto: x.nome,
          Categoria: x.categoria,
          Preço: money(x.preco),
        })),
  },
  {
    id: 4,
    title: "Clientes pelo Brasil",
    desc: "As cinco cidades com o maior número de clientes cadastrados.",
    sql: "SELECT cidade,COUNT(*) AS total FROM clientes GROUP BY cidade ORDER BY total DESC,cidade ASC LIMIT 5;",
    run: (d) =>
      group(d.clientes, (x) => x.cidade)
        .slice(0, 5)
        .map((x) => ({ Cidade: x.name, Clientes: x.value })),
  },
  {
    id: 5,
    title: "Viagem no Tempo",
    desc: "Pedidos realizados entre março e junho de 2026 e a soma dos valores dos itens desses pedidos.",
    sql: "SELECT COUNT(DISTINCT p.id) AS pedidos, SUM(i.quantidade*i.preco_unitario) AS valor_total FROM pedidos p JOIN itens_pedido i ON i.pedido_id=p.id WHERE p.data_pedido BETWEEN '2026-03-01' AND '2026-06-30';",
    run: (d, r) => {
      const a = r.filter(
        (x) => x.data_pedido >= "2026-03-01" && x.data_pedido <= "2026-06-30",
      );
      return [
        {
          Pedidos: new Set(a.map((x) => x.id)).size,
          "Valor total": money(sum(a, (x) => x.valor)),
        },
      ];
    },
  },
  {
    id: 6,
    title: "Ranking de Vendas",
    desc: "Dez produtos com mais unidades vendidas em pedidos entregues.",
    sql: "SELECT pr.nome,SUM(i.quantidade) AS unidades FROM itens_pedido i JOIN pedidos p ON p.id=i.pedido_id JOIN produtos pr ON pr.id=i.produto_id WHERE p.status='Entregue' GROUP BY pr.id,pr.nome ORDER BY unidades DESC LIMIT 10;",
    run: (d, r) =>
      group(
        delivered(r),
        (x) => x.produto,
        (x) => x.quantidade,
      )
        .slice(0, 10)
        .map((x) => ({ Produto: x.name, Unidades: x.value })),
  },
  {
    id: 7,
    title: "Clientes VIP",
    desc: "Dez clientes com maior faturamento realizado em compras entregues.",
    sql: "SELECT c.nome,SUM(i.quantidade*i.preco_unitario) AS gasto FROM clientes c JOIN pedidos p ON p.cliente_id=c.id JOIN itens_pedido i ON i.pedido_id=p.id WHERE p.status='Entregue' GROUP BY c.id,c.nome ORDER BY gasto DESC LIMIT 10;",
    run: (d, r) =>
      group(
        delivered(r),
        (x) => x.cliente_id,
        (x) => x.valor,
      )
        .slice(0, 10)
        .map((x) => ({
          Cliente: d.clientes.find((c) => c.id === x.name)?.nome ?? x.name,
          Valor: money(x.value),
        })),
  },
  {
    id: 8,
    title: "Radar de Cancelamentos",
    desc: "Compare a taxa mensal de pedidos cancelados.",
    sql: "SELECT DATE_FORMAT(data_pedido,'%Y-%m') AS mes,COUNT(*) AS pedidos,SUM(status='Cancelado') AS cancelados,ROUND(100*AVG(status='Cancelado'),2) AS percentual FROM pedidos GROUP BY mes ORDER BY mes;",
    run: (d, r) =>
      group(r, (x) => x.data_pedido.slice(0, 7))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((x) => ({
          Mês: x.name,
          Pedidos: x.value,
          Cancelados: r.filter(
            (z) => z.data_pedido.startsWith(x.name) && z.status === "Cancelado",
          ).length,
          Taxa:
            (
              (100 *
                r.filter(
                  (z) =>
                    z.data_pedido.startsWith(x.name) &&
                    z.status === "Cancelado",
                ).length) /
              x.value
            ).toFixed(2) + "%",
        })),
  },
  {
    id: 9,
    title: "Faturamento Mensal",
    desc: "Descubra o mês de maior faturamento de pedidos entregues.",
    sql: "SELECT DATE_FORMAT(p.data_pedido,'%Y-%m') AS mes,SUM(i.quantidade*i.preco_unitario) AS receita FROM pedidos p JOIN itens_pedido i ON i.pedido_id=p.id WHERE p.status='Entregue' GROUP BY mes ORDER BY receita DESC;",
    run: (d, r) =>
      group(
        delivered(r),
        (x) => x.data_pedido.slice(0, 7),
        (x) => x.valor,
      ).map((x) => ({ Mês: x.name, Faturamento: money(x.value) })),
  },
  {
    id: 10,
    title: "Categorias Campeãs",
    desc: "Quais categorias geraram mais faturamento realizado?",
    sql: "SELECT pr.categoria,SUM(i.quantidade*i.preco_unitario) AS receita FROM pedidos p JOIN itens_pedido i ON p.id=i.pedido_id JOIN produtos pr ON pr.id=i.produto_id WHERE p.status='Entregue' GROUP BY pr.categoria ORDER BY receita DESC;",
    run: (d, r) =>
      group(
        delivered(r),
        (x) => x.categoria,
        (x) => x.valor,
      ).map((x) => ({ Categoria: x.name, Faturamento: money(x.value) })),
  },
];
