-- Integrantes: Kennedy, ially, Bryan, Gabriel
-- 1. CONHECENDO A loja_geek
-- Descubram quantos clientes, produtos e pedidos existem no banco. Identifiquem também os diferentes status dos pedidos.

SELECT
    (SELECT COUNT(*) FROM clientes) AS total_clientes,
    (SELECT COUNT(*) FROM produtos) AS total_produtos,
    (SELECT COUNT(*) FROM pedidos) AS total_pedidos;

SELECT DISTINCT status
FROM pedidos;

-- 2. PRODUTOS DE LUXO
-- Encontrem os 10 produtos mais caros e descubram a diferença de preço entre o mais caro e o mais barato.

SELECT nome, preco
FROM produtos
ORDER BY preco DESC
LIMIT 10;

SELECT MAX(preco) - MIN(preco) AS diferenca_de_preco
FROM produtos;

-- 3. OPERAÇÃO GAMER
-- Localizem todos os produtos que possuem a palavra Gamer no nome e organizem os resultados do menor para o maior preço.

SELECT nome, preco
FROM produtos
WHERE nome LIKE '%Gamer%'
ORDER BY preco ASC;

-- 4. CLIENTES ESPALHADOS PELO BRASIL
-- Descubram quais cidades possuem mais clientes cadastrados e apresentem as cinco primeiras posições.

SELECT cidade, COUNT(*) AS total_clientes
FROM clientes
GROUP BY cidade
ORDER BY total_clientes DESC
LIMIT 5;

-- 5. VIAGEM NO TEMPO
-- Descubram quantos pedidos foram realizados entre março e junho de 2026 e o valor total desses pedidos.

SELECT
    COUNT(DISTINCT pedidos.id) AS total_pedidos,
    SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) AS valor_total
FROM pedidos
JOIN itens_pedido ON pedidos.id = itens_pedido.pedido_id
WHERE pedidos.data_pedido BETWEEN '2026-03-01' AND '2026-06-30';

-- 6. Campeões de vendas
-- Identifiquem os cinco prosutos com maior quantidade de unidades vendidas em pedidos entregues.

SELECT
    produtos.nome AS produto,
    SUM(itens_pedido.quantidade) AS unidades_vendidas
FROM produtos
JOIN itens_pedido
    ON produtos.id = itens_pedido.produto_id
JOIN pedidos
    ON itens_pedido.pedido_id = pedidos.id
WHERE pedidos.status = 'Entregue'
GROUP BY produtos.id, produtos.nome
ORDER BY unidades_vendidas DESC
LIMIT 5;

-- 7. O mistério dos cancelamentos
-- Investiguem quantos pedidos foram cancelados, qual o valor total desses pedidos
-- e quais clientes foram afetados.

SELECT
    COUNT(DISTINCT pedidos.id) AS total_pedidos_cancelados,
    SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) AS valor_total_cancelado,
    GROUP_CONCAT(DISTINCT clientes.nome) AS clientes_afetados
FROM pedidos
JOIN clientes
    ON pedidos.cliente_id = clientes.id
JOIN itens_pedido
    ON pedidos.id = itens_pedido.pedido_id
WHERE pedidos.status = 'Cancelado';

SELECT DISTINCT
    clientes.nome AS cliente,
    clientes.cidade,
    clientes.estado
FROM clientes
JOIN pedidos
    ON clientes.id = pedidos.cliente_id
WHERE pedidos.status = 'Cancelado'
ORDER BY clientes.nome ASC;

-- 8. O clube VIP
-- Encontrem os cliente que gastaram mais de R$3.000,00 em pedidos
-- entregues e organizem um ranking

SELECT
    clientes.nome AS cliente,
    SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) AS total_gasto
FROM clientes
JOIN pedidos
    ON clientes.id = pedidos.cliente_id
JOIN itens_pedido
    ON pedidos.id = itens_pedido.pedido_id
WHERE pedidos.status = 'Entregue'
GROUP BY clientes.id, clientes.nome
HAVING SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) > 3000
ORDER BY total_gasto DESC;

-- 9. Qual categoria domina ?
-- Descubram qual categoria de produtos gerou o maior
-- faturamento com pedidos entregues.

SELECT
    produtos.categoria,
    SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) AS faturamento
FROM produtos
JOIN itens_pedido
    ON produtos.id = itens_pedido.produto_id
JOIN pedidos
    ON itens_pedido.pedido_id = pedidos.id
WHERE pedidos.status = 'Entregue'
GROUP BY produtos.categoria
ORDER BY faturamento DESC
LIMIT 1;

-- 10. A grande decisão
-- Criem um relatório com os cincos clientes que mais gastaram, os três produtos com mais
-- unidades vendidas e o faturamento por categoria. Apresentem três recomendações para a loja.

SELECT
    clientes.nome AS cliente,
    SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) AS total_gasto
FROM clientes
JOIN pedidos
    ON clientes.id = pedidos.cliente_id
JOIN itens_pedido
    ON pedidos.id = itens_pedido.pedido_id
WHERE pedidos.status = 'Entregue'
GROUP BY clientes.id, clientes.nome
ORDER BY total_gasto DESC
LIMIT 5;


SELECT
    produtos.nome AS produto,
    SUM(itens_pedido.quantidade) AS unidades_vendidas
FROM produtos
JOIN itens_pedido
    ON produtos.id = itens_pedido.produto_id
JOIN pedidos
    ON itens_pedido.pedido_id = pedidos.id
WHERE pedidos.status = 'Entregue'
GROUP BY produtos.id, produtos.nome
ORDER BY unidades_vendidas DESC
LIMIT 3;


SELECT
    produtos.categoria,
    SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) AS faturamento
FROM produtos
JOIN itens_pedido
    ON produtos.id = itens_pedido.produto_id
JOIN pedidos
    ON itens_pedido.pedido_id = pedidos.id
WHERE pedidos.status = 'Entregue'
GROUP BY produtos.categoria
ORDER BY faturamento DESC;