import { Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/db/prisma";

export async function createEmployeeAuditLog(params: {
  employeeIntakeId: string;
  action:
    | "started"
    | "saved"
    | "bank_account_saved"
    | "my_number_saved"
    | "bank_account_viewed"
    | "my_number_viewed"
    | "consented"
    | "signed"
    | "submitted";
  actionTarget?: string;
  ipAddress?: string;
  userAgent?: string;
  metadataJson?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorType: "employee",
      employeeIntakeId: params.employeeIntakeId,
      action: params.action,
      actionTarget: params.actionTarget,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadataJson: params.metadataJson as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function createAdminAuditLog(params: {
  adminUserId: string;
  employeeIntakeId?: string;
  action:
    | "invite_sent"
    | "reviewed"
    | "returned"
    | "pdf_generated";
  actionTarget?: string;
  ipAddress?: string;
  userAgent?: string;
  metadataJson?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorType: "admin",
      actorAdminUserId: params.adminUserId,
      employeeIntakeId: params.employeeIntakeId,
      action: params.action,
      actionTarget: params.actionTarget,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadataJson: params.metadataJson as Prisma.InputJsonValue | undefined,
    },
  });
}
