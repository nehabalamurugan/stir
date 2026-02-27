const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "password123";

async function main() {
  const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: {
      email: TEST_EMAIL,
      passwordHash,
      name: "Test User",
      avatarColor: "#6366f1",
    },
    update: { passwordHash, name: "Test User" },
  });
  console.log("Seed done. Use this to test login:");
  console.log("  Email:", TEST_EMAIL);
  console.log("  Password:", TEST_PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
