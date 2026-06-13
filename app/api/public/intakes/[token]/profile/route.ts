import { parseJson } from "@/src/lib/api/parse";
import { ok } from "@/src/lib/api/responses";
import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import { profileSchema } from "@/src/lib/intake-contracts/schemas";
import {
  findPublicIntakeByToken,
  updatePublicIntakeProfile,
} from "@/src/lib/db/public-intakes";
import { apiError } from "@/src/lib/api/responses";
import { createEmployeeAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  saveMockProfile,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const auth = await requirePublicIntakeToken(token);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJson(request, profileSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (shouldUseMockData()) {
    const saved = saveMockProfile(token, parsed.data);
    if (!saved) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      ok: true,
      status: saved.status,
      savedAt: saved.savedAt,
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  const updated = await updatePublicIntakeProfile(intake.id, parsed.data);
  const meta = getRequestMeta(request);
  await createEmployeeAuditLog({
    employeeIntakeId: intake.id,
    action: "saved",
    actionTarget: "profile",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return ok({
    ok: true,
    status: updated.status,
    savedAt: updated.lastSavedAt?.toISOString() ?? new Date().toISOString(),
  });
}
