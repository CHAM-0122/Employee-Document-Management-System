import { ok } from "@/src/lib/api/responses";
import { requireAdminAuth } from "@/src/lib/api/auth";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { listAdminIntakes } from "@/src/lib/db/admin-intakes";
import {
  getMockAdminIntakes,
  getMockPendingAdminSubmissions,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

function resolveListResubmissionStateFromMock(
  consents: Array<{
    adminState?: "active" | "returned" | "invalidated";
    lastAdminState?: "returned" | "invalidated";
    lastResubmittedAt?: string;
  }>,
) {
  let hasInvalidated = false;
  let hasReturned = false;
  let hasResubmitted = false;

  for (const item of consents) {
    const hasAdminAction =
      item.adminState === "returned" ||
      item.adminState === "invalidated" ||
      item.lastAdminState === "returned" ||
      item.lastAdminState === "invalidated";

    if (!hasAdminAction) {
      continue;
    }

    if (item.lastResubmittedAt) {
      hasResubmitted = true;
      continue;
    }

    if (
      item.adminState === "invalidated" ||
      item.lastAdminState === "invalidated"
    ) {
      hasInvalidated = true;
    } else {
      hasReturned = true;
    }
  }

  if (hasInvalidated) {
    return "無効化" as const;
  }

  if (hasReturned) {
    return "要再提出" as const;
  }

  if (hasResubmitted) {
    return "再提出済み" as const;
  }

  return "なし" as const;
}

function resolveListResubmissionStateFromAudit(
  auditLogs: Array<{
    actorType: "admin" | "employee" | "system";
    action: string;
    actionTarget: string | null;
    createdAt: Date;
    metadataJson: unknown;
  }>,
) {
  const documentTypes = [
    "employee_pledge",
    "sns_pledge",
    "retirement_pledge",
    "employment_contract",
  ];
  let hasInvalidated = false;
  let hasReturned = false;
  let hasResubmitted = false;

  for (const documentType of documentTypes) {
    const latestAdminEvent = auditLogs.find((item) => {
      const metadata = item.metadataJson as
        | { documentType?: string; eventType?: string }
        | null;

      return (
        item.actorType === "admin" &&
        item.actionTarget === `document:${documentType}` &&
        metadata?.documentType === documentType &&
        (metadata.eventType === "returned" ||
          metadata.eventType === "invalidated")
      );
    });

    if (!latestAdminEvent) {
      continue;
    }

    const latestEmployeeConsent = auditLogs.find(
      (item) =>
        item.actorType === "employee" &&
        item.action === "consented" &&
        item.actionTarget === documentType,
    );

    if (
      latestEmployeeConsent &&
      latestEmployeeConsent.createdAt > latestAdminEvent.createdAt
    ) {
      hasResubmitted = true;
    } else if (
      (latestAdminEvent.metadataJson as { eventType?: string } | null)?.eventType ===
      "invalidated"
    ) {
      hasInvalidated = true;
    } else {
      hasReturned = true;
    }
  }

  if (hasInvalidated) {
    return "無効化" as const;
  }

  if (hasReturned) {
    return "要再提出" as const;
  }

  if (hasResubmitted) {
    return "再提出済み" as const;
  }

  return "なし" as const;
}

const DIRECT_MANAGED_STORE_IDS = new Set([
  "mock-store-hq",
  "mock-store-kumamoto-factory",
  "mock-store-kumamoto-sales",
  "mock-store-fukuoka-factory",
  "mock-store-keigo",
  "mock-store-praliva",
  "mock-store-paypaydome",
  "mock-store-shin-umeda",
  "mock-store-osaka",
]);

function shouldDisplayForViewer(params: {
  viewerRole: ViewerRole;
  storeId: string;
  employmentCategoryLabel?: string;
}) {
  if (!params.employmentCategoryLabel) {
    return false;
  }

  if (params.viewerRole === "hq_admin") {
    return (
      params.employmentCategoryLabel === "社員" ||
      params.employmentCategoryLabel === "社員C" ||
      params.employmentCategoryLabel === "アルバイト・パート"
    );
  }

  return (
    params.employmentCategoryLabel === "社員" ||
    params.employmentCategoryLabel === "アルバイト・パート"
  );
}

function shouldDisplayPendingForViewer(params: {
  viewerRole: ViewerRole;
  storeId: string;
  employmentCategoryLabel?: string;
}) {
  if (!params.employmentCategoryLabel) {
    return false;
  }

  if (params.viewerRole === "hq_admin") {
    return (
      params.employmentCategoryLabel === "社員" ||
      params.employmentCategoryLabel === "社員C" ||
      params.employmentCategoryLabel === "アルバイト・パート"
    );
  }

  return true;
}

function isMockPendingSubmissionCompleted(params: {
  pendingItem: ReturnType<typeof getMockPendingAdminSubmissions>[number];
  intakes: ReturnType<typeof getMockAdminIntakes>;
}) {
  const matchedIntake = params.intakes.find((item) => {
    const employmentCategoryLabel = resolveEmploymentCategoryLabel({
      employmentCategory: item.employmentContract?.employmentCategory,
      currentRoleLabel: item.employmentContract?.currentRoleLabel,
    });

    return (
      item.store.id === params.pendingItem.store.id &&
      item.profile.fullName === params.pendingItem.fullName &&
      employmentCategoryLabel === params.pendingItem.employmentCategoryLabel
    );
  });

  if (!matchedIntake) {
    return false;
  }

  if (matchedIntake.status === "reviewed") {
    return true;
  }

  if (params.pendingItem.documentLabel === "雇用契約書") {
    return matchedIntake.consents.some(
      (consent) => consent.documentType === "employment_contract",
    );
  }

  return (
    matchedIntake.consents.some((consent) => consent.documentType === "employee_pledge") &&
    matchedIntake.consents.some((consent) => consent.documentType === "sns_pledge")
  );
}

type ViewerRole = "hq_admin" | "store_admin";

function resolveEmploymentCategoryLabel(params: {
  employmentCategory?: string | null;
  currentRoleLabel?: string | null;
}) {
  if (
    params.currentRoleLabel === "社員C" ||
    params.currentRoleLabel === "社員C・工場" ||
    params.currentRoleLabel === "社員C・工場・近見"
  ) {
    return "社員C";
  }

  if (params.employmentCategory === "part_time") {
    return "アルバイト・パート";
  }

  if (
    params.employmentCategory === "fixed_term_employee" ||
    params.employmentCategory === "regular_employee"
  ) {
    return "社員";
  }

  return undefined;
}

function hasVisibleSubmissionData(params: {
  fullName?: string | null;
  submittedAt?: string | null;
  documentCount: number;
}) {
  return (
    Boolean(params.fullName?.trim()) ||
    Boolean(params.submittedAt) ||
    params.documentCount > 0
  );
}

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const keyword = searchParams.get("keyword") ?? undefined;
  const storeId = searchParams.get("storeId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const permissions = getAdminPermissions(auth.context.role);
  const pendingDisplayActive = shouldShowPendingSubmissionList(new Date());

  if (shouldUseMockData()) {
    const mockIntakes = getMockAdminIntakes();
    const items = mockIntakes
      .filter((item) =>
        permissions.restrictToStore && auth.context.storeId
          ? item.store.id === auth.context.storeId
          : true,
      )
      .map((item) => {
        const employmentCategoryLabel = resolveEmploymentCategoryLabel({
          employmentCategory: item.employmentContract?.employmentCategory,
          currentRoleLabel: item.employmentContract?.currentRoleLabel,
        });
        const documentTypes = item.consents.map((consent) => consent.documentType);
        const isEmploymentContractOnly =
          documentTypes.includes("employment_contract") &&
          !documentTypes.some(
            (documentType) =>
              documentType === "employee_pledge" ||
              documentType === "sns_pledge" ||
              documentType === "retirement_pledge",
          );

        return {
          id: item.id,
          intakeToken: item.intakeToken,
          fullName: item.profile.fullName,
          storeId: item.store.id,
          storeName: item.store.name,
          status: item.status,
          employmentCategoryLabel,
          submittedAt: item.signature?.signedAt,
          documentCount: item.consents.length,
          documentTypes,
          resubmissionState: resolveListResubmissionStateFromMock(item.consents),
          latestRenewalPeriod: item.renewalHistory[0]?.periodLabel,
          latestRenewalStatus: item.renewalHistory[0]?.status,
          pdfUrl: isEmploymentContractOnly
            ? `/employment-contracts/${item.intakeToken}/print`
            : `/admin/intakes/${item.id}/pdf`,
        };
      })
      .filter((item) =>
        shouldDisplayForViewer({
          viewerRole: auth.context.role,
          storeId: item.storeId,
          employmentCategoryLabel: item.employmentCategoryLabel,
        }),
      )
      .filter((item) =>
        hasVisibleSubmissionData({
          fullName: item.fullName,
          submittedAt: item.submittedAt,
          documentCount: item.documentCount,
        }),
      )
      .map(({ storeId, ...item }) => item);

    const pendingItems = pendingDisplayActive
      ? getMockPendingAdminSubmissions()
      .filter(
        (item) =>
          !isMockPendingSubmissionCompleted({
            pendingItem: item,
            intakes: mockIntakes,
          }),
      )
      .filter((item) =>
        permissions.restrictToStore && auth.context.storeId
          ? item.store.id === auth.context.storeId
          : true,
      )
      .map((item) => ({
        id: item.id,
        fullName: item.fullName,
        storeId: item.store.id,
        storeName: item.store.name,
        employmentCategoryLabel: item.employmentCategoryLabel,
        documentLabel: item.documentLabel,
        dueLabel: item.dueLabel,
        state: item.state,
        note: item.note,
      }))
      .filter((item) =>
        shouldDisplayPendingForViewer({
          viewerRole: auth.context.role,
          storeId: item.storeId,
          employmentCategoryLabel: item.employmentCategoryLabel,
        }),
      )
      .map(({ storeId, ...item }) => item)
      : [];

    return ok({
      viewerRole: auth.context.role,
      permissions,
      items,
      pendingItems,
      pendingDisplayActive,
      page,
      pageSize,
      total: items.length,
    });
  }

  const result = await listAdminIntakes({
    keyword,
    storeId,
    status,
    page,
    pageSize,
    adminStoreId: auth.context.storeId,
    restrictToStore: permissions.restrictToStore,
  });

  return ok({
    viewerRole: auth.context.role,
    permissions,
    items: result.items
      .map((item) => {
        const employmentCategoryLabel = resolveEmploymentCategoryLabel({
          employmentCategory: item.employmentContract?.employmentCategory,
          currentRoleLabel: item.employmentContract?.currentRoleLabel,
        });
        const documentTypes = item.documentConsents.map(
          (consent) => consent.documentType,
        );
        const isEmploymentContractOnly =
          documentTypes.includes("employment_contract") &&
          !documentTypes.some(
            (documentType) =>
              documentType === "employee_pledge" ||
              documentType === "sns_pledge" ||
              documentType === "retirement_pledge",
          );

        return {
          id: item.id,
          intakeToken: item.intakeToken,
          fullName: item.fullName,
          storeId: item.store.id,
          storeName: item.store.name,
          status: item.status,
          employmentCategoryLabel,
          submittedAt: item.submittedAt?.toISOString(),
          documentCount: item.documentConsents.length,
          documentTypes,
          resubmissionState: resolveListResubmissionStateFromAudit(item.auditLogs),
          latestRenewalPeriod: undefined,
          latestRenewalStatus: undefined,
          pdfUrl: isEmploymentContractOnly
            ? `/employment-contracts/${item.intakeToken}/print`
            : `/admin/intakes/${item.id}/pdf`,
        };
      })
      .filter((item) =>
        shouldDisplayForViewer({
          viewerRole: auth.context.role,
          storeId: item.storeId,
          employmentCategoryLabel: item.employmentCategoryLabel,
        }),
      )
      .filter((item) =>
        hasVisibleSubmissionData({
          fullName: item.fullName,
          submittedAt: item.submittedAt,
          documentCount: item.documentCount,
        }),
      )
      .map(({ storeId, ...item }) => item),
    page,
    pageSize,
    pendingItems: [],
    pendingDisplayActive,
    total: result.total,
  });
}

function shouldShowPendingSubmissionList(date: Date) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return (month === 6 && day >= 1) || (month === 12 && day >= 1);
}
