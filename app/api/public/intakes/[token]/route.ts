import { ok } from "@/src/lib/api/responses";
import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import {
  decryptStoredAccountNumber,
  findPublicIntakeByToken,
  listActiveJobPositionMasters,
} from "@/src/lib/db/public-intakes";
import { apiError } from "@/src/lib/api/responses";
import {
  getMockJobPositions,
  getMockPublicIntakeByToken,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

function resolveDocumentAdminStateFromAudit(
  auditLogs: Array<{
    actionTarget: string | null;
    createdAt: Date;
    metadataJson: unknown;
  }>,
  documentType: string,
) {
  const matched = auditLogs.find((item) => {
    const metadata = item.metadataJson as
      | { documentType?: string; eventType?: string; reason?: string }
      | null;

    return (
      item.actionTarget === `document:${documentType}` &&
      metadata?.documentType === documentType &&
      (metadata.eventType === "returned" ||
        metadata.eventType === "invalidated")
    );
  });

  if (!matched) {
    return {
      adminState: "active" as const,
      adminStateReason: undefined,
      adminStateChangedAt: undefined,
    };
  }

  const metadata = matched.metadataJson as
    | { eventType?: "returned" | "invalidated"; reason?: string }
    | null;

  return {
    adminState: metadata?.eventType ?? "active",
    adminStateReason: metadata?.reason,
    adminStateChangedAt: matched.createdAt.toISOString(),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const auth = await requirePublicIntakeToken(token);

  if (!auth.ok) {
    return auth.response;
  }

  if (shouldUseMockData()) {
    const mock = getMockPublicIntakeByToken(token);
    if (!mock) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      intakeId: mock.id,
      status: mock.status,
      companyName: "有限会社 草野企画",
      store: mock.store,
      inviteEmail: mock.inviteEmail,
      inviteExpiresAt: mock.inviteExpiresAt,
      profile: mock.profile,
      employment: mock.employment,
      attributes: mock.attributes,
      employmentContract: mock.employmentContract,
      bankAccount: mock.bankAccount,
      myNumber: {
        purposeOfUseVersion: mock.myNumber.purposeOfUseVersion,
        agreedPurpose: mock.myNumber.agreedPurpose,
        confirmedAccuracy: mock.myNumber.confirmedAccuracy,
      },
      documentStatuses: mock.consents.map((item) => ({
        documentType: item.documentType,
        adminState: item.adminState ?? "active",
        adminStateReason: item.adminStateReason,
        adminStateChangedAt: item.adminStateChangedAt,
      })),
      jobPositions: getMockJobPositions(),
      completion: {
        profileCompleted: Boolean(
          mock.profile.fullName &&
            mock.profile.birthDate &&
            mock.profile.phone &&
            mock.profile.currentAddress &&
            mock.profile.photoDataUrl,
        ),
        employmentCompleted: true,
        attributesCompleted: true,
        employmentContractCompleted: Boolean(
          mock.employmentContract?.jobPositionCode &&
            mock.employmentContract?.contractStartDate,
        ),
        bankAccountCompleted: Boolean(
          mock.bankAccount?.bankName && mock.bankAccount?.accountNumber,
        ),
        myNumberCompleted: Boolean(mock.myNumber?.myNumber),
        employeePledgeCompleted: mock.consents.some(
          (item) =>
            item.documentType === "employee_pledge" &&
            item.adminState !== "returned" &&
            item.adminState !== "invalidated",
        ),
        snsPledgeCompleted: mock.consents.some(
          (item) =>
            item.documentType === "sns_pledge" &&
            item.adminState !== "returned" &&
            item.adminState !== "invalidated",
        ),
        retirementPledgeCompleted: mock.consents.some(
          (item) =>
            item.documentType === "retirement_pledge" &&
            item.adminState !== "returned" &&
            item.adminState !== "invalidated",
        ),
        signatureCompleted: Boolean(mock.signature),
      },
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }
  const jobPositions = await listActiveJobPositionMasters();

  return ok({
    intakeId: intake.id,
    status: intake.status,
    companyName: "有限会社 草野企画",
    store: {
      id: intake.store.id,
      name: intake.store.name,
    },
    inviteEmail: intake.inviteEmail,
    inviteExpiresAt: intake.inviteExpiresAt.toISOString(),
    profile: {
      pledgeDate: intake.pledgeDate?.toISOString().slice(0, 10),
      storeName: intake.store.name,
      fullName: intake.fullName ?? undefined,
      fullNameKana: intake.fullNameKana ?? undefined,
      gender: intake.gender ?? undefined,
      birthDate: intake.birthDate?.toISOString().slice(0, 10) ?? undefined,
      email: intake.email ?? undefined,
      phone: intake.phone ?? undefined,
      postalCode: intake.postalCode ?? undefined,
      currentAddress: intake.currentAddress ?? undefined,
      residentSameAsCurrent: intake.residentSameAsCurrent,
      residentAddress: intake.residentAddress ?? undefined,
      photoDataUrl:
        intake.profilePhotoDataUrl ?? intake.profilePhotoFilePath ?? undefined,
    },
    employment: {
      emergencyContactName: intake.emergencyContactName ?? undefined,
      emergencyContactKana: intake.emergencyContactKana ?? undefined,
      emergencyContactRelation: intake.emergencyContactRelation ?? undefined,
      emergencyContactPhone: intake.emergencyContactPhone ?? undefined,
      commuteMethod: intake.commuteMethod ?? undefined,
      commuteDistanceKm: intake.commuteDistanceKm
        ? Number(intake.commuteDistanceKm)
        : undefined,
      referralSource: intake.referralSource ?? undefined,
      referralPerson: intake.referralPerson ?? undefined,
      referralStoreName: intake.referralStoreName ?? undefined,
      workDaysPerWeek: intake.workDaysPerWeek
        ? Number(intake.workDaysPerWeek)
        : undefined,
      workHoursPerWeek: intake.workHoursPerWeek
        ? Number(intake.workHoursPerWeek)
        : undefined,
      shiftStartTime: intake.shiftStartTime?.toISOString().slice(11, 16),
      shiftEndTime: intake.shiftEndTime?.toISOString().slice(11, 16),
    },
    attributes: {
      hasSecondJob: intake.hasSecondJob ?? "no",
      secondJobType: intake.secondJobType ?? "",
      secondJobNote: intake.secondJobNote ?? "",
      isStudent: intake.isStudent,
      schoolType: intake.schoolType ?? undefined,
      schoolGrade: intake.schoolGrade ?? "",
      schoolSchedule: intake.schoolSchedule ?? undefined,
      schoolName: intake.schoolName ?? "",
      isMinor: intake.isMinor,
      guardianName: intake.guardianName ?? "",
      guardianRelation: intake.guardianRelation ?? "",
      guardianPhone: intake.guardianPhone ?? "",
      guardianWorkPermissionConfirmed: false,
      isForeignNational: intake.isForeignNational,
      residenceCardFrontDataUrl: intake.residenceCardFrontDataUrl ?? "",
      residenceCardBackDataUrl: intake.residenceCardBackDataUrl ?? "",
    },
    employmentContract: intake.employmentContract
      ? {
          employmentCategory: intake.employmentContract.employmentCategory as
            | "regular_employee"
            | "fixed_term_employee"
            | "part_time",
          contractStartDate:
            intake.employmentContract.contractStartDate
              .toISOString()
              .slice(0, 10),
          contractEndDate:
            intake.employmentContract.contractEndDate.toISOString().slice(0, 10),
          renewalPatternText: intake.employmentContract.renewalPatternText,
          workLocationName: intake.employmentContract.workLocationName,
          workLocationAddress: intake.employmentContract.workLocationAddress,
          dutyDescription: intake.employmentContract.dutyDescription,
          jobPositionCode: intake.employmentContract.jobPositionMaster.code,
          currentRoleLabel: intake.employmentContract.currentRoleLabel,
          shiftStartTime: intake.employmentContract.shiftStartTime
            .toISOString()
            .slice(11, 16),
          shiftEndTime: intake.employmentContract.shiftEndTime
            .toISOString()
            .slice(11, 16),
          breakMinutes: intake.employmentContract.breakMinutes,
          overtimeAllowed: intake.employmentContract.overtimeAllowed,
          holidayWorkAllowed: intake.employmentContract.holidayWorkAllowed,
          holidayRuleText: intake.employmentContract.holidayRuleText,
          basicSalaryMonthly: intake.employmentContract.basicSalaryMonthly,
          dutyAllowanceMonthly: intake.employmentContract.dutyAllowanceMonthly,
          hourlyWage: intake.employmentContract.hourlyWage ?? undefined,
          fixedOvertimeHoursNote:
            intake.employmentContract.fixedOvertimeHoursNote ?? undefined,
          commutingAllowanceMonthly:
            intake.employmentContract.commutingAllowanceMonthly ?? undefined,
          commutingAllowanceNote:
            intake.employmentContract.commutingAllowanceNote ?? undefined,
          payClosingDay: intake.employmentContract.payClosingDay,
          payDate: intake.employmentContract.payDate,
          wagePaymentMethod: intake.employmentContract.wagePaymentMethod,
          hasRaise: intake.employmentContract.hasRaise,
          hasBonus: intake.employmentContract.hasBonus,
          hasRetirementPay: intake.employmentContract.hasRetirementPay,
          retirementRuleText: intake.employmentContract.retirementRuleText,
          socialInsuranceNote:
            intake.employmentContract.socialInsuranceNote ?? undefined,
          employmentInsuranceNote:
            intake.employmentContract.employmentInsuranceNote ?? undefined,
          transferPossibilityNote:
            intake.employmentContract.transferPossibilityNote ?? undefined,
        }
      : undefined,
    bankAccount: intake.bankAccount
      ? {
          bankName: intake.bankAccount.bankName,
          branchName: intake.bankAccount.branchName,
          branchCode: intake.bankAccount.branchCode,
          accountType: intake.bankAccount.accountType as
            | "ordinary"
            | "checking"
            | "savings",
          accountNumber: decryptStoredAccountNumber(
            intake.bankAccount.encryptedAccountNumber,
          ),
          accountHolderKana: intake.bankAccount.accountHolderKana,
          bankBookImageDataUrl: intake.bankAccount.bankBookImageDataUrl ?? "",
          agreedUsage: intake.bankAccount.agreedUsage,
          confirmedOwnAccount: intake.bankAccount.confirmedOwnAccount,
        }
      : undefined,
    myNumber: intake.myNumberRecord
      ? {
          purposeOfUseVersion: intake.myNumberRecord.purposeOfUseVersion,
          agreedPurpose: intake.myNumberRecord.agreedPurpose,
          confirmedAccuracy: intake.myNumberRecord.confirmedAccuracy,
        }
      : undefined,
    documentStatuses: intake.documentConsents.map((item) => ({
      documentType: item.documentType,
      ...resolveDocumentAdminStateFromAudit(intake.auditLogs, item.documentType),
    })),
    jobPositions: jobPositions.map((item) => ({
      code: item.code,
      sortOrder: item.sortOrder,
      name: item.name,
      basicSalaryMonthly: item.basicSalaryMonthly,
      dutyAllowanceMonthly: item.dutyAllowanceMonthly,
      fixedOvertimeNote: item.fixedOvertimeNote ?? undefined,
    })),
    completion: {
      profileCompleted: Boolean(intake.fullName && intake.birthDate && intake.phone),
      employmentCompleted: Boolean(
        intake.emergencyContactName &&
          intake.emergencyContactRelation &&
          intake.emergencyContactPhone,
      ),
      attributesCompleted: true,
      employmentContractCompleted: Boolean(intake.employmentContract),
      bankAccountCompleted: Boolean(intake.bankAccount),
      myNumberCompleted: Boolean(intake.myNumberRecord),
      employeePledgeCompleted: intake.documentConsents.some(
        (item) =>
          item.documentType === "employee_pledge" &&
          resolveDocumentAdminStateFromAudit(
            intake.auditLogs,
            item.documentType,
          ).adminState === "active",
      ),
      snsPledgeCompleted: intake.documentConsents.some(
        (item) =>
          item.documentType === "sns_pledge" &&
          resolveDocumentAdminStateFromAudit(
            intake.auditLogs,
            item.documentType,
          ).adminState === "active",
      ),
      retirementPledgeCompleted: intake.documentConsents.some(
        (item) =>
          item.documentType === "retirement_pledge" &&
          resolveDocumentAdminStateFromAudit(
            intake.auditLogs,
            item.documentType,
          ).adminState === "active",
      ),
      signatureCompleted: Boolean(intake.documentSignature),
    },
  });
}
