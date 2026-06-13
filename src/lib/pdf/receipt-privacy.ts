import type { AdminPermissions } from "@/src/lib/admin-auth/policy";

export type ReceiptAudience = "employee" | "admin";
export type ReceiptSensitiveField = "profilePhoto" | "bankAccount" | "myNumber";

export function canIncludeReceiptField(
  audience: ReceiptAudience,
  field: ReceiptSensitiveField,
  permissions?: Pick<AdminPermissions, "canViewBankAccount" | "canViewMyNumber">,
) {
  if (audience === "employee") {
    return field === "profilePhoto";
  }

  if (field === "profilePhoto") {
    return true;
  }
  if (field === "bankAccount") {
    return permissions?.canViewBankAccount === true;
  }
  if (field === "myNumber") {
    return permissions?.canViewMyNumber === true;
  }

  return false;
}
