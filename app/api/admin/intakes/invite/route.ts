import { created } from "@/src/lib/api/responses";
import { parseJson } from "@/src/lib/api/parse";
import { requireAdminAuth } from "@/src/lib/api/auth";
import { apiError } from "@/src/lib/api/responses";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { adminInviteSchema } from "@/src/lib/intake-contracts/schemas";
import { createAdminInvite } from "@/src/lib/db/admin-intakes";
import { createAdminAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  createMockInvite,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

export async function POST(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const permissions = getAdminPermissions(auth.context.role);
  if (!permissions.canInvite) {
    return apiError("FORBIDDEN", "この権限では招待を作成できません", 403);
  }

  const parsed = await parseJson(request, adminInviteSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (shouldUseMockData()) {
    const result = createMockInvite({
      invitedName: parsed.data.invitedName,
      inviteEmail: parsed.data.inviteEmail,
      storeId: parsed.data.storeId,
      expiresAt: parsed.data.expiresAt,
      flowKind: parsed.data.flowKind,
      employmentTrack: parsed.data.employmentTrack,
      pledgeEmploymentTerm: parsed.data.pledgeEmploymentTerm,
    });

    return created({
      ok: true,
      intakeId: result.id,
      intakeToken: result.intakeToken,
      flowPath: result.flowPath,
    });
  }

  const token = crypto.randomUUID();
  const createdIntake = await createAdminInvite({
    invitedName: parsed.data.invitedName,
    inviteEmail: parsed.data.inviteEmail,
    storeId: parsed.data.storeId,
    expiresAt: parsed.data.expiresAt,
    token,
  });
  const meta = getRequestMeta(request);
  await createAdminAuditLog({
    adminUserId: auth.context.adminUserId,
    employeeIntakeId: createdIntake.id,
    action: "invite_sent",
    actionTarget: "intake",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadataJson: { documentTypes: parsed.data.documentTypes },
  });

  return created({
    ok: true,
    intakeId: createdIntake.id,
    intakeToken: token,
    flowPath:
      parsed.data.flowKind === "employment_contract"
        ? `/employment-contracts/${token}`
        : `/intakes/${token}`,
  });
}
