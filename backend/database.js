import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const databaseName = process.env.DB_NAME || 'loja_geek';
if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) throw new Error('DB_NAME inválido.');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
  timezone: 'Z'
};
let pool;
export function getPool() {
  if (!pool) throw new Error('Banco ainda não inicializado.');
  return pool;
}

export async function initializeDatabase() {
  // Primeiro conecta sem schema, permitindo criar a base diretamente no servidor MariaDB/MySQL.
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally { await connection.end(); }
  pool = mysql.createPool({ ...dbConfig, database: databaseName });
  const ddl = [
    `CREATE TABLE IF NOT EXISTS clientes (id INT PRIMARY KEY, nome VARCHAR(255) NOT NULL, cidade VARCHAR(160), estado VARCHAR(2), email VARCHAR(255)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS produtos (id INT PRIMARY KEY, nome VARCHAR(255) NOT NULL, categoria VARCHAR(120), preco DECIMAL(12,2) NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS pedidos (id INT PRIMARY KEY, cliente_id INT NOT NULL, data_pedido DATE NOT NULL, status VARCHAR(40) NOT NULL, INDEX idx_pedidos_cliente (cliente_id), INDEX idx_pedidos_data (data_pedido), INDEX idx_pedidos_status (status), FOREIGN KEY (cliente_id) REFERENCES clientes(id)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS itens_pedido (id INT PRIMARY KEY, pedido_id INT NOT NULL UNIQUE, produto_id INT NOT NULL, quantidade INT NOT NULL, preco_unitario DECIMAL(12,2) NOT NULL, INDEX idx_itens_produto (produto_id), FOREIGN KEY (pedido_id) REFERENCES pedidos(id), FOREIGN KEY (produto_id) REFERENCES produtos(id)) ENGINE=InnoDB`
  ];
  for (const sql of ddl) await pool.query(sql);
  // Importa só no banco vazio. Não sobrescreve edições feitas diretamente no HeidiSQL.
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM clientes');
  const tableNames = ['clientes', 'produtos', 'pedidos', 'itens_pedido'];
  const counts = await Promise.all(tableNames.map(async table => {
    const [[row]] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);
    return row.total;
  }));
  if (counts.every(count => count === 0)) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const table of tableNames) {
        const rows = JSON.parse(await fs.readFile(path.join(dataDir, `${table}.json`), 'utf8'));
        if (!rows.length) continue;
        const cols = Object.keys(rows[0]);
        const columnSQL = cols.map(c => "`" + c + "`").join(', ');
        const insertSql = `INSERT INTO \`${table}\` (${columnSQL}) VALUES (${cols.map(() => '?').join(',')})`;
        for (const row of rows) await conn.execute(insertSql, cols.map(c => row[c]));
        console.log(`  ${table}: ${rows.length} registros importados`);
      }
      await conn.commit();
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  } else if (counts.some(count => count === 0)) {
    console.warn('Banco parcialmente populado: carga automática não executada para preservar os dados.');
  }
  console.log(`MariaDB/MySQL conectado: ${dbConfig.host}:${dbConfig.port}/${databaseName}`);
}
