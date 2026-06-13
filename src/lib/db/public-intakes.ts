import { prisma } from "@/src/lib/db/prisma";
import { decryptString, encryptString } from "@/src/lib/security/encryption";
import type {
  AttributesPayload,
  BankAccountPayload,
  EmploymentPayload,
  EmploymentContractPayload,
  MyNumberPayload,
  ProfilePayload,
} from "@/src/lib/intake-contracts/types";

export async function findPublicIntakeByToken(token: string) {
  return prisma.employeeIntake.findUnique({
    where: { intakeToken: token },
    include: {
      store: true,
      bankAccount: true,
      myNumberRecord: true,
      employmentContract: {
        include: {
          jobPositionMaster: true,
        },
      },
      documentConsents: true,
      documentSignature: true,
      auditLogs: {
        where: {
          actorType: "admin",
          action: "returned",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function updatePublicIntakeProfile(
  intakeId: string,
  payload: ProfilePayload,
) {
  const birthDate = new Date(payload.birthDate);
  const today = new Date();
  const age =
    today.getFullYear() -
    birthDate.getFullYear() -
    (today <
    new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      ? 1
      : 0);

  return prisma.employeeIntake.update({
    where: { id: intakeId },
    data: {
      status: "in_progress",
      pledgeDate: new Date(payload.pledgeDate),
      fullName: payload.fullName,
      fullNameKana: payload.fullNameKana,
      gender: payload.gender,
      birthDate,
      ageAtSubmission: age,
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      postalCode: payload.postalCode || null,
      currentAddress: payload.currentAddress,
      residentSameAsCurrent: payload.residentSameAsCurrent,
      residentAddress: payload.residentSameAsCurrent
        ? payload.currentAddress
        : (payload.residentAddress ?? null),
      profilePhotoDataUrl: payload.photoDataUrl || null,
      profilePhotoFilePath: null,
      isMinor: age < 18,
      startedAt: new Date(),
      lastSavedAt: new Date(),
    },
  });
}

export async function updatePublicIntakeEmployment(
  intakeId: string,
  payload: EmploymentPayload,
) {
  return prisma.employeeIntake.update({
    where: { id: intakeId },
    data: {
      status: "in_progress",
      emergencyContactName: payload.emergencyContactName,
      emergencyContactKana: payload.emergencyContactKana || null,
      emergencyContactRelation: payload.emergencyContactRelation,
      emergencyContactPhone: payload.emergencyContactPhone,
      commuteMethod: payload.commuteMethod,
      commuteDistanceKm: payload.commuteDistanceKm,
      referralSource: payload.referralSource,
      referralPerson: payload.referralPerson || null,
      referralStoreName: payload.referralStoreName || null,
      workDaysPerWeek: payload.workDaysPerWeek,
      workHoursPerWeek: payload.workHoursPerWeek,
      shiftStartTime: payload.shiftStartTime ? new Date(`1970-01-01T${payload.shiftStartTime}:00Z`) : null,
      shiftEndTime: payload.shiftEndTime ? new Date(`1970-01-01T${payload.shiftEndTime}:00Z`) : null,
      lastSavedAt: new Date(),
    },
  });
}

export async function updatePublicIntakeAttributes(
  intakeId: string,
  payload: AttributesPayload,
) {
  return prisma.employeeIntake.update({
    where: { id: intakeId },
    data: {
      status: "in_progress",
      hasSecondJob: payload.hasSecondJob,
      secondJobType: payload.secondJobType || null,
      secondJobNote: payload.secondJobNote || null,
      isStudent: payload.isStudent,
      schoolType: payload.schoolType,
      schoolGrade: payload.schoolGrade || null,
      schoolSchedule: payload.schoolSchedule,
      schoolName: payload.schoolName || null,
      guardianName: payload.guardianName || null,
      guardianRelation: payload.guardianRelation || null,
      guardianPhone: payload.guardianPhone || null,
      isForeignNational: payload.isForeignNational ?? false,
      residenceCardFrontDataUrl: payload.residenceCardFrontDataUrl || null,
      residenceCardBackDataUrl: payload.residenceCardBackDataUrl || null,
      lastSavedAt: new Date(),
    },
  });
}

export async function savePublicIntakeBankAccount(
  intakeId: string,
  payload: BankAccountPayload,
) {
  const normalizedNumber = payload.accountNumber.replace(/\D/g, "");

  return prisma.bankAccount.upsert({
    where: { employeeIntakeId: intakeId },
    update: {
      bankName: payload.bankName,
      branchName: payload.branchName,
      branchCode: payload.branchCode,
      accountType: payload.accountType,
      // TODO: replace with application-level encryption before production rollout.
      encryptedAccountNumber: encryptString(normalizedNumber),
      accountNumberLast4: normalizedNumber.slice(-4),
      accountHolderKana: payload.accountHolderKana,
      bankBookImageDataUrl: payload.bankBookImageDataUrl,
      agreedUsage: payload.agreedUsage,
      confirmedOwnAccount: payload.confirmedOwnAccount,
      submittedAt: new Date(),
    },
    create: {
      employeeIntakeId: intakeId,
      bankName: payload.bankName,
      branchName: payload.branchName,
      branchCode: payload.branchCode,
      accountType: payload.accountType,
      // TODO: replace with application-level encryption before production rollout.
      encryptedAccountNumber: encryptString(normalizedNumber),
      accountNumberLast4: normalizedNumber.slice(-4),
      accountHolderKana: payload.accountHolderKana,
      bankBookImageDataUrl: payload.bankBookImageDataUrl,
      agreedUsage: payload.agreedUsage,
      confirmedOwnAccount: payload.confirmedOwnAccount,
      submittedAt: new Date(),
    },
  });
}

export async function savePublicIntakeMyNumber(
  intakeId: string,
  payload: MyNumberPayload,
) {
  const normalizedMyNumber = payload.myNumber.replace(/\D/g, "");

  return prisma.myNumberRecord.upsert({
    where: { employeeIntakeId: intakeId },
    update: {
      // TODO: replace with application-level encryption before production rollout.
      encryptedMyNumber: encryptString(normalizedMyNumber),
      myNumberLast4: normalizedMyNumber.slice(-4),
      purposeOfUseVersion: payload.purposeOfUseVersion,
      agreedPurpose: payload.agreedPurpose,
      confirmedAccuracy: payload.confirmedAccuracy,
      submittedAt: new Date(),
    },
    create: {
      employeeIntakeId: intakeId,
      // TODO: replace with application-level encryption before production rollout.
      encryptedMyNumber: encryptString(normalizedMyNumber),
      myNumberLast4: normalizedMyNumber.slice(-4),
      purposeOfUseVersion: payload.purposeOfUseVersion,
      agreedPurpose: payload.agreedPurpose,
      confirmedAccuracy: payload.confirmedAccuracy,
      submittedAt: new Date(),
    },
  });
}

export async function savePublicEmploymentContract(
  intakeId: string,
  payload: EmploymentContractPayload,
) {
  const normalizedContractEndDate =
    payload.contractEndDate === "" ||
    payload.contractEndDate === "期間の定めなし"
      ? payload.contractStartDate
      : payload.contractEndDate;
  const position = await prisma.jobPositionMaster.findUnique({
    where: { code: payload.jobPositionCode },
  });

  if (!position) {
    throw new Error("選択された役職マスタが見つかりません");
  }

  const contract = await prisma.employmentContract.upsert({
    where: { employeeIntakeId: intakeId },
    update: {
      jobPositionMasterId: position.id,
      employmentCategory: payload.employmentCategory,
      contractStartDate: new Date(payload.contractStartDate),
      contractEndDate: new Date(normalizedContractEndDate),
      renewalPatternText: payload.renewalPatternText,
      workLocationName: payload.workLocationName,
      workLocationAddress: payload.workLocationAddress,
      dutyDescription: payload.dutyDescription,
      currentRoleLabel: payload.currentRoleLabel,
      shiftStartTime: new Date(`1970-01-01T${payload.shiftStartTime}:00Z`),
      shiftEndTime: new Date(`1970-01-01T${payload.shiftEndTime}:00Z`),
      breakMinutes: payload.breakMinutes,
      overtimeAllowed: payload.overtimeAllowed,
      holidayWorkAllowed: payload.holidayWorkAllowed,
      holidayRuleText: payload.holidayRuleText,
      basicSalaryMonthly: payload.basicSalaryMonthly,
      dutyAllowanceMonthly: payload.dutyAllowanceMonthly,
      hourlyWage: payload.hourlyWage ?? null,
      fixedOvertimeHoursNote: payload.fixedOvertimeHoursNote || null,
      commutingAllowanceMonthly: payload.commutingAllowanceMonthly ?? null,
      commutingAllowanceNote: payload.commutingAllowanceNote || null,
      payClosingDay: payload.payClosingDay,
      payDate: payload.payDate,
      wagePaymentMethod: payload.wagePaymentMethod,
      hasRaise: payload.hasRaise,
      hasBonus: payload.hasBonus,
      hasRetirementPay: payload.hasRetirementPay,
      retirementRuleText: payload.retirementRuleText,
      socialInsuranceNote: payload.socialInsuranceNote || null,
      employmentInsuranceNote: payload.employmentInsuranceNote || null,
      transferPossibilityNote: payload.transferPossibilityNote || null,
      submittedAt: new Date(),
    },
    create: {
      employeeIntakeId: intakeId,
      jobPositionMasterId: position.id,
      employmentCategory: payload.employmentCategory,
      contractStartDate: new Date(payload.contractStartDate),
      contractEndDate: new Date(normalizedContractEndDate),
      renewalPatternText: payload.renewalPatternText,
      workLocationName: payload.workLocationName,
      workLocationAddress: payload.workLocationAddress,
      dutyDescription: payload.dutyDescription,
      currentRoleLabel: payload.currentRoleLabel,
      shiftStartTime: new Date(`1970-01-01T${payload.shiftStartTime}:00Z`),
      shiftEndTime: new Date(`1970-01-01T${payload.shiftEndTime}:00Z`),
      breakMinutes: payload.breakMinutes,
      overtimeAllowed: payload.overtimeAllowed,
      holidayWorkAllowed: payload.holidayWorkAllowed,
      holidayRuleText: payload.holidayRuleText,
      basicSalaryMonthly: payload.basicSalaryMonthly,
      dutyAllowanceMonthly: payload.dutyAllowanceMonthly,
      hourlyWage: payload.hourlyWage ?? null,
      fixedOvertimeHoursNote: payload.fixedOvertimeHoursNote || null,
      commutingAllowanceMonthly: payload.commutingAllowanceMonthly ?? null,
      commutingAllowanceNote: payload.commutingAllowanceNote || null,
      payClosingDay: payload.payClosingDay,
      payDate: payload.payDate,
      wagePaymentMethod: payload.wagePaymentMethod,
      hasRaise: payload.hasRaise,
      hasBonus: payload.hasBonus,
      hasRetirementPay: payload.hasRetirementPay,
      retirementRuleText: payload.retirementRuleText,
      socialInsuranceNote: payload.socialInsuranceNote || null,
      employmentInsuranceNote: payload.employmentInsuranceNote || null,
      transferPossibilityNote: payload.transferPossibilityNote || null,
      submittedAt: new Date(),
    },
  });

  if (payload.workDaysPerWeek !== undefined) {
    await prisma.employeeIntake.update({
      where: { id: intakeId },
      data: { workDaysPerWeek: payload.workDaysPerWeek },
    });
  }

  return contract;
}

export async function listActiveDocumentTemplates() {
  return prisma.documentTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ documentType: "asc" }, { createdAt: "desc" }],
  });
}

export async function listActiveJobPositionMasters() {
  return prisma.jobPositionMaster.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "asc" }],
  });
}

