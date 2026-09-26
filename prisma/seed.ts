import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Clean slate.
 *
 * The service now runs with a single administrator account: groups are named
 * after the Khodam (created from the admin panel) and children arrive through
 * the public form, so there is nothing else to seed.
 */
async function main() {
  console.log("🌱 Starting Sunday School database seeding...");

  // Wipe everything so a reseed always lands on a known, empty state.
  await prisma.attendanceRecord.deleteMany();
  await prisma.student.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const hashedPasscode = await bcrypt.hash("saintgeorge", 10);
  await prisma.user.create({
    data: {
      username: "grade5boys",
      passcode: hashedPasscode,
      role: "ADMIN",
      assignedGroup: null,
      assistantName: "أمين خدمة مدارس الأحد",
      assistantPhone: "+970553071353",
    },
  });

  console.log("✅ Seeded 1 admin account (grade5boys). No groups and no children yet.");
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
