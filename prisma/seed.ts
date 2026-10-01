import "dotenv/config";
import {PrismaClient} from "@prisma/client";


const prisma = new PrismaClient();


async function main() {
    console.log("Resetting all data before seeding!");

    //Delete in FK-safe order (children before parents)
    await prisma.paymentEvent.deleteMany();
    await prisma.order.deleteMany();
    await prisma.hold.deleteMany();
    await prisma.queueEntry.deleteMany();

    //Reset the product stock
    await prisma.product.upsert({
        where : {id : 1},
        update : {availableStock : 20},
        create : {
            id : 1,
            name : "Air Sneaker",
            totalStock : 20,
            availableStock : 20
        },
    });
    console.log("Product: Air Sneaker - 20 pairs")


    await prisma.user.updateMany({data: {totalPurchases: 0}});

    const users = Array.from({length : 1000}, (_,i) => ({
            id: `user_${i + 1}`,
            email: `user_${i + 1}@test.com`,
            name: `Test User ${i + 1}`,
            totalPurchases: 0,
    }));

    const { count } = await prisma.user.createMany({
        data: users,
        skipDuplicates: true,
    });

    console.log(`✅  Users: ${count} created (existing users have been reset)`);
    console.log("Seed complete. Invariant: availableStock(20) + ACTIVE(0) + PURCHASED(0) = 20");

}



main()
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
