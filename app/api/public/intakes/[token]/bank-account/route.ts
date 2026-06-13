import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import { parseJson } from "@/src/lib/api/parse";
import { apiError, ok } from "@/src/lib/api/responses";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import { createEmployeeAuditLog } from "@/src/lib/db/audit-logs";
import {
  findPublicIntakeByToken,
  savePublicIntakeBankAccount,
} from "@/src/lib/db/public-intakes";
import { bankAccountSchema } from "@/src/lib/intake-contracts/schemas";
import {
  saveMockBankAccount,
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

  const parsed = await parseJson(request, bankAccountSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (shouldUseMockData()) {
    const updated = saveMockBankAccount(token, parsed.data);
    if (!updated) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      ok: true,
      status: updated.status,
      savedAt: updated.savedAt,
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  await savePublicIntakeBankAccount(intake.id, parsed.data);

  const meta = getRequestMeta(request);
  await createEmployeeAuditLog({
    employeeIntakeId: intake.id,
    action: "bank_account_saved",
    actionTarget: "bank_account",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return ok({
    ok: true,
    status: "in_progress",
    savedAt: new Date().toISOString(),
  });
}
