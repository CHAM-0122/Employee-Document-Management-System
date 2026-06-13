import { prisma } from "@/src/lib/db/prisma";
import type { EmploymentContractPayload } from "@/src/lib/intake-contracts/types";

export async function createAdminInvite(params: {
  invitedName?: string;
  inviteEmail: string;
  storeId: string;
  expiresAt: string;
  token: string;
}) {
  return prisma.employeeIntake.create({
    data: {
      intakeToken: params.token,
      storeId: params.storeId,
      status: "sent",
      invitedName: params.invitedName || null,
      inviteEmail: params.inviteEmail.toLowerCase(),
      inviteExpiresAt: new Date(params.expiresAt),
      fullName: params.invitedName || null,
      email: params.inviteEmail.toLowerCase(),
    },
  });
}

export async function listAdminIntakes(params: {
  keyword?: string;
  storeId?: string;
  status?: string;
  page: number;
  pageSize: number;
  adminStoreId?: string;
  restrictToStore: boolean;
}) {
  const where = {
    ...(params.restrictToStore && params.adminStoreId
      ? { storeId: params.adminStoreId }
      : {}),
    ...(params.storeId ? { storeId: params.storeId } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.keyword
      ? {
          OR: [
            { fullName: { contains: params.keyword, mode: "insensitive" as const } },
            { email: { contains: params.keyword, mode: "insensitive" as const } },
            { inviteEmail: { contains: params.keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.employeeIntake.findMany({
      where,
      include: {
        store: true,
        employmentContract: true,
        documentConsents: true,
        auditLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.employeeIntake.count({ where }),
  ]);

  return { items, total };
}

export async function findAdminIntakeDetail(id: string, adminStoreId?: string, restrictToStore = false) {
  return prisma.employeeIntake.findFirst({
    where: {
      id,
      ...(restrictToStore && adminStoreId ? { storeId: adminStoreId } : {}),
    },
    include: {
      store: true,
      employmentContract: {
        include: {
          jobPositionMaster: true,
        },
      },
      bankAccount: true,
      myNumberRecord: true,
      documentConsents: true,
      documentSignature: true,
      generatedDocuments: true,
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function updateAdminEmploymentContract(params: {
  id: string;
  payload: EmploymentContractPayload;
  adminStoreId?: string;
  restrictToStore: boolean;
}) {
  const intake = await findAdminIntakeDetail(
    params.id,
    params.adminStoreId,
    params.restrictToStore,
  );

  if (!intake) {
    return null;
  }

  const position = await prisma.jobPositionMaster.findUnique({
    where: { code: params.payload.jobPositionCode },
  });

  if (!position) {
    throw new Error("選択された役職マスタが見つかりません");
  }

  const normalizedContractEndDate =
    params.payload.contractEndDate === "" ||
    params.payload.contractEndDate === "期間の定めなし"
      ? params.payload.contractStartDate
      : params.payload.contractEndDate;

  return prisma.employmentContract.upsert({
    where: { employeeIntakeId: intake.id },
    update: {
      jobPositionMasterId: position.id,
      employmentCategory: params.payload.employmentCategory,
      contractStartDate: new Date(params.payload.contractStartDate),
      contractEndDate: new Date(normalizedContractEndDate),
      renewalPatternText: params.payload.renewalPatternText,
      workLocationName: params.payload.workLocationName,
      workLocationAddress: params.payload.workLocationAddress,
      dutyDescription: params.payload.dutyDescription,
      currentRoleLabel: params.payload.currentRoleLabel,
      shiftStartTime: new Date(`1970-01-01T${params.payload.shiftStartTime}:00Z`),
      shiftEndTime: new Date(`1970-01-01T${params.payload.shiftEndTime}:00Z`),
      breakMinutes: params.payload.breakMinutes,
      overtimeAllowed: params.payload.overtimeAllowed,
      holidayWorkAllowed: params.payload.holidayWorkAllowed,
      holidayRuleText: params.payload.holidayRuleText,
      basicSalaryMonthly: params.payload.basicSalaryMonthly,
      dutyAllowanceMonthly: params.payload.dutyAllowanceMonthly,
      hourlyWage: params.payload.hourlyWage ?? null,
      fixedOvertimeHoursNote: params.payload.fixedOvertimeHoursNote || null,
      commutingAllowanceMonthly:
        params.payload.commutingAllowanceMonthly ?? null,
      commutingAllowanceNote: params.payload.commutingAllowanceNote || null,
      payClosingDay: params.payload.payClosingDay,
      payDate: params.payload.payDate,
      wagePaymentMethod: params.payload.wagePaymentMethod,
      hasRaise: params.payload.hasRaise,
      hasBonus: params.payload.hasBonus,
      hasRetirementPay: params.payload.hasRetirementPay,
      retirementRuleText: params.payload.retirementRuleText,
      socialInsuranceNote: params.payload.socialInsuranceNote || null,
      employmentInsuranceNote: params.payload.employmentInsuranceNote || null,
      transferPossibilityNote: params.payload.transferPossibilityNote || null,
    },
    create: {
      employeeIntakeId: intake.id,
      jobPositionMasterId: position.id,
      employmentCategory: params.payload.employmentCategory,
      contractStartDate: new Date(params.payload.contractStartDate),
      contractEndDate: new Date(normalizedContractEndDate),
      renewalPatternText: params.payload.renewalPatternText,
      workLocationName: params.payload.workLocationName,
      workLocationAddress: params.payload.workLocationAddress,
      dutyDescription: params.payload.dutyDescription,
      currentRoleLabel: params.payload.currentRoleLabel,
      shiftStartTime: new Date(`1970-01-01T${params.payload.shiftStartTime}:00Z`),
      shiftEndTime: new Date(`1970-01-01T${params.payload.shiftEndTime}:00Z`),
      breakMinutes: params.payload.breakMinutes,
      overtimeAllowed: params.payload.overtimeAllowed,
      holidayWorkAllowed: params.payload.holidayWorkAllowed,
      holidayRuleText: params.payload.holidayRuleText,
      basicSalaryMonthly: params.payload.basicSalaryMonthly,
      dutyAllowanceMonthly: params.payload.dutyAllowanceMonthly,
      hourlyWage: params.payload.hourlyWage ?? null,
      fixedOvertimeHoursNote: params.payload.fixedOvertimeHoursNote || null,
      commutingAllowanceMonthly:
        params.payload.commutingAllowanceMonthly ?? null,
      commutingAllowanceNote: params.payload.commutingAllowanceNote || null,
      payClosingDay: params.payload.payClosingDay,
      payDate: params.payload.payDate,
      wagePaymentMethod: params.payload.wagePaymentMethod,
      hasRaise: params.payload.hasRaise,
      hasBonus: params.payload.hasBonus,
      hasRetirementPay: params.payload.hasRetirementPay,
      retirementRuleText: params.payload.retirementRuleText,
      socialInsuranceNote: params.payload.socialInsuranceNote || null,
      employmentInsuranceNote: params.payload.employmentInsuranceNote || null,
      transferPossibilityNote: params.payload.transferPossibilityNote || null,
      submittedAt: new Date(),
    },
  });
}

export async function markAdminIntakeReviewed(params: {
  id: string;
  adminUserId: string;
  adminStoreId?: string;
  restrictToStore: boolean;
}) {
  const intake = await findAdminIntakeDetail(
    params.id,
    params.adminStoreId,
    params.restrictToStore,
  );

  if (!intake) {
    return null;
  }

  return prisma.employeeIntake.update({
    where: { id: params.id },
    data: {
      status: "reviewed",
      reviewedAt: new Date(),
      reviewedByAdminId: params.adminUserId,
    },
  });
}

export async function markAdminIntakeReturned(params: {
  id: string;
  adminStoreId?: string;
  restrictToStore: boolean;
}) {
  const intake = await findAdminIntakeDetail(
    params.id,
    params.adminStoreId,
    params.restrictToStore,
  );

  if (!intake) {
    return null;
  }

  return prisma.employeeIntake.update({
    where: { id: params.id },
    data: {
      status: "returned",
    },
  });
}

export async function updateAdminDocumentState(params: {
  id: string;
  documentType:
    | "employment_contract"
    | "employee_pledge"
    | "sns_pledge"
    | "retirement_pledge";
  nextState: "returned" | "invalidated";
  adminStoreId?: string;
  restrictToStore: boolean;
}) {
  const intake = await findAdminIntakeDetail(
    params.id,
    params.adminStoreId,
    params.restrictToStore,
  );

  if (!intake) {
    return null;
  }

  const consent = intake.documentConsents.find(
    (item) => item.documentType === params.documentType,
  );

  if (!consent) {
    return null;
  }

  if (params.nextState === "returned") {
    await prisma.employeeIntake.update({
      where: { id: params.id },
      data: {
        status: "returned",
      },
    });
  }

  return {
    intakeId: intake.id,
    documentType: consent.documentType,
    intakeStatus:
      params.nextState === "returned" ? "returned" : intake.status,
  };
}
