import { parseJson } from "@/src/lib/api/parse";
import { ok } from "@/src/lib/api/responses";
import { requireAdminAuth } from "@/src/lib/api/auth";
import { adminReturnSchema } from "@/src/lib/intake-contracts/schemas";
import {
  findAdminIntakeDetail,
  markAdminIntakeReturned,
} from "@/src/lib/db/admin-intakes";
import { apiError } from "@/src/lib/api/responses";
import { createAdminAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  buildResubmissionUrl,
  sendReturnNotificationEmail,
} from "@/src/lib/notifications/return-notification-email";
import {
  markMockIntakeReturned,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJson(request, adminReturnSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;

  if (shouldUseMockData()) {
    const updated = markMockIntakeReturned(id, {
      adminStoreId: auth.context.storeId,
      restrictToStore: auth.context.role === "store_admin",
    });

    if (!updated) {
      return apiError("NOT_FOUND", "対象データが見つかりません", 404);
    }

    const notification = await sendReturnNotificationEmail({
      to: updated.recipientEmail,
      recipientName: updated.recipientName,
      storeName: updated.storeName,
      documentLabel: "提出内容",
      reason: parsed.data.reason,
      resubmissionUrl: buildResubmissionUrl({
        requestUrl: request.url,
        token: updated.intakeToken,
      }),
    });

    return ok({
      ok: true,
      id,
      status: updated.status,
      notification,
    });
  }

  const intake = await findAdminIntakeDetail(
    id,
    auth.context.storeId,
    auth.context.role === "store_admin",
  );

  const updated = await markAdminIntakeReturned({
    id,
    adminStoreId: auth.context.storeId,
    restrictToStore: auth.context.role === "store_admin",
  });

  if (!updated) {
    return apiError("NOT_FOUND", "対象データが見つかりません", 404);
  }

  if (!intake) {
    return apiError("NOT_FOUND", "対象データが見つかりません", 404);
  }

  const meta = getRequestMeta(request);
  await createAdminAuditLog({
    adminUserId: auth.context.adminUserId,
    employeeIntakeId: id,
    action: "returned",
    actionTarget: "intake",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadataJson: parsed.data,
  });

  const notification = await sendReturnNotificationEmail({
    to: intake.email || intake.inviteEmail,
    recipientName: intake.fullName || intake.invitedName || "従業員",
    storeName: intake.store.name,
    documentLabel: "提出内容",
    reason: parsed.data.reason,
    resubmissionUrl: buildResubmissionUrl({
      requestUrl: request.url,
      token: intake.intakeToken,
    }),
  });

  return ok({
    ok: true,
    id,
    status: updated.status,
    notification,
  });
}
