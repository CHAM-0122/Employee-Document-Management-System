import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import {
  findPublicIntakeByToken,
} from "@/src/lib/db/public-intakes";
import { apiError } from "@/src/lib/api/responses";
import {
  getMockPublicIntakeByToken,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";
import { buildIntakeReceiptPdf } from "@/src/lib/pdf/intake-receipt";
import { canIncludeReceiptField } from "@/src/lib/pdf/receipt-privacy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
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

    const pdfBytes = await buildIntakeReceiptPdf({
      title: "入社書類提出控え",
      employeeName: mock.profile.fullName,
      storeName: mock.store.name,
      status: mock.status,
      submittedAt: mock.signature?.signedAt,
      pledgeDate: mock.profile.pledgeDate,
      email: mock.profile.email,
      phone: mock.profile.phone,
      birthDate: mock.profile.birthDate,
      currentAddress: mock.profile.currentAddress,
      photoDataUrl: canIncludeReceiptField("employee", "profilePhoto")
        ? mock.profile.photoDataUrl
        : undefined,
      emergencyContact: `${mock.employment.emergencyContactName} / ${mock.employment.emergencyContactPhone}`,
      companyName: "有限会社 草野企画",
      documents: mock.consents.map((item) => ({
        documentType: item.documentType,
        version: item.version,
        consentedAt: item.consentedAt,
        adminState: item.adminState,
        adminStateReason: item.adminStateReason,
        workflowState:
          item.lastResubmittedAt &&
          item.lastAdminState &&
          item.adminState === "active"
            ? "resubmitted"
            : (item.adminState ?? "active"),
        resubmittedAt: item.lastResubmittedAt,
      })),
      signature: mock.signature
        ? {
            signerName: mock.signature.signerName,
            signedDate: mock.signature.signedDate,
            signedAt: mock.signature.signedAt,
            signatureImageUrl: mock.signature.signatureImageUrl,
          }
        : undefined,
    });

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(
          `${mock.profile.fullName || "receipt"}_receipt.pdf`,
        )}`,
      },
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  const pdfBytes = await buildIntakeReceiptPdf({
    title: "入社書類提出控え",
    employeeName: intake.fullName ?? "未入力",
    storeName: intake.store.name,
    status: intake.status,
    submittedAt: intake.submittedAt?.toISOString(),
    pledgeDate: intake.pledgeDate?.toISOString().slice(0, 10),
    email: intake.email ?? undefined,
    phone: intake.phone ?? undefined,
    birthDate: intake.birthDate?.toISOString().slice(0, 10) ?? undefined,
    currentAddress: intake.currentAddress ?? undefined,
    photoDataUrl: canIncludeReceiptField("employee", "profilePhoto")
      ? (intake.profilePhotoDataUrl ?? intake.profilePhotoFilePath ?? undefined)
      : undefined,
    emergencyContact:
      intake.emergencyContactName && intake.emergencyContactPhone
        ? `${intake.emergencyContactName} / ${intake.emergencyContactPhone}`
        : undefined,
    companyName: "有限会社 草野企画",
    documents: intake.documentConsents.map((doc) => {
      const adminEvent = intake.auditLogs.find((item) => {
        const metadata = item.metadataJson as
          | { documentType?: string; eventType?: string; reason?: string }
          | null;
        return (
          item.actionTarget === `document:${doc.documentType}` &&
          metadata?.documentType === doc.documentType
        );
      });
      const resubmitted = intake.auditLogs.find(
        (item) =>
          item.actorType === "employee" &&
          item.action === "consented" &&
          item.actionTarget === doc.documentType &&
          adminEvent &&
          item.createdAt > adminEvent.createdAt,
      );

      return {
        documentType: doc.documentType,
        version: doc.version,
        consentedAt: doc.consentedAt.toISOString(),
        adminState:
          ((adminEvent?.metadataJson as { eventType?: "returned" | "invalidated" } | null)
            ?.eventType as "returned" | "invalidated" | undefined) ?? "active",
        adminStateReason:
          (adminEvent?.metadataJson as { reason?: string } | null)?.reason,
        workflowState: resubmitted
          ? "resubmitted"
          : (((adminEvent?.metadataJson as { eventType?: "returned" | "invalidated" } | null)
              ?.eventType as "returned" | "invalidated" | undefined) ?? "active"),
        resubmittedAt: resubmitted?.createdAt.toISOString(),
      };
    }),
    signature: intake.documentSignature
      ? {
          signerName: intake.documentSignature.signerName,
          signedDate: intake.documentSignature.signedDate.toISOString().slice(0, 10),
          signedAt: intake.documentSignature.signedAt.toISOString(),
          signatureImageUrl:
            intake.documentSignature.signatureDataUrl ??
            intake.documentSignature.signatureFilePath,
        }
      : undefined,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(
        `${intake.fullName || "receipt"}_receipt.pdf`,
      )}`,
    },
  });
}
