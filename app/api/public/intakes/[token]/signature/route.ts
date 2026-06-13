import { parseJson } from "@/src/lib/api/parse";
import { ok } from "@/src/lib/api/responses";
import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import { signatureSchema } from "@/src/lib/intake-contracts/schemas";
import {
  findPublicIntakeByToken,
  saveDocumentSignature,
} from "@/src/lib/db/public-intakes";
import { apiError } from "@/src/lib/api/responses";
import { createEmployeeAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  saveMockSignature,
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

  const parsed = await parseJson(request, signatureSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  if (shouldUseMockData()) {
    const meta = getRequestMeta(request);
    const signature = saveMockSignature({
      token,
      signerName: parsed.data.signerName,
      signedDate: parsed.data.signedDate,
      signatureImageUrl: parsed.data.signatureDataUrl,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    if (!signature) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      ok: true,
      signedAt: signature.signedAt,
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  const meta = getRequestMeta(request);
  const signature = await saveDocumentSignature({
    intakeId: intake.id,
    signerName: parsed.data.signerName,
    signedDate: parsed.data.signedDate,
    signatureFilePath: `signatures/${intake.id}.png`,
    signatureDataUrl: parsed.data.signatureDataUrl,
    signatureFileType: "image/png",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  await createEmployeeAuditLog({
    employeeIntakeId: intake.id,
    action: "signed",
    actionTarget: "signature",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return ok({
    ok: true,
    signedAt: signature.signedAt.toISOString(),
  });
}
