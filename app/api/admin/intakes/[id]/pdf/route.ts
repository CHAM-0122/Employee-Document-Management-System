import { requireAdminAuth } from "@/src/lib/api/auth";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { findAdminIntakeDetail } from "@/src/lib/db/admin-intakes";
import { apiError } from "@/src/lib/api/responses";
import { buildIntakeReceiptPdf } from "@/src/lib/pdf/intake-receipt";
import { getMockAdminIntakeById, shouldUseMockData } from "@/src/lib/mock/mock-repositories";
import { decryptString } from "@/src/lib/security/encryption";
import { canIncludeReceiptField } from "@/src/lib/pdf/receipt-privacy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
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
      photoDataUrl: canIncludeReceiptField("admin", "profilePhoto", permissions)
        ? mock.profile.photoDataUrl
        : undefined,
      emergencyContact: `${mock.employment.emergencyContactName} / ${mock.employment.emergencyContactPhone}`,
      bankSummary: canIncludeReceiptField("admin", "bankAccount", permissions)
        ? `${mock.bankAccount.bankName} ${mock.bankAccount.branchName} ${mock.bankAccount.accountNumber}`
        : undefined,
      myNumberSummary: canIncludeReceiptField("admin", "myNumber", permissions)
        ? mock.myNumber.myNumber
        : undefined,
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
          `${mock.profile.fullName || "receipt"}_intake_receipt.pdf`,
        )}`,
      },
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
    photoDataUrl: canIncludeReceiptField("admin", "profilePhoto", permissions)
      ? (intake.profilePhotoDataUrl ?? intake.profilePhotoFilePath ?? undefined)
      : undefined,
    emergencyContact:
      intake.emergencyContactName && intake.emergencyContactPhone
        ? `${intake.emergencyContactName} / ${intake.emergencyContactPhone}`
        : undefined,
    bankSummary: canIncludeReceiptField("admin", "bankAccount", permissions) && intake.bankAccount
      ? `${intake.bankAccount.bankName} ${intake.bankAccount.branchName} ****${intake.bankAccount.accountNumberLast4}`
      : undefined,
    myNumberSummary: canIncludeReceiptField("admin", "myNumber", permissions) && intake.myNumberRecord
      ? decryptString(intake.myNumberRecord.encryptedMyNumber)
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
        `${intake.fullName || "receipt"}_intake_receipt.pdf`,
      )}`,
    },
  });
}
