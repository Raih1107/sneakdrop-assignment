import "dotenv/config" ;
import { buildApp } from "./app";
import {prisma} from "./db/prisma";


const PORT = parseInt(process.env.PORT ?? "3000" , 10);

;

async function main(){
    try {
        await prisma.$queryRaw`SELECT 1 `;
        console.log("[DB] connected to postgreSQL");
    } catch (err) {
        console.error("[DB] failed to connect");
        console.error(err);
        process.exit(1);
    }
}


const app = buildApp();
const server = app.listen(PORT, () => {
    console.log(`[SERVER] Listening on http://localhost:${PORT}`);
})


async function shutdown(signal: string){
    console.log(`[SERVER] ${signal} received - shutting down gracefully`);
    
} 