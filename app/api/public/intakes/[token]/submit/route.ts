import { parseJson } from "@/src/lib/api/parse";
import { apiError, ok } from "@/src/lib/api/responses";
import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import { submitSchema } from "@/src/lib/intake-contracts/schemas";
import {
  findPublicIntakeByToken,
  submitPublicIntake,
} from "@/src/lib/db/public-intakes";
import { createEmployeeAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  getMockPublicIntakeByToken,
  shouldUseMockData,
  submitMockIntake,
} from "@/src/lib/mock/mock-repositories";

function isMockProfileReady(mock: NonNullable<ReturnType<typeof getMockPublicIntakeByToken>>) {
  return Boolean(
    mock.profile.fullName?.trim() &&
      mock.profile.fullNameKana?.trim() &&
      mock.profile.email?.trim() &&
      mock.profile.phone?.trim() &&
      mock.profile.birthDate?.trim() &&
      mock.profile.currentAddress?.trim() &&
      mock.profile.photoDataUrl,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const auth = await requirePublicIntakeToken(token);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJson(request, submitSchema);
  if (!parsed.success) {
    return parsed.response;
  }
  const pledgeTerm = new URL(request.url).searchParams.get("pledgeTerm");
  const isTimeePledge = pledgeTerm === "timee";
  const isRetirementPledge = pledgeTerm === "retirement";

  if (shouldUseMockData()) {
    const mock = getMockPublicIntakeByToken(token);
    if (!mock) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    const hasEmployeePledge = mock.consents.some(
      (item) =>
        item.documentType === "employee_pledge" &&
        item.adminState !== "returned" &&
        item.adminState !== "invalidated",
    );
    const hasSnsPledge = mock.consents.some(
      (item) =>
        item.documentType === "sns_pledge" &&
        item.adminState !== "returned" &&
        item.adminState !== "invalidated",
    );
    const hasRetirementPledge = mock.consents.some(
      (item) =>
        item.documentType === "retirement_pledge" &&
        item.adminState !== "returned" &&
        item.adminState !== "invalidated",
    );
    const hasRequiredPledge = isRetirementPledge
      ? hasRetirementPledge
      : hasEmployeePledge && hasSnsPledge;
    const hasRequiredBankAccount =
      isTimeePledge ||
      isRetirementPledge ||
      Boolean(mock.bankAccount?.bankName && mock.bankAccount?.bankBookImageDataUrl);
    const hasRequiredMyNumber = isRetirementPledge || Boolean(mock.myNumber?.myNumber);

    if (
      !isMockProfileReady(mock) ||
      !hasRequiredPledge ||
      !mock.signature ||
      !hasRequiredBankAccount ||
      !hasRequiredMyNumber
    ) {
      return apiError(
        "VALIDATION_ERROR",
        "提出に必要な基本情報、本人写真、口座情報、マイナンバー、同意、または署名が不足しています",
        422,
      );
    }

    const submitted = submitMockIntake(token);
    if (!submitted) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      ok: true,
      status: submitted.status,
      submittedAt: submitted.submittedAt,
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  const hasEmployeePledge = intake.documentConsents.some(
    (item) => item.documentType === "employee_pledge",
  );
  const hasSnsPledge = intake.documentConsents.some(
    (item) => item.documentType === "sns_pledge",
  );
  const hasRetirementPledge = intake.documentConsents.some(
    (item) => item.documentType === "retirement_pledge",
  );
  const hasRequiredPledge = isRetirementPledge
    ? hasRetirementPledge
    : hasEmployeePledge && hasSnsPledge;
  const hasRequiredBankAccount =
    isTimeePledge ||
    isRetirementPledge ||
    Boolean(intake.bankAccount?.bankBookImageDataUrl);
  const hasRequiredMyNumber = isRetirementPledge || Boolean(intake.myNumberRecord);

  if (
    !intake.fullName ||
    !intake.fullNameKana ||
    !intake.email ||
    !intake.phone ||
    !intake.birthDate ||
    !intake.currentAddress ||
    !(intake.profilePhotoDataUrl || intake.profilePhotoFilePath) ||
    !hasRequiredPledge ||
    !intake.documentSignature ||
    !hasRequiredBankAccount ||
    !hasRequiredMyNumber
  ) {
    return apiError(
      "VALIDATION_ERROR",
      "提出に必要な基本情報、本人写真、口座情報、マイナンバー、同意、または署名が不足しています",
      422,
    );
  }

  const updated = await submitPublicIntake(intake.id);
  const meta = getRequestMeta(request);
  await createEmployeeAuditLog({
    employeeIntakeId: intake.id,
    action: "submitted",
    actionTarget: "intake",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadataJson: parsed.data,
  });

  return ok({
    ok: true,
    status: updated.status,
    submittedAt: updated.submittedAt?.toISOString() ?? new Date().toISOString(),
  });
}
