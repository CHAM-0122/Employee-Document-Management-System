import { z } from "zod";

const phoneRegex = /^[0-9+()-\s]+$/;
const postalCodeRegex = /^(\d{7}|\d{3}-\d{4})$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const permanentContractText = "期間の定めなし";
const bankCodeRegex = /^\d{3}$/;
const accountNumberRegex = /^\d{7}$/;
const myNumberRegex = /^\d{12}$/;
const fullWidthJapaneseTextRegex =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々ヶヵ・ 　]+$/u;
const fullWidthJapaneseTextMessage = "文字は全角で入力してください";
const halfWidthNumberMessage = "数字は半角で入力してください";
const requiredFullWidthText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(fullWidthJapaneseTextRegex, fullWidthJapaneseTextMessage);
const optionalFullWidthText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => value === "" || fullWidthJapaneseTextRegex.test(value),
      fullWidthJapaneseTextMessage,
    )
    .optional();
const imageDataUrlSchema = z
  .string()
  .startsWith("data:image/")
  .max(7_000_000);
const optionalNumberSchema = (schema: z.ZodNumber) =>
  z
    .union([schema, z.null(), z.literal("")])
    .optional()
    .transform((value): number | undefined =>
      value === null || value === "" ? undefined : value,
    );
const optionalTrimmedTextSchema = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value): string | undefined =>
      value === null || value === "" ? undefined : value,
    );

export const documentTypeSchema = z.enum([
  "employment_contract",
  "employee_pledge",
  "sns_pledge",
  "retirement_pledge",
]);

export const adminInviteFlowKindSchema = z.enum([
  "onboarding",
  "employment_contract",
]);

export const adminInviteEmploymentTrackSchema = z.enum([
  "part_time",
  "permanent_part_time",
  "head_office_employee",
  "permanent_head_office_employee",
  "commissioned_store_employee",
  "permanent_commissioned_store_employee",
  "employee_c",
]);

export const profileSchema = z
  .object({
    pledgeDate: z.string().regex(dateRegex),
    storeName: z.string().trim().min(1).max(100),
    fullName: requiredFullWidthText(60),
    fullNameKana: requiredFullWidthText(120),
    gender: z.enum(["male", "female", "no_answer"]).optional(),
    birthDate: z.string().regex(dateRegex),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(1).max(20).regex(phoneRegex, halfWidthNumberMessage),
    postalCode: z
      .string()
      .trim()
      .regex(postalCodeRegex, halfWidthNumberMessage)
      .optional()
      .or(z.literal("")),
    currentAddress: z.string().trim().min(1).max(255),
    residentSameAsCurrent: z.boolean(),
    residentAddress: z.string().trim().max(255).optional(),
    photoDataUrl: imageDataUrlSchema.optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.residentSameAsCurrent && !data.residentAddress?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["residentAddress"],
        message: "住民票住所は必須です",
      });
    }
  });

export const employmentSchema = z
  .object({
    emergencyContactName: requiredFullWidthText(60),
    emergencyContactKana: optionalFullWidthText(120),
    emergencyContactRelation: requiredFullWidthText(40),
    emergencyContactPhone: z.string().trim().min(1).max(20).regex(phoneRegex, halfWidthNumberMessage),
    commuteMethod: z.enum(["walk", "bicycle", "train", "bus", "bike", "car"]),
    commuteDistanceKm: z.number().min(0).max(999.9).optional(),
    referralSource: z.enum(["job_posting", "referral", "other"]).optional(),
    referralPerson: optionalFullWidthText(60),
    referralStoreName: z.string().trim().max(80).optional(),
    workDaysPerWeek: z.number().min(0).max(7).optional(),
    workHoursPerWeek: z.number().min(0).max(168).optional(),
    shiftStartTime: z.string().regex(timeRegex).optional(),
    shiftEndTime: z.string().regex(timeRegex).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.referralSource === "referral" && !data.referralPerson?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referralPerson"],
        message: "紹介者名は必須です",
      });
    }
    if (data.referralSource === "referral" && !data.referralStoreName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referralStoreName"],
        message: "紹介者の店舗は必須です",
      });
    }
  });

