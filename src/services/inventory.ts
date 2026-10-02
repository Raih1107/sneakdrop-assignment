
import { prisma, TX_OPTIONS } from "../db/prisma";
import { v4 as uuidv4 } from "uuid";


const PRODUCT_ID = 1;


function holdDurationMs(): number {
  return parseInt(process.env.HOLD_DURATION_SECONDS ?? "300", 10) * 1000;
}


export async function reserveOrQueue(userId: string) {
    return await prisma.$transaction(async (tx) => {

    const products = await tx.$queryRaw<Array<{
        id: number;
        availableStock: number;
        totalStock: number;
    }>>`
        SELECT id, "availableStock", "totalStock"
        FROM "Product"
        WHERE id = ${PRODUCT_ID}
        FOR UPDATE
    `;

    const product = products[0];
    if (!product) throw new Error("Product not found");


    const existingHold = await tx.hold.findFirst({
        where: { userId, status: "ACTIVE" },
    });
    if (existingHold) {
        return {
            error: "You already have an active hold",
            status: 409,
            holdId: existingHold.id,
            expiresAt: existingHold.expiresAt,
        };
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "User not found", status: 404 };
    if (user.totalPurchases >= 2) {
        return { error: "Maximum purchases reached (2)", status: 403 };
    }



    if (product.availableStock > 0) {

    const expiresAt = new Date(Date.now() + holdDurationMs());
    const holdId = uuidv4();


        await tx.$executeRaw`
            UPDATE "Product"
            SET "availableStock" = "availableStock" - 1,
                "updatedAt"      = NOW()
            WHERE id = ${PRODUCT_ID}
        `;

        await tx.hold.create({
            data: { id: holdId, userId, productId: PRODUCT_ID, expiresAt },
        });

        return { reserved: true, holdId, expiresAt };
    } else {

    const existingQueue = await tx.queueEntry.findFirst({
        where: { userId, status: "WAITING" },
    });
    if (existingQueue) {
        return { error: "Already in queue", status: 409 };
    }


    const waitingCount = await tx.queueEntry.count({
        where: { status: "WAITING" },
    });

        await tx.queueEntry.create({
            data: {
            id: uuidv4(),
            userId,
            productId: PRODUCT_ID,
            status: "WAITING",
            },
        });


        return { queued: true, position: waitingCount + 1 };
    }
}, TX_OPTIONS);
}

