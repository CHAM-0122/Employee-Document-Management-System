export type AdminRole = "hq_admin" | "store_admin";

export type AdminPermissions = {
  canViewBankAccount: boolean;
  canViewMyNumber: boolean;
  canInvite: boolean;
  canEditEmploymentContract: boolean;
  canManageDocuments: boolean;
  restrictToStore: boolean;
};

export function getAdminPermissions(role: AdminRole): AdminPermissions {
  return {
    canViewBankAccount: role === "hq_admin" || role === "store_admin",
    canViewMyNumber: role === "hq_admin" || role === "store_admin",
    canInvite: role === "hq_admin" || role === "store_admin",
    canEditEmploymentContract: role === "hq_admin" || role === "store_admin",
    canManageDocuments: role === "hq_admin" || role === "store_admin",
    restrictToStore: role === "store_admin",
  };
}
