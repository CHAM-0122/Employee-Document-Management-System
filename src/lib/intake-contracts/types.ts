export type IntakeStatus =
  | "sent"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "returned"
  | "expired";

export type Gender = "male" | "female" | "no_answer";

export type CommuteMethod =
  | "walk"
  | "bicycle"
  | "train"
  | "bus"
  | "bike"
  | "car";

export type ReferralSource = "job_posting" | "referral" | "other";

export type YesNo = "yes" | "no";

export type SchoolType =
  | "university"
  | "junior_college"
  | "vocational"
  | "high_school";

export type SchoolSchedule = "daytime" | "nighttime";

export type DocumentType =
  | "employment_contract"
  | "employee_pledge"
  | "sns_pledge"
  | "retirement_pledge";

export interface ApiErrorResponse {
  ok: false;
  error: {
    code:
      | "INVALID_TOKEN"
      | "EXPIRED_TOKEN"
      | "VALIDATION_ERROR"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "ALREADY_SUBMITTED"
      | "INTERNAL_ERROR";
    message: string;
    fields?: Record<string, string>;
  };
}

export interface ApiOkResponse {
  ok: true;
}

export interface ProfilePayload {
  pledgeDate: string;
  storeName: string;
  fullName: string;
  fullNameKana: string;
  gender?: Gender;
  birthDate: string;
  email: string;
  phone: string;
  postalCode?: string;
  currentAddress: string;
  residentSameAsCurrent: boolean;
  residentAddress?: string;
  photoDataUrl?: string;
}

export interface EmploymentPayload {
  emergencyContactName: string;
  emergencyContactKana?: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  commuteMethod: CommuteMethod;
  commuteDistanceKm?: number;
  referralSource?: ReferralSource;
  referralPerson?: string;
  referralStoreName?: string;
  workDaysPerWeek?: number;
  workHoursPerWeek?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
}

export interface AttributesPayload {
  hasSecondJob: YesNo;
  secondJobType?: string;
  secondJobNote?: string;
  isStudent: boolean;
  schoolType?: SchoolType;
  schoolGrade?: string;
  schoolSchedule?: SchoolSchedule;
  schoolName?: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  guardianWorkPermissionConfirmed?: boolean;
  isForeignNational?: boolean;
  residenceCardFrontDataUrl?: string;
  residenceCardBackDataUrl?: string;
}

export type BankAccountType = "ordinary" | "checking" | "savings";

export interface BankAccountPayload {
  bankName: string;
  branchName: string;
  branchCode: string;
  accountType: BankAccountType;
  accountNumber: string;
  accountHolderKana: string;
  bankBookImageDataUrl: string;
  agreedUsage: boolean;
  confirmedOwnAccount: boolean;
}

export interface MyNumberPayload {
  myNumber: string;
  confirmMyNumber: string;
  purposeOfUseVersion: string;
  agreedPurpose: boolean;
  confirmedAccuracy: boolean;
}

export interface JobPositionOption {
  code: string;
  sortOrder: number;
  name: string;
  basicSalaryMonthly: number;
  dutyAllowanceMonthly: number;
  fixedOvertimeNote?: string;
}

export type EmploymentCategory =
  | "regular_employee"
  | "fixed_term_employee"
  | "part_time";

export interface EmploymentContractPayload {
  employmentCategory: EmploymentCategory;
  contractStartDate: string;
  contractEndDate: string;
  renewalPatternText: string;
  workLocationName: string;
  workLocationAddress: string;
  workDaysPerWeek?: number;
  dutyDescription: string;
  jobPositionCode: string;
  currentRoleLabel: string;
  shiftStartTime: string;
  shiftEndTime: string;
  breakMinutes: number;
  overtimeAllowed: boolean;
  holidayWorkAllowed: boolean;
  holidayRuleText: string;
  basicSalaryMonthly: number;
  dutyAllowanceMonthly: number;
  hourlyWage?: number;
  fixedOvertimeHoursNote?: string;
  commutingAllowanceMonthly?: number;
  commutingAllowanceNote?: string;
  payClosingDay: string;
  payDate: string;
  wagePaymentMethod: string;
  hasRaise: boolean;
  hasBonus: boolean;
  hasRetirementPay: boolean;
  retirementRuleText: string;
  socialInsuranceNote?: string;
  employmentInsuranceNote?: string;
  transferPossibilityNote?: string;
}
