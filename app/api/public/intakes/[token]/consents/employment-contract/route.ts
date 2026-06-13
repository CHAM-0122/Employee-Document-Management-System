import { parseJson } from "@/src/lib/api/parse";
import { ok } from "@/src/lib/api/responses";
import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import { employmentContractConsentSchema } from "@/src/lib/intake-contracts/schemas";
import {
  findPublicIntakeByToken,
  saveEmploymentContractConsent,
} from "@/src/lib/db/public-intakes";
import { apiError } from "@/src/lib/api/responses";
import { createEmployeeAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  saveMockEmploymentContractConsent,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const auth = await requirePublicIntakeToken(token);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJson(request, employmentContractConsentSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (shouldUseMockData()) {
    const meta = getRequestMeta(request);
    const saved = saveMockEmploymentContractConsent({
      token,
      version: parsed.data.version,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    if (!saved) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      ok: true,
      consentedAt: saved.consentedAt,
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  const meta = getRequestMeta(request);
  const consent = await saveEmploymentContractConsent({
    intakeId: intake.id,
    templateId: parsed.data.templateId,
    version: parsed.data.version,
    bodySnapshotHtml: parsed.data.bodySnapshotHtml,
    scrolledToEnd: parsed.data.scrolledToEnd,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  await createEmployeeAuditLog({
    employeeIntakeId: intake.id,
    action: "consented",
    actionTarget: "employment_contract",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadataJson: { version: parsed.data.version },
  });

  return ok({
    ok: true,
    consentedAt: consent.consentedAt.toISOString(),
  });
}
