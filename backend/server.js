import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/api.js';
import { initializeDatabase } from './database.js';

const app=express();
const PORT=Number(process.env.PORT||3000);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../frontend');
const origins=(process.env.FRONTEND_ORIGIN||'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000').split(',').map(s=>s.trim());
app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);cb(new Error('CORS: origem não autorizada.'));}}));
app.use(express.json({limit:'100kb'}));
app.get('/api/health',(_req,res)=>res.json({status:'ok',message:'GeekShop Analytics API funcionando!'}));
app.use('/api',apiRoutes);
app.use(express.static(root));
app.use((req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Recurso não encontrado.'}}));
app.use((err,_req,res,_next)=>{console.error(err.message);res.status(err.status||(err.message.startsWith('CORS:')?403:500)).json({error:{code:err.status===400?'VALIDATION_ERROR':'SERVER_ERROR',message:err.status===400?err.message:'Falha na requisição.'}});});
try {
  await initializeDatabase();
  app.listen(PORT,()=>console.log(`GeekShop disponível em http://localhost:${PORT}`));
}catch(error){console.error('Erro ao conectar ao MariaDB/MySQL:',error.message);console.error('Confirme DB_HOST, DB_PORT, DB_USER e DB_PASSWORD no .env e se o MariaDB está em execução.');process.exitCode=1;}
