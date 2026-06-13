import { findAdminIntakeDetail } from "@/src/lib/db/admin-intakes";
import { findPublicIntakeByToken } from "@/src/lib/db/public-intakes";
import { getMockAdminIntakeById, getMockPublicIntakeByToken, shouldUseMockData } from "@/src/lib/mock/mock-repositories";
import type { ResolvedAdminSession } from "@/src/lib/admin-auth/session";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { decryptString } from "@/src/lib/security/encryption";
import { canIncludeReceiptField } from "@/src/lib/pdf/receipt-privacy";

export type ReceiptPreviewData = {
  title: string;
  employeeName: string;
  storeName: string;
  status: string;
  submittedAt?: string;
  pledgeDate?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  currentAddress?: string;
  photoDataUrl?: string;
  emergencyContact?: string;
  bankSummary?: string;
  myNumberSummary?: string;
  companyName: string;
  documents: Array<{
    documentType: string;
    version?: string;
    consentedAt?: string;
    adminState?: "active" | "returned" | "invalidated";
    adminStateReason?: string;
    workflowState?: "active" | "returned" | "invalidated" | "resubmitted";
    resubmittedAt?: string;
  }>;
  signature?: {
    signerName: string;
    signedDate: string;
    signedAt?: string;
    signatureImageUrl?: string;
  };
};

export async function getPublicReceiptPreviewData(token: string): Promise<ReceiptPreviewData | null> {
  if (shouldUseMockData()) {
    const mock = getMockPublicIntakeByToken(token);
    if (!mock) {
      return null;
    }

    return {
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
          item.lastResubmittedAt && item.lastAdminState && item.adminState === "active"
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
    };
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return null;
  }

  return {
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
        const metadata = item.metadataJson as { documentType?: string; eventType?: string; reason?: string } | null;
        return item.actionTarget === `document:${doc.documentType}` && metadata?.documentType === doc.documentType;
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
          ((adminEvent?.metadataJson as { eventType?: "returned" | "invalidated" } | null)?.eventType as
            | "returned"
            | "invalidated"
            | undefined) ?? "active",
        adminStateReason: (adminEvent?.metadataJson as { reason?: string } | null)?.reason,
        workflowState: resubmitted
          ? "resubmitted"
          : (((adminEvent?.metadataJson as { eventType?: "returned" | "invalidated" } | null)?.eventType as
              | "returned"
              | "invalidated"
              | undefined) ?? "active"),
        resubmittedAt: resubmitted?.createdAt.toISOString(),
      };
    }),
    signature: intake.documentSignature
      ? {
          signerName: intake.documentSignature.signerName,
          signedDate: intake.documentSignature.signedDate.toISOString().slice(0, 10),
          signedAt: intake.documentSignature.signedAt.toISOString(),
          signatureImageUrl:
            intake.documentSignature.signatureDataUrl ?? intake.documentSignature.signatureFilePath ?? undefined,
        }
      : undefined,
  };
}

export async function getAdminReceiptPreviewData(
  id: string,
  session: ResolvedAdminSession,
): Promise<ReceiptPreviewData | null> {
  const permissions = getAdminPermissions(session.role);

  if (shouldUseMockData()) {
    const mock = getMockAdminIntakeById(id);
    if (!mock) {
      return null;
    }

    return {
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
          item.lastResubmittedAt && item.lastAdminState && item.adminState === "active"
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
    };
  }

  const intake = await findAdminIntakeDetail(id, session.storeId, session.role === "store_admin");
  if (!intake) {
    return null;
  }

  return {
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
        const metadata = item.metadataJson as { documentType?: string; eventType?: string; reason?: string } | null;
        return item.actionTarget === `document:${doc.documentType}` && metadata?.documentType === doc.documentType;
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
          ((adminEvent?.metadataJson as { eventType?: "returned" | "invalidated" } | null)?.eventType as
            | "returned"
            | "invalidated"
            | undefined) ?? "active",
        adminStateReason: (adminEvent?.metadataJson as { reason?: string } | null)?.reason,
        workflowState: resubmitted
          ? "resubmitted"
          : (((adminEvent?.metadataJson as { eventType?: "returned" | "invalidated" } | null)?.eventType as
              | "returned"
              | "invalidated"
              | undefined) ?? "active"),
        resubmittedAt: resubmitted?.createdAt.toISOString(),
      };
    }),
    signature: intake.documentSignature
      ? {
          signerName: intake.documentSignature.signerName,
          signedDate: intake.documentSignature.signedDate.toISOString().slice(0, 10),
          signedAt: intake.documentSignature.signedAt.toISOString(),
          signatureImageUrl:
            intake.documentSignature.signatureDataUrl ?? intake.documentSignature.signatureFilePath ?? undefined,
        }
      : undefined,
  };
}
