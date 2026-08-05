import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const USERS = [
  { name: "Alex Rivera", color: "#F97316" },
  { name: "Jordan Lee", color: "#6366F1" },
  { name: "Sam Patel", color: "#10B981" },
];

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { name: user.name },
      update: {},
      create: user,
    });
  }
  console.log(`Seeded ${USERS.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