export const attributesSchema = z
  .object({
    hasSecondJob: z.enum(["yes", "no"]),
    secondJobType: optionalFullWidthText(30),
    secondJobNote: z.string().trim().max(120).optional(),
    isStudent: z.boolean(),
    schoolType: z
      .enum(["university", "junior_college", "vocational", "high_school"])
      .optional(),
    schoolGrade: z.string().trim().max(20).optional(),
    schoolSchedule: z.enum(["daytime", "nighttime"]).optional(),
    schoolName: optionalFullWidthText(120),
    isMinor: z.boolean().optional(),
    guardianName: optionalFullWidthText(60),
    guardianRelation: optionalFullWidthText(40),
    guardianPhone: z
      .string()
      .trim()
      .max(20)
      .regex(phoneRegex, halfWidthNumberMessage)
      .optional()
      .or(z.literal("")),
    guardianWorkPermissionConfirmed: z.boolean().optional(),
    isForeignNational: z.boolean().optional(),
    residenceCardFrontDataUrl: imageDataUrlSchema.optional().or(z.literal("")),
    residenceCardBackDataUrl: imageDataUrlSchema.optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.isStudent) {
      if (!data.schoolType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schoolType"],
          message: "学校区分は必須です",
        });
      }
      if (!data.schoolGrade?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schoolGrade"],
          message: "学年は必須です",
        });
      }
      if (!data.schoolSchedule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schoolSchedule"],
          message: "昼間/夜間は必須です",
        });
      }
      if (!data.schoolName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schoolName"],
          message: "学校名は必須です",
        });
      }
    }
    if (data.isMinor) {
      if (!data.guardianName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianName"],
          message: "保護者氏名は必須です",
        });
      }
      if (!data.guardianRelation?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianRelation"],
          message: "保護者続柄は必須です",
        });
      }
      if (!data.guardianPhone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianPhone"],
          message: "保護者電話番号は必須です",
        });
      }
      if (!data.guardianWorkPermissionConfirmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guardianWorkPermissionConfirmed"],
          message: "保護者の許可確認にチェックしてください",
        });
      }
    }
    if (data.isForeignNational) {
      if (!data.residenceCardFrontDataUrl?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["residenceCardFrontDataUrl"],
          message: "在留カード表面の写真を添付してください",
        });
      }
      if (!data.residenceCardBackDataUrl?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["residenceCardBackDataUrl"],
          message: "在留カード裏面の写真を添付してください",
        });
      }
    }
  });

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1).max(100),
  branchName: z.string().trim().min(1).max(100),
  branchCode: z.string().trim().regex(bankCodeRegex, "支店番号は半角数字3桁で入力してください"),
  accountType: z.enum(["ordinary", "checking", "savings"]),
  accountNumber: z
    .string()
    .trim()
    .regex(accountNumberRegex, "口座番号は半角数字7桁で入力してください"),
  accountHolderKana: requiredFullWidthText(120),
  bankBookImageDataUrl: imageDataUrlSchema,
  agreedUsage: z.literal(true),
  confirmedOwnAccount: z.literal(true),
});

export const myNumberSchema = z
  .object({
    myNumber: z
      .string()
      .trim()
      .regex(myNumberRegex, "マイナンバーは半角数字12桁で入力してください"),
    confirmMyNumber: z
      .string()
      .trim()
      .regex(myNumberRegex, "確認用マイナンバーは半角数字12桁で入力してください"),
    purposeOfUseVersion: z.string().trim().min(1).max(40),
    agreedPurpose: z.literal(true),
    confirmedAccuracy: z.literal(true),
  })
  .superRefine((data, ctx) => {
    if (data.myNumber !== data.confirmMyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmMyNumber"],
        message: "確認用マイナンバーが一致しません",
      });
    }
  });