export async function saveEmploymentContractConsent(params: {
  intakeId: string;
  templateId: string;
  version: string;
  bodySnapshotHtml: string;
  scrolledToEnd?: boolean;
  ipAddress: string;
  userAgent: string;
}) {
  return prisma.documentConsent.upsert({
    where: {
      employeeIntakeId_documentType: {
        employeeIntakeId: params.intakeId,
        documentType: "employment_contract",
      },
    },
    update: {
      documentTemplateId: params.templateId,
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeRules: true,
      agreeLiability: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    create: {
      employeeIntakeId: params.intakeId,
      documentTemplateId: params.templateId,
      documentType: "employment_contract",
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeRules: true,
      agreeLiability: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function saveEmployeePledgeConsent(params: {
  intakeId: string;
  templateId: string;
  version: string;
  bodySnapshotHtml: string;
  scrolledToEnd?: boolean;
  ipAddress: string;
  userAgent: string;
}) {
  return prisma.documentConsent.upsert({
    where: {
      employeeIntakeId_documentType: {
        employeeIntakeId: params.intakeId,
        documentType: "employee_pledge",
      },
    },
    update: {
      documentTemplateId: params.templateId,
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeConfidentiality: true,
      agreeDiscipline: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    create: {
      employeeIntakeId: params.intakeId,
      documentTemplateId: params.templateId,
      documentType: "employee_pledge",
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeConfidentiality: true,
      agreeDiscipline: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function saveSnsPledgeConsent(params: {
  intakeId: string;
  templateId: string;
  version: string;
  bodySnapshotHtml: string;
  scrolledToEnd?: boolean;
  ipAddress: string;
  userAgent: string;
}) {
  return prisma.documentConsent.upsert({
    where: {
      employeeIntakeId_documentType: {
        employeeIntakeId: params.intakeId,
        documentType: "sns_pledge",
      },
    },
    update: {
      documentTemplateId: params.templateId,
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeRules: true,
      agreeMedia: true,
      agreeLiability: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    create: {
      employeeIntakeId: params.intakeId,
      documentTemplateId: params.templateId,
      documentType: "sns_pledge",
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeRules: true,
      agreeMedia: true,
      agreeLiability: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function saveRetirementPledgeConsent(params: {
  intakeId: string;
  templateId: string;
  version: string;
  bodySnapshotHtml: string;
  scrolledToEnd?: boolean;
  ipAddress: string;
  userAgent: string;
}) {
  return prisma.documentConsent.upsert({
    where: {
      employeeIntakeId_documentType: {
        employeeIntakeId: params.intakeId,
        documentType: "retirement_pledge",
      },
    },
    update: {
      documentTemplateId: params.templateId,
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeConfidentiality: true,
      agreeRules: true,
      agreeDiscipline: true,
      agreeLiability: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    create: {
      employeeIntakeId: params.intakeId,
      documentTemplateId: params.templateId,
      documentType: "retirement_pledge",
      version: params.version,
      bodySnapshotHtml: params.bodySnapshotHtml,
      scrolledToEnd: params.scrolledToEnd ?? false,
      agreeRead: true,
      agreeConfidentiality: true,
      agreeRules: true,
      agreeDiscipline: true,
      agreeLiability: true,
      consentedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function saveDocumentSignature(params: {
  intakeId: string;
  signerName: string;
  signedDate: string;
  signatureFilePath: string;
  signatureDataUrl?: string;
  signatureFileType: string;
  ipAddress: string;
  userAgent: string;
}) {
  return prisma.documentSignature.upsert({
    where: { employeeIntakeId: params.intakeId },
    update: {
      signerName: params.signerName,
      signedDate: new Date(params.signedDate),
      signatureFilePath: params.signatureFilePath,
      signatureDataUrl: params.signatureDataUrl ?? null,
      signatureFileType: params.signatureFileType,
      signedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    create: {
      employeeIntakeId: params.intakeId,
      signerName: params.signerName,
      signedDate: new Date(params.signedDate),
      signatureFilePath: params.signatureFilePath,
      signatureDataUrl: params.signatureDataUrl ?? null,
      signatureFileType: params.signatureFileType,
      signedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function submitPublicIntake(intakeId: string) {
  return prisma.employeeIntake.update({
    where: { id: intakeId },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      confirmInputAccuracy: true,
      confirmElectronicConsent: true,
    },
    include: {
      documentConsents: true,
      documentSignature: true,
    },
  });
}

export async function listGeneratedDocuments(intakeId: string) {
  return prisma.generatedDocument.findMany({
    where: { employeeIntakeId: intakeId },
    orderBy: { generatedAt: "desc" },
  });
}

export function decryptStoredAccountNumber(encryptedValue: string) {
  return decryptString(encryptedValue);
}
