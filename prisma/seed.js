const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { code: "shibuya" },
    update: { name: "渋谷店", isActive: true },
    create: { code: "shibuya", name: "渋谷店" },
  });

  await prisma.documentTemplate.upsert({
    where: {
      documentType_version: {
        documentType: "employee_pledge",
        version: "EP-001",
      },
    },
    update: {
      title: "従業員誓約書",
      bodyHtml: "<h2>従業員誓約書</h2><p>私は、業務上知り得た情報を適切に管理し、第三者へ漏えいしません。</p>",
      isActive: true,
    },
    create: {
      documentType: "employee_pledge",
      version: "EP-001",
      title: "従業員誓約書",
      bodyHtml: "<h2>従業員誓約書</h2><p>私は、業務上知り得た情報を適切に管理し、第三者へ漏えいしません。</p>",
      isActive: true,
    },
  });

  await prisma.documentTemplate.upsert({
    where: {
      documentType_version: {
        documentType: "sns_pledge",
        version: "SP-001",
      },
    },
    update: {
      title: "SNS誓約書",
      bodyHtml: "<h2>SNS誓約書</h2><p>私は、会社・顧客・従業員に関する非公開情報をSNSへ投稿しません。</p>",
      isActive: true,
    },
    create: {
      documentType: "sns_pledge",
      version: "SP-001",
      title: "SNS誓約書",
      bodyHtml: "<h2>SNS誓約書</h2><p>私は、会社・顧客・従業員に関する非公開情報をSNSへ投稿しません。</p>",
      isActive: true,
    },
  });

  await prisma.documentTemplate.upsert({
    where: {
      documentType_version: {
        documentType: "retirement_pledge",
        version: "RP-001",
      },
    },
    update: {
      title: "退職時誓約書 兼 守秘義務に関する誓約書",
      bodyHtml: "<h2>退職時誓約書 兼 守秘義務に関する誓約書</h2><p>退職時に提出する守秘義務等の誓約書です。</p>",
      isActive: true,
    },
    create: {
      documentType: "retirement_pledge",
      version: "RP-001",
      title: "退職時誓約書 兼 守秘義務に関する誓約書",
      bodyHtml: "<h2>退職時誓約書 兼 守秘義務に関する誓約書</h2><p>退職時に提出する守秘義務等の誓約書です。</p>",
      isActive: true,
    },
  });

  await prisma.employeeIntake.upsert({
    where: { intakeToken: "sample-token" },
    update: {
      status: "submitted",
      fullName: "山田 太郎",
      email: "taro.yamada@example.com",
      phone: "09012345678",
      currentAddress: "東京都渋谷区渋谷1-2-3",
      emergencyContactName: "山田 花子",
      emergencyContactRelation: "母",
      emergencyContactPhone: "09099990000",
      commuteMethod: "train",
      hasSecondJob: "no",
    },
    create: {
      intakeToken: "sample-token",
      storeId: store.id,
      status: "submitted",
      inviteEmail: "taro.yamada@example.com",
      inviteExpiresAt: new Date("2026-05-31T23:59:59+09:00"),
      pledgeDate: new Date("2026-05-15"),
      fullName: "山田 太郎",
      fullNameKana: "ヤマダ タロウ",
      birthDate: new Date("2002-04-10"),
      email: "taro.yamada@example.com",
      phone: "09012345678",
      currentAddress: "東京都渋谷区渋谷1-2-3",
      emergencyContactName: "山田 花子",
      emergencyContactRelation: "母",
      emergencyContactPhone: "09099990000",
      commuteMethod: "train",
      hasSecondJob: "no",
      submittedAt: new Date("2026-05-15T11:14:00+09:00"),
    },
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