export const employmentContractSchema = z
  .object({
    employmentCategory: z.enum([
      "regular_employee",
      "fixed_term_employee",
      "part_time",
    ]),
    contractStartDate: z.string().regex(dateRegex),
    contractEndDate: z
      .string()
      .regex(dateRegex)
      .or(z.literal(""))
      .or(z.literal(permanentContractText)),
    renewalPatternText: z.string().trim().min(1).max(255),
    workLocationName: z.string().trim().min(1).max(120),
    workLocationAddress: z.string().trim().min(1).max(255),
    workDaysPerWeek: optionalNumberSchema(z.number().min(0).max(7)),
    dutyDescription: z.string().trim().min(1).max(255),
    jobPositionCode: z.string().trim().min(1).max(20),
    currentRoleLabel: z.string().trim().min(1).max(100),
    shiftStartTime: z.string().regex(timeRegex),
    shiftEndTime: z.string().regex(timeRegex),
    breakMinutes: z.number().int().min(0).max(240),
    overtimeAllowed: z.boolean(),
    holidayWorkAllowed: z.boolean(),
    holidayRuleText: z.string().trim().min(1).max(255),
    basicSalaryMonthly: z.number().int().min(0).max(9999999),
    dutyAllowanceMonthly: z.number().int().min(0).max(9999999),
    hourlyWage: optionalNumberSchema(z.number().int().min(0).max(99999)),
    fixedOvertimeHoursNote: optionalTrimmedTextSchema(120),
    commutingAllowanceMonthly: optionalNumberSchema(
      z.number().int().min(0).max(9999999),
    ),
    commutingAllowanceNote: optionalTrimmedTextSchema(120),
    payClosingDay: z.string().trim().min(1).max(40),
    payDate: z.string().trim().min(1).max(40),
    wagePaymentMethod: z.string().trim().min(1).max(120),
    hasRaise: z.boolean(),
    hasBonus: z.boolean(),
    hasRetirementPay: z.boolean(),
    retirementRuleText: z.string().trim().min(1).max(255),
    socialInsuranceNote: optionalTrimmedTextSchema(120),
    employmentInsuranceNote: optionalTrimmedTextSchema(120),
    transferPossibilityNote: optionalTrimmedTextSchema(255),
  })
  .superRefine((data, ctx) => {
    if (
      data.employmentCategory !== "regular_employee" &&
      (data.contractEndDate === "" ||
        data.contractEndDate === permanentContractText) &&
      data.renewalPatternText !== permanentContractText
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contractEndDate"],
        message: "契約終了日を入力してください",
      });
    }
  });

export const employmentContractConsentSchema = z.object({
  templateId: z.string().trim().min(1),
  version: z.string().trim().min(1).max(40),
  bodySnapshotHtml: z.string().min(1),
  scrolledToEnd: z.boolean().optional(),
  agreeRead: z.literal(true),
  agreeRules: z.literal(true),
  agreeLiability: z.literal(true),
  agreeNoAntiSocialForces: z.literal(true),
  agreeHealthStatusReport: z.literal(true),
});

export const employeePledgeConsentSchema = z.object({
  templateId: z.string().trim().min(1),
  version: z.string().trim().min(1).max(40),
  bodySnapshotHtml: z.string().min(1),
  scrolledToEnd: z.boolean().optional(),
  agreeRead: z.literal(true),
  agreeConfidentiality: z.literal(true),
  agreeDiscipline: z.literal(true),
});

export const snsPledgeConsentSchema = z.object({
  templateId: z.string().trim().min(1),
  version: z.string().trim().min(1).max(40),
  bodySnapshotHtml: z.string().min(1),
  scrolledToEnd: z.boolean().optional(),
  agreeRules: z.literal(true),
  agreeMedia: z.literal(true),
  agreeLiability: z.literal(true),
});

export const retirementPledgeConsentSchema = z.object({
  templateId: z.string().trim().min(1),
  version: z.string().trim().min(1).max(40),
  bodySnapshotHtml: z.string().min(1),
  scrolledToEnd: z.boolean().optional(),
  agreeRead: z.literal(true),
  agreeConfidentiality: z.literal(true),
  agreeReturnItems: z.literal(true),
  agreeNoClaims: z.literal(true),
});

export const signatureSchema = z.object({
  signerName: requiredFullWidthText(60),
  signedDate: z.string().regex(dateRegex),
  signatureDataUrl: z.string().startsWith("data:image/"),
  confirmInputAccuracy: z.literal(true),
  confirmElectronicConsent: z.literal(true),
});

export const submitSchema = z.object({
  finalConfirm: z.literal(true),
});

export const adminInviteSchema = z.object({
  invitedName: z.string().trim().max(100).optional(),
  inviteEmail: z.string().trim().email().max(255),
  storeId: z.string().trim().min(1).max(100),
  expiresAt: z.string().datetime(),
  documentTypes: z.array(documentTypeSchema).min(1),
  flowKind: adminInviteFlowKindSchema,
  employmentTrack: adminInviteEmploymentTrackSchema,
  pledgeEmploymentTerm: z
    .enum([
      "fixed_term",
      "permanent",
      "employee_c",
      "fixed_part_time",
      "permanent_part_time",
      "timee",
      "retirement",
    ])
    .optional(),
});

export const adminReviewSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const adminReturnSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const adminInvalidateSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});
