import express from 'express';
import { getPool } from '../database.js';
const router = express.Router();
const resources = {
  clientes: { alias: 'c', from: 'clientes c', searchable: ['c.nome','c.cidade','c.estado','c.email'], order: 'c.id' },
  produtos: { alias: 'p', from: 'produtos p', searchable: ['p.nome','p.categoria'], order: 'p.id' },
  pedidos: { alias: 'p', from: 'pedidos p', searchable: ['CAST(p.id AS CHAR)','CAST(p.cliente_id AS CHAR)','p.status','CAST(p.data_pedido AS CHAR)'], order: 'p.id' },
  itens_pedido: { alias: 'ip', from: 'itens_pedido ip INNER JOIN pedidos p ON p.id=ip.pedido_id', searchable: ['CAST(ip.id AS CHAR)','CAST(ip.pedido_id AS CHAR)','CAST(ip.produto_id AS CHAR)'], order: 'ip.id' }
};
function bad(message) { const e=new Error(message);e.status=400;return e; }
function date(value, name) {
  if (value===undefined || value==='') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw bad(`${name} inválida (AAAA-MM-DD).`);
  const [y,m,d]=value.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  if (dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d) throw bad(`${name} inválida.`);
  return value;
}
const int = (value, name, max=1000000) => { const n=Number(value); if (!Number.isSafeInteger(n)||n<1||n>max)throw bad(`${name} inválido.`);return n; };
function filters(type, query) {
  const r=resources[type], where=[], args=[];
  const search=String(query.busca??query.search??'').trim();
  if(search.length>100)throw bad('Pesquisa limitada a 100 caracteres.');
  if(search){where.push('('+r.searchable.map(c=>`LOWER(${c}) LIKE ?`).join(' OR ')+')');args.push(...r.searchable.map(()=>`%${search.toLowerCase()}%`));}
  if(type==='clientes') {
    if(query.estado){where.push('c.estado = ?');args.push(String(query.estado).toUpperCase());}
    if(query.cidade){where.push('LOWER(c.cidade) = LOWER(?)');args.push(String(query.cidade));}
  }
  if(type==='produtos') {
    if(query.categoria){where.push('LOWER(p.categoria)=LOWER(?)');args.push(String(query.categoria));}
    for(const [name,op] of [['precoMin','>='],['precoMax','<=']])if(query[name]!==undefined&&query[name]!==''){const n=Number(query[name]);if(!Number.isFinite(n)||n<0)throw bad(`${name} inválido.`);where.push(`p.preco ${op} ?`);args.push(n);}
    if(query.precoMin!==undefined&&query.precoMax!==undefined&&Number(query.precoMin)>Number(query.precoMax))throw bad('precoMin maior que precoMax.');
  }
  if(type==='pedidos'||type==='itens_pedido') {
    const start=date(query.inicio,'Data inicial'),end=date(query.fim,'Data final');
    if(start&&end&&start>end)throw bad('Data inicial maior que data final.');
    if(start){where.push('p.data_pedido >= ?');args.push(start);}
    if(end){where.push('p.data_pedido <= ?');args.push(end);}
    if(query.status){if(!['Entregue','Pendente','Cancelado'].includes(query.status))throw bad('Status inválido.');where.push('p.status = ?');args.push(query.status);}
  }
  if(type==='pedidos'&&query.cliente_id!==undefined){where.push('p.cliente_id = ?');args.push(int(query.cliente_id,'cliente_id'));}
  if(type==='itens_pedido')for(const key of ['pedido_id','produto_id'])if(query[key]!==undefined){where.push(`ip.${key} = ?`);args.push(int(query[key],key));}
  return { sql:where.length?'WHERE '+where.join(' AND '):'', args };
}
router.get('/dashboard/summary', async(req,res,next)=>{
  try {
    const {sql,args}=filters('pedidos',req.query),db=getPool();
    const [clientRows]=await db.query('SELECT COUNT(*) AS total FROM clientes');
    const [productRows]=await db.query('SELECT COUNT(*) AS total FROM produtos');
    const [orderRows]=await db.query(`SELECT COUNT(*) AS total FROM pedidos p ${sql}`,args);
    const [statuses]=await db.query(`SELECT p.status,COUNT(*) AS total FROM pedidos p ${sql} GROUP BY p.status`,args);
    const [revenueRows]=await db.query(`SELECT COALESCE(SUM(ip.quantidade*ip.preco_unitario),0) AS total, COUNT(DISTINCT p.id) AS pedidosEntregues FROM itens_pedido ip JOIN pedidos p ON p.id=ip.pedido_id ${sql ? sql+' AND':'WHERE'} p.status='Entregue'`,args);
    const revenue=Number(revenueRows[0].total),delivered=Number(revenueRows[0].pedidosEntregues);
    const map=Object.fromEntries(statuses.map(s=>[s.status,Number(s.total)]));
    res.json({clientes:clientRows[0].total,produtos:productRows[0].total,pedidos:orderRows[0].total,pedidosPorStatus:map,entregues:map.Entregue||0,faturamento:Math.round(revenue*100)/100,ticketMedio:delivered?revenue/delivered:0});
  }catch(e){next(e);}
});
router.get('/:resource',async(req,res,next)=>{
  try {
    const resource=req.params.resource, r=resources[resource];
    if(!r)return res.status(404).json({error:{code:'NOT_FOUND',message:'Recurso não encontrado.'}});
    const {sql,args}=filters(resource,req.query),db=getPool();
    const [countRows]=await db.query(`SELECT COUNT(*) AS total FROM ${r.from} ${sql}`,args);
    const paged=req.query.page!==undefined||req.query.limit!==undefined;
    let page,limit,offset;
    if(paged){page=int(req.query.page??1,'page',1000000);limit=int(req.query.limit??12,'limit',100);offset=(page-1)*limit;}
    const select=`SELECT ${r.alias}.* FROM ${r.from} ${sql} ORDER BY ${r.order}`;
    const [rows]=paged?await db.query(select+' LIMIT ? OFFSET ?',[...args,limit,offset]):await db.query(select,args);
    if(!paged)return res.json(rows);
    const total=countRows[0].total;
    res.json({data:rows,pagination:{page,limit,total,totalPages:Math.ceil(total/limit),hasPreviousPage:page>1,hasNextPage:page*limit<total}});
  }catch(e){next(e);}
});
export default router;
