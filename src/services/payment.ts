import { prisma, TX_OPTIONS } from "../db/prisma";
import { v4 as uuidv4 } from "uuid";

export type PaymentResult =
    | { success: true; orderId: string }
    | { ignored: true; reason: string }
    | { error: string; status: number };

export async function processPayment(
    providerEventId: string,
    holdId: string
    ): Promise<PaymentResult> {
    return await prisma.$transaction(async (tx) => {

        await tx.$queryRaw`
        SELECT id FROM "Product" WHERE id = 1 FOR UPDATE
        `;

        const holdExists = await tx.hold.findUnique({ where: { id: holdId } });
        if (!holdExists) {
        return { ignored: true, reason: "Hold not found" };
        }

        const result = await tx.$executeRaw`
        INSERT INTO "PaymentEvent" (id, "providerEventId", "holdId", status, "createdAt")
        VALUES (${uuidv4()}, ${providerEventId}, ${holdId}, 'PENDING', NOW())
        ON CONFLICT ("providerEventId") DO NOTHING
        `;

        if (result === 0) {
        return { ignored: true, reason: "Duplicate event" };
        }
        const holds = await tx.$queryRaw<Array<{
        id: string;
        userId: string;
        status: string;
        expiresAt: Date;
        }>>`
        SELECT id, "userId", status, "expiresAt"
        FROM "Hold"
        WHERE id = ${holdId}
            AND status = 'ACTIVE'
            AND "expiresAt" > NOW()
        FOR UPDATE
        `;

        if (holds.length === 0) {
        await tx.$executeRaw`
            UPDATE "PaymentEvent"
            SET status = 'IGNORED', "processedAt" = NOW()
            WHERE "providerEventId" = ${providerEventId}
        `;
        return { ignored: true, reason: "Hold expired or already processed" };
        }

        const hold = holds[0];
        const orderId = uuidv4();


        await tx.$executeRaw`
        UPDATE "Hold" SET status = 'PURCHASED' WHERE id = ${holdId}
        `;

        await tx.order.create({
        data: {
            id: orderId,
            userId: hold.userId,
            holdId,
            productId: 1,
        },
        });


        await tx.user.update({
        where: { id: hold.userId },
        data: { totalPurchases: { increment: 1 } },
        });

        await tx.$executeRaw`
        UPDATE "PaymentEvent"
        SET status = 'PROCESSED', "processedAt" = NOW()
        WHERE "providerEventId" = ${providerEventId}
        `;

        return { success: true, orderId };
    }, TX_OPTIONS);
    }
