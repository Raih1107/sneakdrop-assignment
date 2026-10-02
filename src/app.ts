import express , {Request, Response, NextFunction} from "express";
import path from "path";
import { buyRouter } from "./routes/buy";
import { statusRouter } from "./routes/status";
import { payRouter } from "./routes/pay";
import { webhookRouter } from "./routes/webhook";


export function buildApp(){
    const app = express();


    app.use(express.json());

    app.get("/health", (_req: Request, res: Response) => {
        res.json({status : "Ok", timeStamp : new Date().toISOString()});
    });


    //API Routes
    app.use("/api", buyRouter);       
    app.use("/api", statusRouter);    
    app.use("/api", payRouter);       
    app.use("/api", webhookRouter); 



    app.use((err: Error, _req:Request, res: Response, _next:NextFunction) =>{
        console.error("[ERROR]", err.message, err.stack);
        res.status(500).json({error: "Internal Server Error"});

    });


    return app;


}