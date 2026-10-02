import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}


export const prisma: PrismaClient =
    global.__prisma ??
    new PrismaClient({
        log:
        process.env.NODE_ENV === "development"
            ? ["query", "warn", "error"]
            : ["warn", "error"],
    });

    if (process.env.NODE_ENV !== "production") {
    global.__prisma = prisma;
}



export const TX_OPTIONS = {
  timeout: 30_000,  // max time the transaction body can run (ms)
  maxWait: 10_000,  // max time to wait for a free connection (ms)
} as const;