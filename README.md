# loja_geek — Frontend + MariaDB/MySQL

## Correção do erro better-sqlite3 e nodemon

Este projeto foi migrado de SQLite para **MariaDB/MySQL usando mysql2**, compatível com HeidiSQL e sem compilação de módulos nativos C++. `npm run dev` usa `node --watch`, sem nodemon.

## Iniciar (Windows / PowerShell)

1. Inicie o servidor MariaDB/MySQL (XAMPP, serviço MariaDB ou instalação local). Abra o HeidiSQL, crie uma sessão MariaDB/MySQL com host, porta, usuário e senha que funcionem.
2. Abra a pasta **loja_geek** no VS Code e execute os comandos **na raiz**, onde existe `package.json`:

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run dev
```

3. No `.env`, coloque a **mesma conexão que funciona no HeidiSQL**. A porta padrão é `3306`, mas se seu MariaDB estiver usando `3309`, use `DB_PORT=3309`.
4. Abra **http://localhost:3000**. A API usa **http://localhost:3000/api**. Não é necessário Live Server.
5. Atualize os bancos no HeidiSQL (F5): o banco `loja_geek` terá as tabelas `clientes`, `produtos`, `pedidos`, `itens_pedido`. O backend importa os JSONs na primeira inicialização quando as quatro tabelas estão vazias.

> Se o usuário MariaDB não tiver permissão `CREATE DATABASE`, crie manualmente a base `loja_geek` no HeidiSQL e rode o servidor novamente.

**Importante:** o arquivo `database/atividade_geekshop.sql` contém as cinco consultas da atividade; ele não é o banco com dados completos. O backend cria as tabelas automaticamente e importa os JSONs com 100 clientes, 50 produtos, 1.000 pedidos e 1.000 itens.

## Verificações

- http://localhost:3000/api/health
- http://localhost:3000/api/dashboard/summary
- http://localhost:3000/api/clientes
- http://localhost:3000/api/produtos
- http://localhost:3000/api/pedidos
- http://localhost:3000/api/itens_pedido

## Modo offline sem backend

No arquivo `frontend/js/config.js`, altere `dataSource: 'api'` para `dataSource: 'mock'`. Abra `frontend/index.html` via Live Server para usar o JSON local; o HeidiSQL/MariaDB não será utilizado nesse modo.

## Persistência

O backend importa os registros somente **quando as quatro tabelas estão vazias**. Ele não substitui alterações que você fizer depois no HeidiSQL. Uma instalação parcialmente populada é preservada sem reinserção automática; restaure os dados manualmente nesse caso.

## Estrutura

- `frontend/`: interface HTML/CSS/JS e JSONs.
- `backend/server.js`: Express e servidor de arquivos estáticos.
- `backend/database.js`: MariaDB/MySQL, tabelas e importação inicial.
- `backend/routes/api.js`: API com busca, filtros, paginação e resumo.
- `backend/data/`: registros originais em JSON para a primeira carga.
- `database/atividade_geekshop.sql`: consultas da atividade escolar.
- `docs/API-CONTRACT.md`: documentação dos endpoints.

## Avisos

- Você precisa de um servidor MariaDB/MySQL instalado e em execução para usar o HeidiSQL com o backend.
- Não compartilhe seu arquivo `.env` (contém senha).
- As bibliotecas Chart.js e ícones podem depender da internet (CDN).
- O sistema não inclui autenticação, portanto destina-se ao ambiente de aula/desenvolvimento.
