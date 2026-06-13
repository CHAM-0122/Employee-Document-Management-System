import { ok } from "@/src/lib/api/responses";
import { requireAdminAuth } from "@/src/lib/api/auth";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import {
  findAdminIntakeDetail,
  updateAdminEmploymentContract,
} from "@/src/lib/db/admin-intakes";
import {
  decryptStoredAccountNumber,
  listActiveJobPositionMasters,
} from "@/src/lib/db/public-intakes";
import { decryptString } from "@/src/lib/security/encryption";
import { apiError } from "@/src/lib/api/responses";
import { parseJson } from "@/src/lib/api/parse";
import { employmentContractSchema } from "@/src/lib/intake-contracts/schemas";
import {
  getMockAdminIntakeById,
  getMockJobPositions,
  saveMockAdminEmploymentContractById,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";
import type { EmploymentContractPayload } from "@/src/lib/intake-contracts/types";

type AdminEmploymentContractInput = Omit<
  EmploymentContractPayload,
  | "hourlyWage"
  | "fixedOvertimeHoursNote"
  | "commutingAllowanceMonthly"
  | "commutingAllowanceNote"
  | "socialInsuranceNote"
  | "employmentInsuranceNote"
  | "transferPossibilityNote"
> & {
  hourlyWage?: number | "" | null;
  fixedOvertimeHoursNote?: string | null;
  commutingAllowanceMonthly?: number | "" | null;
  commutingAllowanceNote?: string | null;
  socialInsuranceNote?: string | null;
  employmentInsuranceNote?: string | null;
  transferPossibilityNote?: string | null;
};

function optionalNumberForSave(value: number | "" | null | undefined) {
  return typeof value === "number" ? value : undefined;
}

function optionalTextForSave(value: string | null | undefined) {
  return value?.trim() ? value : undefined;
}

function normalizeEmploymentContractPayload(
  payload: AdminEmploymentContractInput,
): EmploymentContractPayload {
  return {
    ...payload,
    hourlyWage: optionalNumberForSave(payload.hourlyWage),
    fixedOvertimeHoursNote: optionalTextForSave(payload.fixedOvertimeHoursNote),
    commutingAllowanceMonthly: optionalNumberForSave(
      payload.commutingAllowanceMonthly,
    ),
    commutingAllowanceNote: optionalTextForSave(payload.commutingAllowanceNote),
    socialInsuranceNote: optionalTextForSave(payload.socialInsuranceNote),
    employmentInsuranceNote: optionalTextForSave(payload.employmentInsuranceNote),
    transferPossibilityNote: optionalTextForSave(
      payload.transferPossibilityNote,
    ),
  };
}

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

function resolveDocumentWorkflowStateFromAudit(
  auditLogs: Array<{
    actorType: "admin" | "employee" | "system";
    actionTarget: string | null;
    createdAt: Date;
    metadataJson: unknown;
    action: string;
  }>,
  documentType: string,
) {
  const adminTarget = `document:${documentType}`;
  const latestAdminEvent = auditLogs.find((item) => {
    const metadata = item.metadataJson as
      | { documentType?: string; eventType?: string }
      | null;

    return (
      item.actorType === "admin" &&
      item.actionTarget === adminTarget &&
      metadata?.documentType === documentType &&
      (metadata.eventType === "returned" ||
        metadata.eventType === "invalidated")
    );
  });

  const latestEmployeeConsent = auditLogs.find(
    (item) =>
      item.actorType === "employee" &&
      item.action === "consented" &&
      item.actionTarget === documentType,
  );

  if (
    latestAdminEvent &&
    latestEmployeeConsent &&
    latestEmployeeConsent.createdAt > latestAdminEvent.createdAt
  ) {
    return {
      workflowState: "resubmitted" as const,
      resubmittedAt: latestEmployeeConsent.createdAt.toISOString(),
    };
  }

  if (latestAdminEvent) {
    const metadata = latestAdminEvent.metadataJson as
      | { eventType?: "returned" | "invalidated" }
      | null;

    return {
      workflowState: metadata?.eventType ?? "returned",
      resubmittedAt: undefined,
    };
  }

  return {
    workflowState: "active" as const,
    resubmittedAt: undefined,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const permissions = getAdminPermissions(auth.context.role);

  if (shouldUseMockData()) {
    const mock = getMockAdminIntakeById(id);
    if (
      !mock ||
      (auth.context.role === "store_admin" &&
        (!auth.context.storeId || mock.store.id !== auth.context.storeId))
    ) {
      return apiError("NOT_FOUND", "対象データが見つかりません", 404);
    }

    return ok({
      viewerRole: auth.context.role,
      permissions,
      id: mock.id,
      intakeToken: mock.intakeToken,
      status: mock.status,
      storeName: mock.store.name,
      fullName: mock.profile.fullName || mock.signature?.signerName || "",
      email: mock.profile.email,
      phone: mock.profile.phone,
      birthDate: mock.profile.birthDate,
      currentAddress: mock.profile.currentAddress,
      photoDataUrl: mock.profile.photoDataUrl,
      emergencyContactName: mock.employment.emergencyContactName,
      emergencyContactPhone: mock.employment.emergencyContactPhone,
      commuteMethod: mock.employment.commuteMethod,
      workDaysPerWeek:
        mock.employmentContract.workDaysPerWeek ??
        mock.employment.workDaysPerWeek,
      hasSecondJob: mock.attributes.hasSecondJob,
      isStudent: mock.attributes.isStudent,
      isMinor: mock.attributes.isMinor ?? false,
      guardianName: mock.attributes.guardianName || undefined,
      isForeignNational: mock.attributes.isForeignNational ?? false,
      residenceCardFrontDataUrl:
        mock.attributes.residenceCardFrontDataUrl || undefined,
      residenceCardBackDataUrl:
        mock.attributes.residenceCardBackDataUrl || undefined,
      employmentContract: mock.employmentContract,
      jobPositions: getMockJobPositions(),
      renewalHistory: mock.renewalHistory,
      bankAccount: permissions.canViewBankAccount
        ? {
            bankName: mock.bankAccount.bankName,
            branchName: mock.bankAccount.branchName,
            branchCode: mock.bankAccount.branchCode,
            accountType: mock.bankAccount.accountType,
            accountNumberMasked: mock.bankAccount.accountNumber,
            accountHolderKana: mock.bankAccount.accountHolderKana,
            bankBookImageDataUrl: mock.bankAccount.bankBookImageDataUrl,
          }
        : undefined,
      myNumber: permissions.canViewMyNumber
        ? {
            purposeOfUseVersion: mock.myNumber.purposeOfUseVersion,
            myNumberMasked: mock.myNumber.myNumber,
          }
        : undefined,
      consents: mock.consents.map((item) => ({
        ...item,
        workflowState:
          item.lastResubmittedAt &&
          item.lastAdminState &&
          item.adminState === "active"
            ? "resubmitted"
            : (item.adminState ?? "active"),
        resubmittedAt: item.lastResubmittedAt,
      })),
      signature: mock.signature,
      documents:
        mock.generatedDocuments.length > 0
          ? mock.generatedDocuments.map((doc) => ({
              ...doc,
              url:
                doc.url && doc.url !== "#"
                  ? doc.url
                  : `/api/admin/intakes/${mock.id}/pdf`,
            }))
          : [
              {
                documentKind: "submission_bundle",
                fileName: `${mock.profile.fullName || "receipt"}_intake_receipt.pdf`,
                url: `/api/admin/intakes/${mock.id}/pdf`,
              },
            ],
    });
  }

  const intake = await findAdminIntakeDetail(
    id,
    auth.context.storeId,
    auth.context.role === "store_admin",
  );

  if (!intake) {
    return apiError("NOT_FOUND", "対象データが見つかりません", 404);
  }

  const jobPositions = await listActiveJobPositionMasters();

  return ok({
    viewerRole: auth.context.role,
    permissions,
    id: intake.id,
    intakeToken: intake.intakeToken,
    status: intake.status,
    storeName: intake.store.name,
    fullName: intake.fullName ?? "",
    email: intake.email ?? "",
    phone: intake.phone ?? "",
    birthDate: intake.birthDate?.toISOString().slice(0, 10) ?? "",
    currentAddress: intake.currentAddress ?? "",
    photoDataUrl:
      intake.profilePhotoDataUrl ?? intake.profilePhotoFilePath ?? undefined,
    emergencyContactName: intake.emergencyContactName ?? "",
    emergencyContactPhone: intake.emergencyContactPhone ?? "",
    commuteMethod: intake.commuteMethod ?? "walk",
    workDaysPerWeek: intake.workDaysPerWeek
      ? Number(intake.workDaysPerWeek)
      : undefined,
    hasSecondJob: intake.hasSecondJob ?? "no",
    isStudent: intake.isStudent,
    isMinor: intake.isMinor,
    guardianName: intake.guardianName ?? undefined,
    isForeignNational: intake.isForeignNational,
    residenceCardFrontDataUrl: intake.residenceCardFrontDataUrl ?? undefined,
    residenceCardBackDataUrl: intake.residenceCardBackDataUrl ?? undefined,
    renewalHistory: [],
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
            intake.employmentContract.contractEndDate
              ?.toISOString()
              .slice(0, 10) ?? "",
          renewalPatternText: intake.employmentContract.renewalPatternText,
          workLocationName: intake.employmentContract.workLocationName,
          workLocationAddress: intake.employmentContract.workLocationAddress,
          workDaysPerWeek: intake.workDaysPerWeek
            ? Number(intake.workDaysPerWeek)
            : undefined,
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
    jobPositions: jobPositions.map((position) => ({
      code: position.code,
      sortOrder: position.sortOrder,
      name: position.name,
      basicSalaryMonthly: position.basicSalaryMonthly,
      dutyAllowanceMonthly: position.dutyAllowanceMonthly,
      fixedOvertimeNote: position.fixedOvertimeNote ?? undefined,
    })),
    bankAccount: permissions.canViewBankAccount && intake.bankAccount
      ? {
          bankName: intake.bankAccount.bankName,
          branchName: intake.bankAccount.branchName,
          branchCode: intake.bankAccount.branchCode,
          accountType: intake.bankAccount.accountType,
          accountNumberMasked: decryptStoredAccountNumber(
            intake.bankAccount.encryptedAccountNumber,
          ),
          accountHolderKana: intake.bankAccount.accountHolderKana,
          bankBookImageDataUrl: intake.bankAccount.bankBookImageDataUrl ?? "",
        }
      : undefined,
      myNumber: permissions.canViewMyNumber && intake.myNumberRecord
      ? {
          purposeOfUseVersion: intake.myNumberRecord.purposeOfUseVersion,
          myNumberMasked: decryptString(intake.myNumberRecord.encryptedMyNumber),
        }
      : undefined,
    consents: intake.documentConsents.map((consent) => ({
      ...resolveDocumentAdminStateFromAudit(intake.auditLogs, consent.documentType),
      ...resolveDocumentWorkflowStateFromAudit(
        intake.auditLogs,
        consent.documentType,
      ),
      documentType: consent.documentType,
      version: consent.version,
      consentedAt: consent.consentedAt.toISOString(),
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
    })),
    signature: intake.documentSignature
      ? {
          signerName: intake.documentSignature.signerName,
          signedDate: intake.documentSignature.signedDate.toISOString().slice(0, 10),
          signedAt: intake.documentSignature.signedAt.toISOString(),
          ipAddress: intake.documentSignature.ipAddress,
          userAgent: intake.documentSignature.userAgent,
          signatureImageUrl:
            intake.documentSignature.signatureDataUrl ??
            intake.documentSignature.signatureFilePath,
        }
      : undefined,
    documents:
      intake.generatedDocuments.length > 0
        ? intake.generatedDocuments.map((doc) => ({
            documentKind: doc.documentKind,
            fileName: doc.fileName,
            url: doc.filePath,
          }))
        : [
            {
              documentKind: "submission_bundle",
              fileName: `${intake.fullName || "receipt"}_intake_receipt.pdf`,
              url: `/api/admin/intakes/${intake.id}/pdf`,
            },
          ],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const permissions = getAdminPermissions(auth.context.role);
  if (!permissions.canEditEmploymentContract) {
    return apiError("FORBIDDEN", "この権限では雇用条件を更新できません", 403);
  }

  const parsed = await parseJson(request, employmentContractSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;
  const payload = normalizeEmploymentContractPayload(parsed.data);

  if (shouldUseMockData()) {
    const updated = saveMockAdminEmploymentContractById(id, payload, {
      adminStoreId: auth.context.storeId,
      restrictToStore: auth.context.role === "store_admin",
    });
    if (!updated) {
      return apiError("NOT_FOUND", "対象データが見つかりません", 404);
    }

    return ok({
      ok: true,
      status: updated.status,
      savedAt: updated.savedAt,
    });
  }

  try {
    const updated = await updateAdminEmploymentContract({
      id,
      payload,
      adminStoreId: auth.context.storeId,
      restrictToStore: auth.context.role === "store_admin",
    });

    if (!updated) {
      return apiError("NOT_FOUND", "対象データが見つかりません", 404);
    }

    return ok({
      ok: true,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "雇用条件の更新に失敗しました",
      422,
    );
  }
}
