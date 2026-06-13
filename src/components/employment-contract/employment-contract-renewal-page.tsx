"use client";

import { useEffect, useMemo, useState } from "react";

import { SignaturePad } from "@/src/components/intake/signature-pad";
import type { EmploymentContractPayload } from "@/src/lib/intake-contracts/types";

export type IntakeDocument = {
  type: "employment_contract" | "employee_pledge" | "sns_pledge";
  templateId: string;
  version: string;
  title: string;
  bodyHtml: string;
};

export type RenewalBootstrap = {
  companyName: string;
  store: {
    id: string;
    name: string;
  };
  profile: {
    pledgeDate?: string;
    fullName?: string;
    postalCode?: string;
    currentAddress?: string;
  };
  employmentContract?: EmploymentContractPayload;
  documentStatuses?: Array<{
    documentType: "employment_contract" | "employee_pledge" | "sns_pledge";
    adminState: "active" | "returned" | "invalidated";
    adminStateReason?: string;
    adminStateChangedAt?: string;
  }>;
};

export type PartTimeEditableFields = {
  employeeName: string;
  contractStartDate: string;
  contractEndDate: string;
  workDaysPerWeek: string;
  shiftStartHour: string;
  shiftStartMinute: string;
  shiftEndHour: string;
  shiftEndMinute: string;
  hourlyWage: string;
  signedDate: string;
  addressZip: string;
  addressText: string;
  signatureName: string;
};

export type HeadOfficeEditableFields = {
  updateDate: string;
  selectedStoreName: string;
  contractStartDate: string;
  contractEndDate: string;
  currentRoleCode: string;
  currentRoleLabel: string;
  shiftStartTime: string;
  shiftEndTime: string;
  breakMinutes: string;
  socialInsuranceStatus: "有" | "無";
  employmentInsuranceStatus: "有" | "無";
  signedDate: string;
  addressZip: string;
  addressText: string;
  signatureName: string;
};

type HeadOfficeRoleOption = {
  code: string;
  label: string;
  basicSalaryMonthly: number;
  dutyAllowanceMonthly: number;
  fixedOvertimeHours: number;
  monthlyWorkLimitHours: number;
};

type StoreContractMaster = {
  workLocationName: string;
  workLocationAddress: string;
  employerName: string;
  employerAddress: string;
  representativeTitle: string;
  representativeName: string;
  phonePlaceholder: string;
};

const COMMISSIONED_STORE_NAMES = [
  "壱之倉庫",
  "ヨコバチ",
  "小坊主",
  "赤組",
  "餃子屋弐ノ弐上通本店",
  "餃子屋弐ノ弐下通店",
  "餃子屋弐ノ弐中央店",
  "餃子屋弐ノ弐今泉店",
  "餃子屋弐ノ弐南天神店",
  "餃子屋弐ノ弐明治通り店",
  "餃子屋弐ノ弐川端店",
  "餃子屋弐ノ弐渡辺通店",
  "餃子屋弐ノ弐薬院店",
  "餃子屋弐ノ弐大名店",
  "餃子屋弐ノ弐ソラリアステージ店",
  "餃子屋弐ノ弐博多駅地下街店",
  "餃子屋弐ノ弐袋町店",
  "餃子屋弐ノ弐宗右衛門町店",
  "餃子屋弐ノ弐那覇店",
  "餃子屋弐ノ弐牧志店",
] as const;

const DIRECT_MANAGED_STORE_NAMES = [
  "本部",
  "餃子屋弐ノ弐清水工場",
  "餃子屋弐ノ弐近見販売所",
  "餃子弐ノ弐福岡工場",
  "餃子屋弐ノ弐警固店",
  "餃子屋弐ノ弐プラリバ店",
  "餃子屋弐ノ弐ペイペイドーム店",
  "餃子屋弐ノ弐新梅田食道街店",
  "餃子屋弐ノ弐天満店",
] as const;

const EMPLOYMENT_CONTRACT_CONFIRMATION_ITEMS = [
  {
    key: "confirmNoAntiSocialForces",
    label:
      "私は、現在および将来にわたり、暴力団、暴力団員、暴力団関係企業、総会屋、社会運動等標ぼうゴロ、特殊知能暴力集団、その他これらに準ずる者（以下「反社会的勢力」という）に該当せず、かつ反社会的勢力と一切の関係を有しないことを表明し、保証いたします。",
  },
  {
    key: "confirmHealthStatusReport",
    label:
      "私は、現在健康状態に問題がなく、業務の遂行に支障がないことを申告します。また、業務に重大な影響を及ぼす健康状態が判明した場合には、速やかに報告することを誓約します。",
  },
] as const;

function isCommissionedStoreName(storeName: string) {
  return COMMISSIONED_STORE_NAMES.includes(
    storeName as (typeof COMMISSIONED_STORE_NAMES)[number],
  );
}

function isNoFixedTermEmployeeContract(
  contract?: Pick<
    EmploymentContractPayload,
    "employmentCategory" | "contractEndDate" | "renewalPatternText"
  > | null,
) {
  return (
    contract?.employmentCategory === "regular_employee" &&
    (contract.contractEndDate === "期間の定めなし" ||
      contract.renewalPatternText === "期間の定めなし")
  );
}

const DIRECT_MANAGED_MASTER = {
  employerName: "有限会社草野企画",
  employerAddress: "熊本市中央区南坪井町2-8",
  representativeTitle: "代表取締役",
  representativeName: "草野耕平",
  phonePlaceholder: "店長（096-325-0601）",
} as const;

const STORE_CONTRACT_MASTER: Record<string, StoreContractMaster> = {
  "本部": { workLocationName: "本部", workLocationAddress: "熊本市中央区南坪井町2-8", ...DIRECT_MANAGED_MASTER },
  "壱之倉庫": { workLocationName: "壱之倉庫", workLocationAddress: "熊本市中央区南坪井2-8", employerName: "壱之倉庫", employerAddress: "熊本市中央区南坪井2-8", representativeTitle: "代表者", representativeName: "渡辺正和", phonePlaceholder: "店長（096-325-3911）" },
  "ヨコバチ": { workLocationName: "ヨコバチ", workLocationAddress: "熊本市中央区上通町11-40", employerName: "ヨコバチ", employerAddress: "熊本市中央区上通町11-40", representativeTitle: "代表者", representativeName: "富永裕爾", phonePlaceholder: "店長（096-351-4581）" },
  "小坊主": { workLocationName: "おでん屋小坊主", workLocationAddress: "熊本市中央区上通町11-20", employerName: "おでん屋小坊主", employerAddress: "熊本市中央区上通町11-20", representativeTitle: "代表者", representativeName: "末永勇太", phonePlaceholder: "店長（096-352-9450）" },
  "赤組": { workLocationName: "ラーメン赤組", workLocationAddress: "熊本市中央区上通町7-29", employerName: "ラーメン赤組", employerAddress: "熊本市中央区上通町7-29", representativeTitle: "代表者", representativeName: "寺床将太郎", phonePlaceholder: "店長（096-325-8766）" },
  "餃子屋弐ノ弐上通本店": { workLocationName: "餃子屋弐ノ弐上通本店", workLocationAddress: "熊本市中央区上通町2ー2", employerName: "餃子屋弐ノ弐上通本店", employerAddress: "熊本市中央区上通町2ー2", representativeTitle: "代表者", representativeName: "北村大輔", phonePlaceholder: "店長（096-325-6122）" },
  "餃子屋弐ノ弐下通店": { workLocationName: "餃子屋弐ノ弐下通店", workLocationAddress: "熊本市中央区下通2−2", employerName: "餃子屋弐ノ弐下通店", employerAddress: "熊本市中央区下通2−2", representativeTitle: "代表者", representativeName: "馬場孝平", phonePlaceholder: "店長（096-355-8722）" },
  "餃子屋弐ノ弐中央店": { workLocationName: "餃子屋弐ノ弐中央店", workLocationAddress: "熊本市中央区下通1丁目3ー1 NADELビル1F・A号", employerName: "餃子屋弐ノ弐中央店", employerAddress: "熊本市中央区下通1丁目3ー1 NADELビル1F・A号", representativeTitle: "代表者", representativeName: "河野直樹", phonePlaceholder: "店長（096-328-3122）" },
  "餃子屋弐ノ弐今泉店": { workLocationName: "餃子屋弐ノ弐今泉店", workLocationAddress: "福岡市中央区今泉2丁目4−33 エステートモア今泉1F", employerName: "餃子屋弐ノ弐今泉店", employerAddress: "福岡市中央区今泉2丁目4−33 エステートモア今泉1F", representativeTitle: "代表者", representativeName: "小山幸太", phonePlaceholder: "店長（092-739-5022）" },
  "餃子屋弐ノ弐南天神店": { workLocationName: "餃子屋弐ノ弐南天神店", workLocationAddress: "福岡市中央区今泉1丁目16−16", employerName: "餃子屋弐ノ弐南天神店", employerAddress: "福岡市中央区今泉1丁目16−16", representativeTitle: "代表者", representativeName: "入江邦彦", phonePlaceholder: "店長（092-733-3422）" },
  "餃子屋弐ノ弐明治通り店": { workLocationName: "餃子屋弐ノ弐明治通り店", workLocationAddress: "福岡市中央区大名2丁目9−5グランドビル1F", employerName: "餃子屋弐ノ弐明治通り店", employerAddress: "福岡市中央区大名2丁目9−5グランドビル1F", representativeTitle: "代表者", representativeName: "谷口貴洋", phonePlaceholder: "店長（092-751-4122）" },
  "餃子屋弐ノ弐川端店": { workLocationName: "餃子屋弐ノ弐川端店", workLocationAddress: "福岡市博多区上川端町5−108", employerName: "餃子屋弐ノ弐川端店", employerAddress: "福岡市博多区上川端町5−108", representativeTitle: "代表者", representativeName: "平良茂", phonePlaceholder: "店長（092-272-0522）" },
  "餃子屋弐ノ弐渡辺通店": { workLocationName: "餃子屋弐ノ弐渡辺通店", workLocationAddress: "福岡市中央区渡辺通5丁目12−3", employerName: "餃子屋弐ノ弐渡辺通店", employerAddress: "福岡市中央区渡辺通5丁目12−3", representativeTitle: "代表者", representativeName: "石川恭浩", phonePlaceholder: "店長（092-791-9622）" },
  "餃子屋弐ノ弐薬院店": { workLocationName: "餃子屋弐ノ弐薬院店", workLocationAddress: "福岡市中央区薬院3丁目16−35 大山ビル1F", employerName: "餃子屋弐ノ弐薬院店", employerAddress: "福岡市中央区薬院3丁目16−35 大山ビル1F", representativeTitle: "代表者", representativeName: "岡村章史", phonePlaceholder: "店長（092-534-8122）" },
  "餃子屋弐ノ弐大名店": { workLocationName: "餃子屋弐ノ弐大名店", workLocationAddress: "福岡市中央区大名1丁目14−27 ネイビー大名1F", employerName: "餃子屋弐ノ弐大名店", employerAddress: "福岡市中央区大名1丁目14−27 ネイビー大名1F", representativeTitle: "代表者", representativeName: "池田健吾", phonePlaceholder: "店長（092-732-9122）" },
  "餃子屋弐ノ弐ソラリアステージ店": { workLocationName: "餃子屋弐ノ弐ソラリアステージ店", workLocationAddress: "福岡市中央区天神2−11−3 ソラリアステージB2F", employerName: "餃子屋弐ノ弐ソラリアステージ店", employerAddress: "福岡市中央区天神2−11−3 ソラリアステージB2F", representativeTitle: "代表者", representativeName: "庄崎直人", phonePlaceholder: "店長（092-791-8722）" },
  "餃子屋弐ノ弐博多駅地下街店": { workLocationName: "餃子屋弐ノ弐博多駅地下街店", workLocationAddress: "福岡市博多区博多駅中央街1−1 博多ステーションビル地下街C8号", employerName: "餃子屋弐ノ弐博多駅地下街店", employerAddress: "福岡市博多区博多駅中央街1−1 博多ステーションビル地下街C8号", representativeTitle: "代表者", representativeName: "劉琳東", phonePlaceholder: "店長（092-412-0322）" },
  "餃子屋弐ノ弐袋町店": { workLocationName: "餃子屋弐ノ弐袋町店", workLocationAddress: "広島市中区袋町4−1 袋町産業ビル1F", employerName: "餃子屋弐ノ弐袋町店", employerAddress: "広島市中区袋町4−1 袋町産業ビル1F", representativeTitle: "代表者", representativeName: "友田大桐", phonePlaceholder: "店長（082-258-5122）" },
  "餃子屋弐ノ弐宗右衛門町店": { workLocationName: "餃子屋弐ノ弐宗右衛門町店", workLocationAddress: "大阪市中央区宗右衛門町6−7", employerName: "餃子屋弐ノ弐宗右衛門町店", employerAddress: "大阪市中央区宗右衛門町6−7", representativeTitle: "代表者", representativeName: "小野隆史", phonePlaceholder: "店長（06-6211-2522）" },
  "餃子屋弐ノ弐那覇店": { workLocationName: "餃子屋弐ノ弐那覇店", workLocationAddress: "那覇市牧志2−4−7 1F", employerName: "餃子屋弐ノ弐那覇店", employerAddress: "那覇市牧志2−4−7 1F", representativeTitle: "代表者", representativeName: "宮城次郎", phonePlaceholder: "店長（098-867-4322）" },
  "餃子屋弐ノ弐牧志店": { workLocationName: "餃子屋弐ノ弐牧志店", workLocationAddress: "那覇市牧志3−13−10", employerName: "餃子屋弐ノ弐牧志店", employerAddress: "那覇市牧志3−13−10", representativeTitle: "代表者", representativeName: "宮里祐希", phonePlaceholder: "店長（098-868-7922）" },
  "餃子屋弐ノ弐清水工場": { workLocationName: "餃子屋弐ノ弐清水工場", workLocationAddress: "熊本市北区室園2−16", ...DIRECT_MANAGED_MASTER },
  "餃子屋弐ノ弐近見販売所": { workLocationName: "餃子屋弐ノ弐近見販売所", workLocationAddress: "熊本市南区近見3丁目9−1", ...DIRECT_MANAGED_MASTER },
  "餃子弐ノ弐福岡工場": { workLocationName: "餃子弐ノ弐福岡工場", workLocationAddress: "福岡市中央区大名2−9−5 グランドビル1F", ...DIRECT_MANAGED_MASTER },
  "餃子屋弐ノ弐警固店": { workLocationName: "餃子屋弐ノ弐警固店", workLocationAddress: "福岡市中央区警固2−11−15 内野第三警固ビル1F", ...DIRECT_MANAGED_MASTER },
  "餃子屋弐ノ弐プラリバ店": { workLocationName: "餃子屋弐ノ弐プラリバ店", workLocationAddress: "福岡市早良区西新4丁目1−1PRALIVA B113号（地下1F)", ...DIRECT_MANAGED_MASTER },
  "餃子屋弐ノ弐ペイペイドーム店": { workLocationName: "餃子屋弐ノ弐ペイペイドーム店", workLocationAddress: "福岡市中央区地行浜2丁目2−2PayPayドーム区画番号B.S-2（4ゲート餃子屋弐ノ弐）", ...DIRECT_MANAGED_MASTER },
  "餃子屋弐ノ弐新梅田食道街店": { workLocationName: "餃子屋弐ノ弐新梅田食道街店", workLocationAddress: "大阪市北区角田町9−29 新梅田食道街内N1区画", ...DIRECT_MANAGED_MASTER },
  "餃子屋弐ノ弐天満店": { workLocationName: "餃子屋弐ノ弐天満店", workLocationAddress: "大阪市北区天神橋5丁目8−22", ...DIRECT_MANAGED_MASTER },
};

type CityCompensationRule = {
  washerMinimumMonthly: number;
  employeeCMinimumMonthly: number;
  urbanAllowanceMonthly: number;
};

const CITY_COMPENSATION_RULES: Record<"kumamoto" | "fukuoka" | "osaka" | "okinawa" | "hiroshima", CityCompensationRule> = {
  kumamoto: { washerMinimumMonthly: 330000, employeeCMinimumMonthly: 230000, urbanAllowanceMonthly: 0 },
  fukuoka: { washerMinimumMonthly: 360000, employeeCMinimumMonthly: 300000, urbanAllowanceMonthly: 30000 },
  osaka: { washerMinimumMonthly: 370000, employeeCMinimumMonthly: 310000, urbanAllowanceMonthly: 40000 },
  okinawa: { washerMinimumMonthly: 340000, employeeCMinimumMonthly: 280000, urbanAllowanceMonthly: 10000 },
  hiroshima: { washerMinimumMonthly: 360000, employeeCMinimumMonthly: 300000, urbanAllowanceMonthly: 30000 },
};

function resolveRoleTableKey(storeName: string, address: string): keyof typeof CITY_ROLE_TABLES {
  if (storeName.includes("清水工場") || storeName.includes("近見販売所")) {
    return "kumamoto_factory";
  }
  if (storeName.includes("福岡工場")) {
    return "fukuoka_factory";
  }
  if (address.includes("広島")) {
    return "hiroshima";
  }
  if (address.includes("大阪")) {
    return "osaka";
  }
  if (address.includes("那覇") || address.includes("沖縄")) {
    return "okinawa";
  }
  if (address.includes("福岡")) {
    return "fukuoka";
  }
  return "kumamoto";
}

function resolveRoleOptions(storeName: string, address: string): HeadOfficeRoleOption[] {
  const key = resolveRoleTableKey(storeName, address);
  return CITY_ROLE_TABLES[key].length > 0 ? CITY_ROLE_TABLES[key] : CITY_ROLE_TABLES.kumamoto;
}

function resolveCityCompensation(address: string): CityCompensationRule {
  if (address.includes("広島")) {
    return CITY_COMPENSATION_RULES.hiroshima;
  }
  if (address.includes("大阪")) {
    return CITY_COMPENSATION_RULES.osaka;
  }
  if (address.includes("那覇") || address.includes("沖縄")) {
    return CITY_COMPENSATION_RULES.okinawa;
  }
  if (address.includes("福岡")) {
    return CITY_COMPENSATION_RULES.fukuoka;
  }
  return CITY_COMPENSATION_RULES.kumamoto;
}

function resolveStoreContractMaster(storeName: string): StoreContractMaster {
  return STORE_CONTRACT_MASTER[storeName] ?? {
    workLocationName: storeName,
    workLocationAddress: "住所設定待ち",
    employerName: storeName,
    employerAddress: "住所設定待ち",
    representativeTitle: "代表者",
    representativeName: "設定待ち",
    phonePlaceholder: "店長（　　　　　　）",
  };
}

const CITY_ROLE_TABLES: Record<"kumamoto" | "kumamoto_factory" | "fukuoka" | "fukuoka_factory" | "osaka" | "hiroshima" | "okinawa", HeadOfficeRoleOption[]> = {
  kumamoto: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 71, monthlyWorkLimitHours: 243 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 71, monthlyWorkLimitHours: 243 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 71, monthlyWorkLimitHours: 243 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 69, monthlyWorkLimitHours: 241 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 68, monthlyWorkLimitHours: 240 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 67, monthlyWorkLimitHours: 239 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 66, monthlyWorkLimitHours: 238 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 65, monthlyWorkLimitHours: 237 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 64, monthlyWorkLimitHours: 236 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 63, monthlyWorkLimitHours: 235 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 63, monthlyWorkLimitHours: 235 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 61, monthlyWorkLimitHours: 233 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 60, monthlyWorkLimitHours: 232 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 30000, fixedOvertimeHours: 15, monthlyWorkLimitHours: 187 },
  ],
  kumamoto_factory: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 86, monthlyWorkLimitHours: 258 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 85, monthlyWorkLimitHours: 257 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 85, monthlyWorkLimitHours: 257 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 84, monthlyWorkLimitHours: 256 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 83, monthlyWorkLimitHours: 255 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 80, monthlyWorkLimitHours: 252 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 79, monthlyWorkLimitHours: 251 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 78, monthlyWorkLimitHours: 250 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 77, monthlyWorkLimitHours: 249 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 75, monthlyWorkLimitHours: 247 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 74, monthlyWorkLimitHours: 246 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 73, monthlyWorkLimitHours: 245 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 71, monthlyWorkLimitHours: 243 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 30000, fixedOvertimeHours: 19, monthlyWorkLimitHours: 191 },
  ],
  fukuoka: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 65, monthlyWorkLimitHours: 237 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 64, monthlyWorkLimitHours: 236 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 62, monthlyWorkLimitHours: 234 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 61, monthlyWorkLimitHours: 233 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 60, monthlyWorkLimitHours: 232 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 59, monthlyWorkLimitHours: 231 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 58, monthlyWorkLimitHours: 230 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 57, monthlyWorkLimitHours: 229 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 56, monthlyWorkLimitHours: 228 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 55, monthlyWorkLimitHours: 227 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 55, monthlyWorkLimitHours: 227 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 54, monthlyWorkLimitHours: 226 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 52, monthlyWorkLimitHours: 224 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 20000, fixedOvertimeHours: 9, monthlyWorkLimitHours: 181 },
  ],
  fukuoka_factory: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 78, monthlyWorkLimitHours: 250 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 77, monthlyWorkLimitHours: 249 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 76, monthlyWorkLimitHours: 248 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 75, monthlyWorkLimitHours: 247 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 74, monthlyWorkLimitHours: 246 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 73, monthlyWorkLimitHours: 245 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 71, monthlyWorkLimitHours: 243 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 70, monthlyWorkLimitHours: 242 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 69, monthlyWorkLimitHours: 241 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 67, monthlyWorkLimitHours: 239 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 66, monthlyWorkLimitHours: 238 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 65, monthlyWorkLimitHours: 237 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 63, monthlyWorkLimitHours: 235 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 20000, fixedOvertimeHours: 11, monthlyWorkLimitHours: 183 },
  ],
  osaka: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 63, monthlyWorkLimitHours: 235 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 62, monthlyWorkLimitHours: 234 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 60, monthlyWorkLimitHours: 232 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 59, monthlyWorkLimitHours: 231 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 58, monthlyWorkLimitHours: 230 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 57, monthlyWorkLimitHours: 229 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 56, monthlyWorkLimitHours: 228 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 55, monthlyWorkLimitHours: 227 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 54, monthlyWorkLimitHours: 226 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 53, monthlyWorkLimitHours: 225 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 53, monthlyWorkLimitHours: 225 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 52, monthlyWorkLimitHours: 224 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 50, monthlyWorkLimitHours: 222 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 50000, fixedOvertimeHours: 22, monthlyWorkLimitHours: 194 },
  ],
  hiroshima: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 65, monthlyWorkLimitHours: 237 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 64, monthlyWorkLimitHours: 236 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 62, monthlyWorkLimitHours: 234 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 61, monthlyWorkLimitHours: 233 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 60, monthlyWorkLimitHours: 232 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 59, monthlyWorkLimitHours: 231 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 58, monthlyWorkLimitHours: 230 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 57, monthlyWorkLimitHours: 229 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 56, monthlyWorkLimitHours: 228 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 55, monthlyWorkLimitHours: 227 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 55, monthlyWorkLimitHours: 227 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 54, monthlyWorkLimitHours: 226 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 52, monthlyWorkLimitHours: 224 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 50000, fixedOvertimeHours: 23, monthlyWorkLimitHours: 195 },
  ],
  okinawa: [
    { code: "13", label: "店長", basicSalaryMonthly: 180000, dutyAllowanceMonthly: 170000, fixedOvertimeHours: 69, monthlyWorkLimitHours: 241 },
    { code: "12", label: "店長代理", basicSalaryMonthly: 175000, dutyAllowanceMonthly: 165000, fixedOvertimeHours: 69, monthlyWorkLimitHours: 241 },
    { code: "11", label: "副店長", basicSalaryMonthly: 170000, dutyAllowanceMonthly: 160000, fixedOvertimeHours: 68, monthlyWorkLimitHours: 240 },
    { code: "10", label: "副店長代理", basicSalaryMonthly: 165000, dutyAllowanceMonthly: 155000, fixedOvertimeHours: 66, monthlyWorkLimitHours: 238 },
    { code: "9", label: "リーダー", basicSalaryMonthly: 160000, dutyAllowanceMonthly: 150000, fixedOvertimeHours: 65, monthlyWorkLimitHours: 237 },
    { code: "8", label: "ホールマスター", basicSalaryMonthly: 155000, dutyAllowanceMonthly: 145000, fixedOvertimeHours: 64, monthlyWorkLimitHours: 236 },
    { code: "7", label: "1番鍋", basicSalaryMonthly: 150000, dutyAllowanceMonthly: 140000, fixedOvertimeHours: 63, monthlyWorkLimitHours: 235 },
    { code: "6", label: "2番鍋", basicSalaryMonthly: 145000, dutyAllowanceMonthly: 135000, fixedOvertimeHours: 62, monthlyWorkLimitHours: 234 },
    { code: "5", label: "3番鍋", basicSalaryMonthly: 140000, dutyAllowanceMonthly: 130000, fixedOvertimeHours: 61, monthlyWorkLimitHours: 233 },
    { code: "4", label: "レセプト（電話＆予約対応）", basicSalaryMonthly: 135000, dutyAllowanceMonthly: 125000, fixedOvertimeHours: 60, monthlyWorkLimitHours: 232 },
    { code: "3", label: "ドリンカー", basicSalaryMonthly: 130000, dutyAllowanceMonthly: 120000, fixedOvertimeHours: 60, monthlyWorkLimitHours: 232 },
    { code: "2", label: "バッサー", basicSalaryMonthly: 125000, dutyAllowanceMonthly: 115000, fixedOvertimeHours: 59, monthlyWorkLimitHours: 231 },
    { code: "1", label: "ウォッシャー", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 110000, fixedOvertimeHours: 57, monthlyWorkLimitHours: 229 },
    { code: "employee_c", label: "社員C", basicSalaryMonthly: 120000, dutyAllowanceMonthly: 50000, fixedOvertimeHours: 25, monthlyWorkLimitHours: 197 },
  ],
};


function getHalfYearPeriodLabel(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;

  if (month <= 6) {
    return `${year}年1月〜6月`;
  }

  return `${year}年7月〜12月`;
}

function getHalfYearStartDate(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;
  return month <= 6 ? `${year}-01-01` : `${year}-07-01`;
}

function getHalfYearEndDate(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;
  return month <= 6 ? `${year}-06-30` : `${year}-12-31`;
}

function findHeadOfficeRoleOption(options: HeadOfficeRoleOption[], code: string, label: string) {
  return (
    options.find((item) => item.code === code) ??
    options.find((item) => item.label === label) ??
    options[0]
  );
}

function normalizeTimeOrDefault(value: string | undefined, fallback: string) {
  const normalized = value?.trim().replace("：", ":");

  if (normalized && /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function toTimeString(hour: string, minute: string, fallback: string) {
  const trimmedHour = hour.trim();
  const trimmedMinute = minute.trim();

  if (trimmedHour.includes(":") && !trimmedMinute) {
    return normalizeTimeOrDefault(trimmedHour, fallback);
  }

  if (!trimmedHour && trimmedMinute.includes(":")) {
    return normalizeTimeOrDefault(trimmedMinute, fallback);
  }

  if (!trimmedHour || !trimmedMinute) {
    return fallback;
  }

  const normalizedHour = trimmedHour.padStart(2, "0");
  const normalizedMinute = trimmedMinute.padStart(2, "0");
  return normalizeTimeOrDefault(`${normalizedHour}:${normalizedMinute}`, fallback);
}

function toNumberOrDefault(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function EmploymentContractRenewalPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<RenewalBootstrap | null>(null);
  const [document, setDocument] = useState<IntakeDocument | null>(null);
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState({
    agreeRead: false,
    agreeRules: false,
    agreeLiability: false,
  });
  const [signature, setSignature] = useState("");
  const [signatureChecks, setSignatureChecks] = useState({
    confirmInputAccuracy: false,
    confirmElectronicConsent: false,
    confirmNoAntiSocialForces: false,
    confirmHealthStatusReport: false,
  });
  const [partTimeFields, setPartTimeFields] = useState<PartTimeEditableFields>({
    employeeName: "",
    contractStartDate: "",
    contractEndDate: "",
    workDaysPerWeek: "",
    shiftStartHour: "",
    shiftStartMinute: "",
    shiftEndHour: "",
    shiftEndMinute: "",
    hourlyWage: "",
    signedDate: "",
    addressZip: "",
    addressText: "",
    signatureName: "",
  });
  const [headOfficeFields, setHeadOfficeFields] = useState<HeadOfficeEditableFields>({
    updateDate: "",
    selectedStoreName: "",
    contractStartDate: "",
    contractEndDate: "",
    currentRoleCode: "",
    currentRoleLabel: "",
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    breakMinutes: "60",
    socialInsuranceStatus: "有",
    employmentInsuranceStatus: "有",
    signedDate: "",
    addressZip: "",
    addressText: "",
    signatureName: "",
  });

  const periodLabel = useMemo(() => getHalfYearPeriodLabel(), []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [intakeRes, docsRes] = await Promise.all([
          fetch(`/api/public/intakes/${token}`),
          fetch(`/api/public/intakes/${token}/documents`),
        ]);

        if (!intakeRes.ok || !docsRes.ok) {
          throw new Error("雇用契約情報の取得に失敗しました");
        }

        const intakeJson = (await intakeRes.json()) as RenewalBootstrap;
        const docsJson = (await docsRes.json()) as { documents: IntakeDocument[] };

        setBootstrap(intakeJson);
        setDocument(
          docsJson.documents.find((item) => item.type === "employment_contract") ?? null,
        );
        const contract = intakeJson.employmentContract;
        if (contract?.employmentCategory === "part_time") {
          const [startHour = "", startMinute = ""] = splitTime(contract.shiftStartTime);
          const [endHour = "", endMinute = ""] = splitTime(contract.shiftEndTime);
          setPartTimeFields({
            employeeName: intakeJson.profile.fullName ?? "",
            contractStartDate: contract.contractStartDate ?? "",
            contractEndDate: contract.contractEndDate ?? "",
            workDaysPerWeek: "",
            shiftStartHour: startHour,
            shiftStartMinute: startMinute,
            shiftEndHour: endHour,
            shiftEndMinute: endMinute,
            hourlyWage:
              typeof contract.hourlyWage === "number"
                ? String(contract.hourlyWage)
                : "",
            signedDate:
              intakeJson.profile.pledgeDate ??
              contract.contractStartDate ??
              new Date().toISOString().slice(0, 10),
            addressZip: intakeJson.profile.postalCode ?? "",
            addressText: intakeJson.profile.currentAddress ?? "",
            signatureName: intakeJson.profile.fullName ?? "",
          });
        }

        if (contract?.employmentCategory === "regular_employee") {
          const roleOptions = resolveRoleOptions(
            intakeJson.store.name,
            contract.workLocationAddress ?? "",
          );
          const roleOption = findHeadOfficeRoleOption(
            roleOptions,
            contract.jobPositionCode,
            contract.currentRoleLabel,
          );
          const isCommissionedStore = isCommissionedStoreName(intakeJson.store.name);
          setHeadOfficeFields({
            updateDate: contract.contractStartDate || getHalfYearStartDate(),
            selectedStoreName: intakeJson.store.name,
            contractStartDate: contract.contractStartDate ?? "",
            contractEndDate: contract.contractEndDate ?? "",
            currentRoleCode: roleOption.code,
            currentRoleLabel: roleOption.label,
            shiftStartTime: contract.shiftStartTime || "09:00",
            shiftEndTime: contract.shiftEndTime || "18:00",
            breakMinutes: String(contract.breakMinutes || 60),
            socialInsuranceStatus:
              isCommissionedStore || contract.socialInsuranceNote?.includes("無") ? "無" : "有",
            employmentInsuranceStatus:
              isCommissionedStore || contract.employmentInsuranceNote?.includes("無") ? "無" : "有",
            signedDate:
              intakeJson.profile.pledgeDate ??
              contract.contractStartDate ??
              new Date().toISOString().slice(0, 10),
            addressZip: intakeJson.profile.postalCode ?? "",
            addressText: intakeJson.profile.currentAddress ?? "",
            signatureName: intakeJson.profile.fullName ?? "",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  async function postJson(path: string, body: unknown, method: "POST" | "PATCH" = "POST") {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(json?.error?.message ?? "送信に失敗しました");
    }
  }

  function buildUpdatedEmploymentContractPayload(): EmploymentContractPayload {
    const currentContract = bootstrap?.employmentContract;
    if (!currentContract) {
      throw new Error("雇用契約情報が見つかりません");
    }

    if (currentContract.employmentCategory === "part_time") {
      const master = resolveStoreContractMaster(bootstrap.store.name);
      const shiftStartTime = toTimeString(
        partTimeFields.shiftStartHour,
        partTimeFields.shiftStartMinute,
        normalizeTimeOrDefault(currentContract.shiftStartTime, "13:00"),
      );
      const shiftEndTime = toTimeString(
        partTimeFields.shiftEndHour,
        partTimeFields.shiftEndMinute,
        normalizeTimeOrDefault(currentContract.shiftEndTime, "17:00"),
      );
      const parsedWorkDaysPerWeek = Number(partTimeFields.workDaysPerWeek);

      return {
        ...currentContract,
        contractStartDate:
          partTimeFields.contractStartDate ||
          currentContract.contractStartDate ||
          getHalfYearStartDate(),
        contractEndDate:
          currentContract.renewalPatternText === "期間の定めなし"
            ? getHalfYearEndDate()
            : partTimeFields.contractEndDate ||
              currentContract.contractEndDate ||
              getHalfYearEndDate(),
        workLocationName: master.workLocationName,
        workLocationAddress: master.workLocationAddress,
        workDaysPerWeek:
          partTimeFields.workDaysPerWeek && Number.isFinite(parsedWorkDaysPerWeek)
            ? parsedWorkDaysPerWeek
            : currentContract.workDaysPerWeek,
        dutyDescription: partTimeDutyDescription,
        shiftStartTime,
        shiftEndTime,
        hourlyWage: toNumberOrDefault(
          partTimeFields.hourlyWage,
          currentContract.hourlyWage ?? 0,
        ),
        commutingAllowanceMonthly: undefined,
        commutingAllowanceNote: "400円/日 ※通勤した日数分支給する",
        socialInsuranceNote: "法定の条件を満たせば、加入する",
        employmentInsuranceNote: "法定の条件を満たせば、加入する",
      };
    }

    if (currentContract.employmentCategory === "regular_employee") {
      const master = resolveStoreContractMaster(
        headOfficeFields.selectedStoreName || bootstrap.store.name,
      );
      const roleOptions = resolveRoleOptions(
        master.workLocationName,
        master.workLocationAddress,
      );
      const roleOption = findHeadOfficeRoleOption(
        roleOptions,
        headOfficeFields.currentRoleCode,
        headOfficeFields.currentRoleLabel,
      );
      const isCommissionedStore = isCommissionedStoreName(
        headOfficeFields.selectedStoreName || bootstrap.store.name,
      );
      const insuranceStatus = isCommissionedStore ? "無" : "有";
      const isNoFixedTerm = isNoFixedTermEmployeeContract(currentContract);

      return {
        ...currentContract,
        contractStartDate:
          isNoFixedTerm
            ? headOfficeFields.contractStartDate ||
              currentContract.contractStartDate ||
              getHalfYearStartDate()
            : headOfficeFields.contractStartDate ||
              currentContract.contractStartDate ||
              getHalfYearStartDate(),
        contractEndDate:
          isNoFixedTerm
            ? "期間の定めなし"
            : headOfficeFields.contractEndDate ||
              currentContract.contractEndDate ||
              getHalfYearEndDate(),
        renewalPatternText: isNoFixedTerm
          ? "期間の定めなし"
          : currentContract.renewalPatternText,
        workLocationName: master.workLocationName,
        workLocationAddress: master.workLocationAddress,
        jobPositionCode: roleOption.code,
        currentRoleLabel: roleOption.label,
        shiftStartTime: normalizeTimeOrDefault(
          headOfficeFields.shiftStartTime,
          normalizeTimeOrDefault(currentContract.shiftStartTime, "09:00"),
        ),
        shiftEndTime: normalizeTimeOrDefault(
          headOfficeFields.shiftEndTime,
          normalizeTimeOrDefault(currentContract.shiftEndTime, "18:00"),
        ),
        breakMinutes: toNumberOrDefault(
          headOfficeFields.breakMinutes,
          currentContract.breakMinutes || 60,
        ),
        basicSalaryMonthly: roleOption.basicSalaryMonthly,
        dutyAllowanceMonthly: roleOption.dutyAllowanceMonthly,
        fixedOvertimeHoursNote: `${roleOption.fixedOvertimeHours}時間`,
        socialInsuranceNote: insuranceStatus,
        employmentInsuranceNote: insuranceStatus,
      };
    }

    return currentContract;
  }

  async function handleNext() {
    if (step < 2) {
      setStep((current) => current + 1);
    }
  }

  async function handleSubmit() {
    if (!bootstrap || !document) {
      return;
    }

    const allSignatureChecksComplete =
      signatureChecks.confirmInputAccuracy &&
      signatureChecks.confirmElectronicConsent &&
      signatureChecks.confirmNoAntiSocialForces &&
      signatureChecks.confirmHealthStatusReport;

    if (!allSignatureChecksComplete) {
      setError("署名前の確認事項にすべてチェックしてください");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await postJson(
        `/api/public/intakes/${token}/employment-contract`,
        buildUpdatedEmploymentContractPayload(),
        "PATCH",
      );

      const bodySnapshotHtml = appendEmploymentContractConfirmationHtml(
        bootstrap.employmentContract?.employmentCategory === "part_time"
          ? buildPartTimeDocumentHtml({
              fields: partTimeFields,
              contract: bootstrap.employmentContract,
              storeName: bootstrap.store.name,
              periodLabel,
            })
          : bootstrap.employmentContract?.employmentCategory === "regular_employee"
            ? buildHeadOfficeDocumentHtml({
                fields: headOfficeFields,
                periodLabel,
                isNoFixedTerm: isNoFixedTermEmployeeContract(
                  bootstrap.employmentContract,
                ),
              })
            : document.bodyHtml,
      );

      await postJson(`/api/public/intakes/${token}/consents/employment-contract`, {
        templateId: document.templateId,
        version: document.version,
        bodySnapshotHtml,
        scrolledToEnd: true,
        agreeRead: true,
        agreeRules: true,
        agreeLiability: true,
        agreeNoAntiSocialForces: signatureChecks.confirmNoAntiSocialForces,
        agreeHealthStatusReport: signatureChecks.confirmHealthStatusReport,
      });

      await postJson(`/api/public/intakes/${token}/signature`, {
        signerName:
          bootstrap.employmentContract?.employmentCategory === "part_time"
            ? partTimeFields.signatureName || partTimeFields.employeeName
            : bootstrap.employmentContract?.employmentCategory === "regular_employee"
              ? headOfficeFields.signatureName
              : bootstrap.profile.fullName ?? "",
        signedDate:
          bootstrap.employmentContract?.employmentCategory === "part_time"
            ? partTimeFields.signedDate
            : bootstrap.employmentContract?.employmentCategory === "regular_employee"
              ? headOfficeFields.signedDate
              : bootstrap.employmentContract?.contractStartDate ??
                bootstrap.profile.pledgeDate ??
                new Date().toISOString().slice(0, 10),
        signatureDataUrl: signature,
        ...signatureChecks,
      });

      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新手続きに失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Shell>読み込み中です...</Shell>;
  }

  if (!bootstrap || !bootstrap.employmentContract || !document) {
    return <Shell>雇用契約更新データが見つかりませんでした。</Shell>;
  }

  if (completed) {
    return (
      <Shell>
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">更新完了</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            雇用契約の更新手続きが完了しました
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            更新対象期間 {periodLabel} の雇用契約確認と署名を受け付けました。
          </p>
        </section>
      </Shell>
    );
  }

  const contract = bootstrap.employmentContract;
  const storeContractMaster = resolveStoreContractMaster(bootstrap.store.name);
  const isCommissionedStoreEmployee =
    contract.employmentCategory === "regular_employee" &&
    (isCommissionedStoreName(headOfficeFields.selectedStoreName || bootstrap.store.name) ||
      (contract.socialInsuranceNote?.includes("無") &&
        contract.employmentInsuranceNote?.includes("無")));
  const activeHeadOfficeStoreMaster = resolveStoreContractMaster(
    headOfficeFields.selectedStoreName || bootstrap.store.name,
  );
  const activeHeadOfficeRoleOptions = resolveRoleOptions(
    activeHeadOfficeStoreMaster.workLocationName,
    activeHeadOfficeStoreMaster.workLocationAddress,
  );
  const activeHeadOfficeRole = findHeadOfficeRoleOption(
    activeHeadOfficeRoleOptions,
    headOfficeFields.currentRoleCode,
    headOfficeFields.currentRoleLabel,
  );
  const activeHeadOfficeCityCompensation = resolveCityCompensation(
    activeHeadOfficeStoreMaster.workLocationAddress,
  );
  const activeHeadOfficeUrbanAllowanceLabel =
    activeHeadOfficeCityCompensation.urbanAllowanceMonthly > 0
      ? `${activeHeadOfficeCityCompensation.urbanAllowanceMonthly.toLocaleString("ja-JP")}円`
      : "なし";
  const activeHeadOfficeMinimumMonthlyWage =
    activeHeadOfficeRole.code === "employee_c"
      ? activeHeadOfficeCityCompensation.employeeCMinimumMonthly
      : activeHeadOfficeCityCompensation.washerMinimumMonthly;
  const directManagedStoreOptions = DIRECT_MANAGED_STORE_NAMES.map((storeName) => ({
    name: storeName,
    master: resolveStoreContractMaster(storeName),
  }));
  const commissionedStoreOptions = COMMISSIONED_STORE_NAMES.map((storeName) => ({
    name: storeName,
    master: resolveStoreContractMaster(storeName),
  }));
  const headOfficeStoreOptions = isCommissionedStoreEmployee
    ? commissionedStoreOptions
    : directManagedStoreOptions;
  const fixedInsuranceStatus = isCommissionedStoreEmployee ? "無" : "有";
  const steps = ["更新内容確認", "署名"] as const;
  const allSignatureChecksComplete =
    signatureChecks.confirmInputAccuracy &&
    signatureChecks.confirmElectronicConsent &&
    signatureChecks.confirmNoAntiSocialForces &&
    signatureChecks.confirmHealthStatusReport;
  const isNoFixedTermRegularContract = isNoFixedTermEmployeeContract(contract);
  const employmentCategoryLabel =
    contract.employmentCategory === "part_time"
      ? "アルバイト・パート"
      : contract.employmentCategory === "fixed_term_employee"
        ? "有期社員"
        : isNoFixedTermRegularContract
          ? "無期社員"
          : "有期社員";
  const isPermanentPartTimeContract =
    contract.employmentCategory === "part_time" &&
    contract.renewalPatternText === "期間の定めなし";
  const workingHoursLabel = `${contract.shiftStartTime} 〜 ${contract.shiftEndTime}（休憩 ${contract.breakMinutes}分）`;
  const editableWorkingHoursLabel = `${partTimeFields.shiftStartHour || "--"}:${partTimeFields.shiftStartMinute || "--"} 〜 ${partTimeFields.shiftEndHour || "--"}:${partTimeFields.shiftEndMinute || "--"}`;
  const payCycleLabel = `${contract.payClosingDay} 締め / ${contract.payDate} 支払`;
  const partTimeDutyDescription = "ホール、洗い場、ドリンカー、掃除";
  const partTimeContractRows = [
    {
      label: "氏名",
      lines: [partTimeFields.employeeName || ""],
    },
    {
      label: "雇用期間",
      lines: isPermanentPartTimeContract
        ? ["期間の定めなし"]
        : [
            `期間の定め: 有`,
            `${partTimeFields.contractStartDate || "-"} 〜 ${partTimeFields.contractEndDate || "-"}`,
          ],
    },
    {
      label: "契約の更新",
      lines: isPermanentPartTimeContract
        ? ["契約の更新の有無: 無"]
        : [
            "契約の更新の有無: 有",
            "更新期間: 6ヶ月ごと。更新する場合があり得る。",
            "※更新は、期間満了時の業務量、経営状況、労働者の勤務成績・態度により判断する。",
            "更新上限の有無: （無）",
          ],
    },
    {
      label: "就業場所",
      lines: [
        `（雇入れ直後）${storeContractMaster.workLocationName}`,
        storeContractMaster.workLocationAddress || "住所設定待ち",
        "（変更の範囲）会社の定める場所",
      ],
    },
    {
      label: "業務の内容",
      lines: [
        `（雇入れ直後）${partTimeDutyDescription}`,
        "（変更の範囲）会社の定める業務",
      ],
    },
    {
      label: "就業日数",
      lines: [partTimeFields.workDaysPerWeek ? `週 ${partTimeFields.workDaysPerWeek} 日` : "週 - 日"],
    },
    {
      label: "就業時間",
      lines: [
        editableWorkingHoursLabel,
        "※業務の都合により、就業時間を、繰上げまたは繰り下げることがある",
      ],
    },
    {
      label: "休憩時間",
      lines: [
        "労働時間が6時間を超える場合、45分間",
        "8時間を超える場合、60分間",
      ],
    },
    {
      label: "所定時間外労働",
      lines: ["業務の都合により、発生することがある。"],
    },
    {
      label: "休日",
      lines: ["シフトによる（週1回は必ず休日を設ける）"],
    },
    {
      label: "休暇",
      lines: ["年次有給休暇 6ヶ月継続勤務した場合 法定のとおり"],
    },
    {
      label: "賃金",
      lines: [
        `時給 ${partTimeFields.hourlyWage || "-"}円`,
        "通勤手当 400円/日 ※通勤した日数分支給する",
        "時間外、休日又は深夜労働に対して支払われる割増賃金率",
        "イ 法定外労働 25％ ※月60時間超 50％",
        "ロ 法定休日労働 35％",
        "ハ 深夜労働 25％",
        `締切日 ${contract.payClosingDay} ・ 支払日 ${contract.payDate} ・ 支払方法 ${contract.wagePaymentMethod}`,
        "労使協定に基づく賃金支払い時の控除（無）",
        "昇給（有 ※但し業績による）",
        "賞与（無）",
        "退職金（無）",
      ],
    },
    {
      label: "加入保険",
      lines: ["法定の条件を満たせば、加入する"],
    },
    {
      label: "退職に関する事項",
      lines: [
        "1. 定年制：（有）（満60歳）継続雇用制度 65歳まで",
        "2. 創業支援等措置 （無）",
        "3. 自己都合退職（自己都合退職の場合、退職する30日前に届け出ること）",
        "4. 解雇（解雇については、当社就業規則による）",
      ],
    },
    {
      label: "その他",
      lines: [
        "1. 雇用管理の改善等に関する事項に係る相談窓口",
        `部署及び連絡先 ${storeContractMaster.phonePlaceholder}`,
        "2. 以上の他は、当社就業規則による",
        "就業規則を確認できる場所や方法（就業規則に備付）",
        "3. 店舗敷地内は、禁煙です",
        "本書の交付は、労働基準法15条に基づく労働条件の明示及び短時間労働者及び有期雇用労働者の雇用管理の改善等に関する法律第6条に基づく文書の交付を兼ねるものであること。",
      ],
    },
  ];
  const summaryCards =
    contract.employmentCategory === "part_time"
      ? [
          { label: "更新対象期間", value: periodLabel },
          { label: "氏名", value: bootstrap.profile.fullName || "-" },
          { label: "店舗", value: bootstrap.store.name },
          { label: "雇用区分", value: employmentCategoryLabel },
        ]
      : [
          { label: "更新対象期間", value: periodLabel },
          { label: "氏名", value: bootstrap.profile.fullName || "-" },
          { label: "店舗", value: bootstrap.store.name },
          { label: "雇用区分", value: employmentCategoryLabel },
          ...(isNoFixedTermRegularContract
            ? []
            : [
                { label: "契約開始日", value: contract.contractStartDate },
                { label: "契約終了日", value: contract.contractEndDate },
              ]),
          { label: "契約更新", value: contract.renewalPatternText },
          { label: "役職", value: contract.currentRoleLabel },
          { label: "就業場所", value: contract.workLocationName },
          { label: "業務内容", value: contract.dutyDescription },
          { label: "所定の労働時間等", value: workingHoursLabel },
          { label: "休日", value: contract.holidayRuleText },
        ];
  const returnedEmploymentContract = bootstrap.documentStatuses?.find(
    (item) =>
      item.documentType === "employment_contract" &&
      (item.adminState === "returned" || item.adminState === "invalidated"),
  );

  return (
    <Shell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-[2rem] bg-slate-900 px-6 py-8 text-white shadow-xl shadow-slate-900/20">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            Contract Renewal
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            雇用契約更新の確認と署名
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            更新期間は {periodLabel} です。雇用契約書のみを独立して確認し、署名できます。
          </p>
        </header>

        {returnedEmploymentContract ? (
          <section className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-950 shadow-sm">
            <p className="text-sm font-semibold text-amber-800">
              再提出が必要です
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              管理者から雇用契約書が差し戻されています
            </h2>
            <div className="mt-4 space-y-2 text-sm leading-7 text-slate-800">
              <p>
                状態:{" "}
                {returnedEmploymentContract.adminState === "returned"
                  ? "差し戻し"
                  : "無効化"}
              </p>
              <p>
                {returnedEmploymentContract.adminStateReason ||
                  "管理者から再提出依頼があります。"}
              </p>
              {returnedEmploymentContract.adminStateChangedAt ? (
                <p>
                  処理日時:{" "}
                  {new Date(
                    returnedEmploymentContract.adminStateChangedAt,
                  ).toLocaleString("ja-JP")}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">進行状況</p>
            <ol className="mt-4 space-y-3">
              {steps.map((label, index) => (
                <li
                  key={label}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    index === step
                      ? "bg-amber-100 text-amber-950"
                      : index < step
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold">
                    {index + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </aside>

          <main className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {step === 0 ? (
              <section>
                <SectionTitle
                  eyebrow="Step 1"
                  title="更新内容を確認"
                  description={
                    contract.employmentCategory === "part_time"
                      ? "ピンク欄に相当する項目を入力しながら、今回のアルバイト・パート雇用条件を確認してください。"
                      : contract.employmentCategory === "regular_employee"
                        ? isCommissionedStoreEmployee
                          ? "委託店舗社員用の労働条件確認書に沿って、店舗・役職・契約条件を確認してください。"
                          : "本部社員用の労働条件確認書に沿って、店舗・役職・契約条件を確認してください。"
                        : "半年ごとの雇用契約更新として、今回適用する期間と条件を確認してください。"
                  }
                />
                {contract.employmentCategory === "regular_employee" ? (
                  <div className="space-y-5">
                    <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                      {isCommissionedStoreEmployee
                        ? "店舗名を選択すると就業場所が自動で反映されます。保険欄は委託店舗社員用に固定表示です。"
                        : "店舗名を選択すると、使用者・住所・就業場所が自動で反映されます。役職を選ぶと、基本給・職務手当・固定残業時間も連動表示されます。"}
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-300 bg-white p-6 shadow-sm">
                      <div className="border-b border-slate-300 pb-5 text-center">
                        <h3 className="text-3xl font-semibold tracking-[0.08em] text-slate-900">労働条件確認書</h3>
                      </div>
                      <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_1fr]">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">更新日</span>
                          <ContractInput
                            type="date"
                            value={headOfficeFields.updateDate}
                            onChange={(value) => setHeadOfficeFields((current) => ({ ...current, updateDate: value }))}
                          />
                        </label>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800">
                          <p>使用者　{isCommissionedStoreEmployee ? activeHeadOfficeStoreMaster.employerName : DIRECT_MANAGED_MASTER.employerName}</p>
                          <p>{isCommissionedStoreEmployee ? activeHeadOfficeStoreMaster.representativeTitle : DIRECT_MANAGED_MASTER.representativeTitle}　{isCommissionedStoreEmployee ? activeHeadOfficeStoreMaster.representativeName : DIRECT_MANAGED_MASTER.representativeName}</p>
                          <p>住所　{isCommissionedStoreEmployee ? activeHeadOfficeStoreMaster.employerAddress : DIRECT_MANAGED_MASTER.employerAddress}</p>
                        </div>
                      </div>
                      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white">
                        {!isNoFixedTermRegularContract ? (
                          <EditablePaperContractRow label="契約期間">
                            <div className="space-y-3">
                              <p className="text-sm leading-7 text-slate-700">期間の定め有</p>
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-xs font-semibold text-amber-800">
                                  契約期間は店長が入力します
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {headOfficeFields.contractStartDate || "店長入力待ち"} 〜 {headOfficeFields.contractEndDate || "店長入力待ち"}
                                </p>
                              </div>
                              <div className="space-y-1 text-sm leading-7 text-slate-700">
                                <p>更新期間: 6ヶ月ごと。更新する場合があり得る。</p>
                                <p>※更新は、期間満了時の業務量、経営状況、労働者の勤務成績・態度により判断する。</p>
                                <p>更新上限の有無: （無）</p>
                              </div>
                            </div>
                          </EditablePaperContractRow>
                        ) : null}
                        <EditablePaperContractRow label="就業の場所">
                          <div className="space-y-3">
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">店舗名</span>
                              <select
                                value={headOfficeFields.selectedStoreName}
                                onChange={(event) => setHeadOfficeFields((current) => ({ ...current, selectedStoreName: event.target.value }))}
                                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400"
                              >
                                {headOfficeStoreOptions.map((store) => (
                                  <option key={store.name} value={store.name}>{store.name}</option>
                                ))}
                              </select>
                            </label>
                            <p>（雇い入れ直後） 店舗名：{activeHeadOfficeStoreMaster.workLocationName}</p>
                            <p>住所：{activeHeadOfficeStoreMaster.workLocationAddress}</p>
                            <p>（変更の範囲） 会社の定める場所</p>
                          </div>
                        </EditablePaperContractRow>
                        <EditablePaperContractRow label="従事すべき業務の内容">
                          <div className="space-y-3">
                            <p>（雇い入れ直後） 他店舗の応援等</p>
                            <p>（変更の範囲） 会社の定める業務</p>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">現在の役職</span>
                              <select
                                value={headOfficeFields.currentRoleCode}
                                onChange={(event) => {
                                  const option = findHeadOfficeRoleOption(activeHeadOfficeRoleOptions, event.target.value, "");
                                  setHeadOfficeFields((current) => ({
                                    ...current,
                                    currentRoleCode: option.code,
                                    currentRoleLabel: option.label,
                                  }));
                                }}
                                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400"
                              >
                                {activeHeadOfficeRoleOptions.map((option) => (
                                  <option key={option.code} value={option.code}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </EditablePaperContractRow>
                        <EditablePaperContractRow label="始業、終業の時刻、休憩時間等">
                          <div className="space-y-3">
                            <p>1ヶ月変形労働制</p>
                            <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px]">
                              <ContractField label="始業時刻">
                                <ContractInput type="time" value={headOfficeFields.shiftStartTime} onChange={(value) => setHeadOfficeFields((current) => ({ ...current, shiftStartTime: value }))} />
                              </ContractField>
                              <ContractField label="終業時刻">
                                <ContractInput type="time" value={headOfficeFields.shiftEndTime} onChange={(value) => setHeadOfficeFields((current) => ({ ...current, shiftEndTime: value }))} />
                              </ContractField>
                              <ContractField label="休憩時間">
                                <ContractInput value={headOfficeFields.breakMinutes} onChange={(value) => setHeadOfficeFields((current) => ({ ...current, breakMinutes: value }))} />
                              </ContractField>
                            </div>
                            <p>ただし、他店舗応援時は、他店舗の労働時間とする。</p>
                          </div>
                        </EditablePaperContractRow>
                        <PaperContractRow label="所定外労働" lines={["1. 所定時間外労働をさせることが有る", "2. 休日労働をさせることが有る"]} />
                        <PaperContractRow label="休日" lines={["1. 週休2日制（毎週月曜日から日曜日の間） ※シフトによる", "2. その他会社が指定する日"]} />
                        <PaperContractRow label="休暇" lines={["1. 年次有給休暇 6ヶ月継続勤務した場合→法令の通り", "2. 育児休業 一定の要件を満たさなければ取得不可能", "3. 介護休業 一定の要件を満たさなければ取得不可能", "4. 子の看護休暇、介護休暇 1年に5日（ただし対象者が2名以上の時は10日）"]} />
                        <PaperContractRow label="賃金" lines={["1. 基本賃金 役職による（下記参照）", `2. 諸手当`, "職務手当 役職による（下記参照）", "食べ歩き手当 月10,000円", "書籍研修手当 月20,000円", `都市手当 ${activeHeadOfficeUrbanAllowanceLabel}`, "旅手当 月10,000円", "健康手当 月10,000円", "物価応援手当 月20,000円", "精勤手当 月10,000円", "通勤手当 月10,000円", `※最低賃金：月額 ${activeHeadOfficeMinimumMonthlyWage.toLocaleString("ja-JP")}円`, "3. 時間外、休日又は深夜労働に対して支払われる割増賃金率", "イ 法定外労働（25）％ ※2023年4月〜月60時間超（50）％", "ロ 法定休日労働（35）％", "ハ 深夜労働（25）％", `※固定残業代が職務手当に含まれている。含まれる時間は ${activeHeadOfficeRole.fixedOvertimeHours} 時間`, "4. 賃金締切日 毎月末日", "5. 賃金支払日 翌月10日", "6. 賃金支払方法 本人の指定する金融機関の預金口座（本人名義口座に限る）", "7. 昇給 [ 有 ]", "8. 賞与 [ 有 ]", "9. 退職金 [ 無 ]"]} />
                        <PaperContractRow label="退職に関する事項" lines={["1. 定年制 [ 60歳 ] 再雇用あり", "2. 50歳の誕生日の月末にて、『役職定年』となる", "3. 創業支援等措置 無", "4. 自己都合退職の手続（退職する30日以上前に届け出ること）", "5. 解雇の事由及び手続（詳細は社内規則による）"]} />
                        <PaperContractRow
                          label="その他"
                          lines={[
                            `・社会保険等の加入状況 [ ${fixedInsuranceStatus} ]`,
                            `・雇用保険の適用 [ ${fixedInsuranceStatus} ]`,
                            "・その他（業務の都合上他の部署への配置転換を命じることがある）",
                            "・雇用管理の改善に関する事項に関する相談窓口",
                            isCommissionedStoreEmployee ? `担当組織（連絡先 ${activeHeadOfficeStoreMaster.phonePlaceholder}）` : "担当組織（連絡先　（有）草野企画本部　096-325-0601）",
                            "・以上のほかは、当社就業規則による",
                            "就業規則を確認できる場所や方法（就業場所に備付）",
                          ]}
                        />
                      </div>
                      <div className="mt-6 rounded-[1.75rem] border border-slate-300 bg-white p-6 shadow-sm">
                        <h4 className="text-xl font-semibold text-slate-900">別紙1 役職ごとの基本給・職務手当</h4>
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300">
                          <table className="w-full border-collapse text-sm text-slate-800">
                            <thead>
                              <tr className="bg-slate-100 text-left">
                                <th className="border border-slate-300 px-3 py-2">役職</th>
                                <th className="border border-slate-300 px-3 py-2">基本給</th>
                                <th className="border border-slate-300 px-3 py-2">職務手当</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeHeadOfficeRoleOptions.map((option) => (
                                <tr
                                  key={option.code}
                                  className={option.code === activeHeadOfficeRole.code ? "bg-amber-50" : "bg-white"}
                                >
                                  <td className="border border-slate-300 px-3 py-2">{option.label}</td>
                                  <td className="border border-slate-300 px-3 py-2">¥{option.basicSalaryMonthly.toLocaleString("ja-JP")}</td>
                                  <td className="border border-slate-300 px-3 py-2">¥{option.dutyAllowanceMonthly.toLocaleString("ja-JP")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="mt-6 rounded-[1.75rem] border border-slate-300 bg-white p-6 shadow-sm">
                        <h4 className="text-xl font-semibold text-slate-900">別紙2 残業代について</h4>
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300">
                          <table className="w-full border-collapse text-sm text-slate-800">
                            <thead>
                              <tr className="bg-slate-100 text-left">
                                <th className="border border-slate-300 px-3 py-2">役職</th>
                                <th className="border border-slate-300 px-3 py-2">固定残業代内で、残業可能な時間</th>
                                <th className="border border-slate-300 px-3 py-2">1ヶ月に労働可能な上限時間</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeHeadOfficeRoleOptions.map((option) => (
                                <tr
                                  key={`${option.code}-overtime`}
                                  className={option.code === activeHeadOfficeRole.code ? "bg-amber-50" : "bg-white"}
                                >
                                  <td className="border border-slate-300 px-3 py-2">{option.label}</td>
                                  <td className="border border-slate-300 px-3 py-2">{option.fixedOvertimeHours}時間</td>
                                  <td className="border border-slate-300 px-3 py-2">{option.monthlyWorkLimitHours}時間</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                          <p>◆1ヶ月の労働時間が、上限時間を超えた場合、割増単価となる</p>
                          <p>◆実際には、1ヶ月の労働時間の合計が、休日出勤時間を除き、200時間を超えた場合、超えた時間に対し、時給1500円を支払する（2026年5月現在）</p>
                          <p>（社員Cは、1ヶ月172時間を超えた場合）</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : contract.employmentCategory === "part_time" ? (
                  <div className="space-y-5">
                    <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                      原本の雇用契約書に沿って内容を確認してください。契約期間と時給は店長が入力します。相違があれば署名前に本部または店舗責任者へ連絡してください。
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-300 bg-white p-6 shadow-sm">
                      <div className="border-b border-slate-300 pb-5 text-center">
                        <h3 className="text-3xl font-semibold tracking-[0.08em] text-slate-900">雇用契約書</h3>
                      </div>
                      <p className="mt-5 text-sm leading-7 text-slate-800">以下の条件により雇用契約を締結する。</p>
                      <div className="mt-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                        更新対象期間: {periodLabel}
                      </div>
                      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white">
                    <EditablePaperContractRow label="氏名">
                      <ContractInput
                        value={partTimeFields.employeeName}
                        onChange={(value) =>
                          setPartTimeFields((current) => ({ ...current, employeeName: value, signatureName: current.signatureName || value }))
                        }
                      />
                    </EditablePaperContractRow>
                    <EditablePaperContractRow label="雇用期間">
                      {isPermanentPartTimeContract ? (
                        <p className="text-sm font-semibold text-slate-900">
                          期間の定めなし
                        </p>
                      ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-xs font-semibold text-amber-800">
                            契約期間は店長が入力します
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {`${partTimeFields.contractStartDate || "店長入力待ち"} 〜 ${partTimeFields.contractEndDate || "店長入力待ち"}`}
                          </p>
                        </div>
                      )}
                    </EditablePaperContractRow>
                    <PaperContractRow
                      label="契約の更新"
                      lines={
                        isPermanentPartTimeContract
                          ? ["契約の更新の有無: 無"]
                          : [
                              "契約の更新の有無: 有",
                              "更新期間: 6ヶ月ごと。更新する場合があり得る。",
                              "※更新は、期間満了時の業務量、経営状況、労働者の勤務成績・態度により判断する。",
                              "更新上限の有無: （無）",
                            ]
                      }
                    />
                    <PaperContractRow
                      label="就業場所"
                      lines={[
                        `（雇入れ直後）${storeContractMaster.workLocationName}`,
                        storeContractMaster.workLocationAddress || "住所設定待ち",
                        "（変更の範囲）会社の定める場所",
                      ]}
                    />
                    <PaperContractRow
                      label="業務の内容"
                      lines={[
                        `（雇入れ直後）${partTimeDutyDescription}`,
                        "（変更の範囲）会社の定める業務",
                      ]}
                    />
                    <EditablePaperContractRow label="就業日数">
                      <div className="flex items-center gap-3">
                        <span>週</span>
                        <ContractInput
                          value={partTimeFields.workDaysPerWeek}
                          onChange={(value) => setPartTimeFields((current) => ({ ...current, workDaysPerWeek: value }))}
                          className="w-24"
                        />
                        <span>日</span>
                      </div>
                    </EditablePaperContractRow>
                    <EditablePaperContractRow label="就業時間">
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                          <div className="grid grid-cols-2 gap-2">
                            <ContractInput value={partTimeFields.shiftStartHour} onChange={(value) => setPartTimeFields((current) => ({ ...current, shiftStartHour: value }))} placeholder="始業時" />
                            <ContractInput value={partTimeFields.shiftStartMinute} onChange={(value) => setPartTimeFields((current) => ({ ...current, shiftStartMinute: value }))} placeholder="始業分" />
                          </div>
                          <span className="text-center text-slate-500">〜</span>
                          <div className="grid grid-cols-2 gap-2">
                            <ContractInput value={partTimeFields.shiftEndHour} onChange={(value) => setPartTimeFields((current) => ({ ...current, shiftEndHour: value }))} placeholder="終業時" />
                            <ContractInput value={partTimeFields.shiftEndMinute} onChange={(value) => setPartTimeFields((current) => ({ ...current, shiftEndMinute: value }))} placeholder="終業分" />
                          </div>
                        </div>
                        <p className="text-sm leading-7 text-slate-700">※業務の都合により、就業時間を、繰上げまたは繰り下げることがある</p>
                      </div>
                    </EditablePaperContractRow>
                    <PaperContractRow
                      label="休憩時間"
                      lines={[
                        "労働時間が6時間を超える場合、45分間",
                        "8時間を超える場合、60分間",
                      ]}
                    />
                    <PaperContractRow
                      label="所定時間外労働"
                      lines={["業務の都合により、発生することがある。"]}
                    />
                    <PaperContractRow label="休日" lines={["シフトによる（週1回は必ず休日を設ける）"]} />
                    <PaperContractRow label="休暇" lines={["年次有給休暇 6ヶ月継続勤務した場合 法定のとおり"]} />
                    <EditablePaperContractRow label="賃金">
                      <div className="space-y-3 leading-7">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-xs font-semibold text-amber-800">
                            時給は店長が入力します
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            時給 {partTimeFields.hourlyWage || "店長入力待ち"} 円
                          </p>
                        </div>
                        <p>通勤手当 400円/日 ※通勤した日数分支給する</p>
                        <p>時間外、休日又は深夜労働に対して支払われる割増賃金率</p>
                        <p>イ 法定外労働 25％ ※月60時間超 50％</p>
                        <p>ロ 法定休日労働 35％</p>
                        <p>ハ 深夜労働 25％</p>
                        <p>締切日 {contract.payClosingDay} ・ 支払日 {contract.payDate}</p>
                        <p>支払方法 {contract.wagePaymentMethod}</p>
                        <p>労使協定に基づく賃金支払い時の控除（無）</p>
                        <p>昇給（有 ※但し業績による）</p>
                        <p>賞与（無）</p>
                        <p>退職金（無）</p>
                      </div>
                    </EditablePaperContractRow>
                    <PaperContractRow label="加入保険" lines={["法定の条件を満たせば、加入する"]} />
                    <PaperContractRow
                      label="退職に関する事項"
                      lines={[
                        "1. 定年制：（有）（満60歳）継続雇用制度 65歳まで",
                        "2. 創業支援等措置 （無）",
                        "3. 自己都合退職（自己都合退職の場合、退職する30日前に届け出ること）",
                        "4. 解雇（解雇については、当社就業規則による）",
                      ]}
                    />
                    <PaperContractRow
                      label="その他"
                      lines={[
                        "1. 雇用管理の改善等に関する事項に係る相談窓口",
                        `部署及び連絡先 ${storeContractMaster.phonePlaceholder}`,
                        "2. 以上の他は、当社就業規則による",
                        "就業規則を確認できる場所や方法（就業規則に備付）",
                        "3. 店舗敷地内は、禁煙です",
                      ]}
                    />
                      </div>
                      <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-slate-300 bg-slate-50 p-5 md:grid-cols-[120px_minmax(0,1fr)]">
                        <div className="text-sm font-semibold text-slate-700">雇用者</div>
                        <div className="space-y-2 text-sm leading-7 text-slate-800">
                          <p>{storeContractMaster.employerAddress}</p>
                          <p>{storeContractMaster.employerName}</p>
                          <p>{storeContractMaster.representativeTitle} {storeContractMaster.representativeName}</p>
                        </div>
                      </div>
                      <p className="mt-5 text-sm leading-8 text-slate-800">
                        本書の交付は、労働基準法15条に基づく労働条件の明示及び短時間労働者及び有期雇用労働者の雇用管理の改善等に関する法律第6条に基づく文書の交付を兼ねるものであること。
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section>
                <SectionTitle
                  eyebrow="Step 2"
                  title="更新署名"
                  description="今回の更新期間について署名します。"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyField label="更新期間" value={periodLabel} />
                  <ContractField label="日付">
                    <ContractInput
                      type="date"
                      value={contract.employmentCategory === "regular_employee" ? headOfficeFields.signedDate : partTimeFields.signedDate}
                      onChange={(value) =>
                        contract.employmentCategory === "regular_employee"
                          ? setHeadOfficeFields((current) => ({ ...current, signedDate: value }))
                          : setPartTimeFields((current) => ({ ...current, signedDate: value }))
                      }
                    />
                  </ContractField>
                  <ContractField label="住所: 〒">
                    <ContractInput
                      value={contract.employmentCategory === "regular_employee" ? headOfficeFields.addressZip : partTimeFields.addressZip}
                      onChange={(value) =>
                        contract.employmentCategory === "regular_employee"
                          ? setHeadOfficeFields((current) => ({ ...current, addressZip: value }))
                          : setPartTimeFields((current) => ({ ...current, addressZip: value }))
                      }
                      placeholder="000-0000"
                    />
                  </ContractField>
                  <ContractField label="住所詳細">
                    <ContractTextarea
                      value={contract.employmentCategory === "regular_employee" ? headOfficeFields.addressText : partTimeFields.addressText}
                      onChange={(value) =>
                        contract.employmentCategory === "regular_employee"
                          ? setHeadOfficeFields((current) => ({ ...current, addressText: value }))
                          : setPartTimeFields((current) => ({ ...current, addressText: value }))
                      }
                    />
                  </ContractField>
                  <ContractField label="氏名">
                    <ContractInput
                      value={contract.employmentCategory === "regular_employee" ? headOfficeFields.signatureName : partTimeFields.signatureName}
                      onChange={(value) =>
                        contract.employmentCategory === "regular_employee"
                          ? setHeadOfficeFields((current) => ({ ...current, signatureName: value }))
                          : setPartTimeFields((current) => ({ ...current, signatureName: value }))
                      }
                    />
                  </ContractField>
                </div>
                <div className="mt-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      手書きサイン
                    </span>
                    <SignaturePad value={signature} onChange={setSignature} />
                  </label>
                </div>
                <div className="mt-5 space-y-3">
                  <CheckboxRow
                    checked={signatureChecks.confirmInputAccuracy}
                    label="更新内容に誤りがないことを確認しました"
                    onChange={(checked) =>
                      setSignatureChecks((current) => ({
                        ...current,
                        confirmInputAccuracy: checked,
                      }))
                    }
                  />
                  <CheckboxRow
                    checked={signatureChecks.confirmElectronicConsent}
                    label="電子署名により今回の雇用契約更新に同意します"
                    onChange={(checked) =>
                      setSignatureChecks((current) => ({
                        ...current,
                        confirmElectronicConsent: checked,
                      }))
                    }
                  />
                  {EMPLOYMENT_CONTRACT_CONFIRMATION_ITEMS.map((item) => (
                    <CheckboxRow
                      key={item.key}
                      checked={signatureChecks[item.key]}
                      label={item.label}
                      onChange={(checked) =>
                        setSignatureChecks((current) => ({
                          ...current,
                          [item.key]: checked,
                        }))
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <footer className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={saving || step === 0}
              >
                戻る
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  次へ進む
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving || !allSignatureChecksComplete}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? "送信中..." : "更新を完了する"}
                </button>
              )}
            </footer>
          </main>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] px-4 py-8 text-slate-900 md:px-8">
      {children}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </header>
  );
}

function PaperContractRow({
  label,
  lines,
}: {
  label: string;
  lines: string[];
}) {
  return (
    <div className="grid border-b border-slate-300 last:border-b-0 md:grid-cols-[170px_minmax(0,1fr)]">
      <div className="bg-slate-100 px-4 py-4 text-sm font-medium text-slate-700">
        {label}
      </div>
      <div className="space-y-2 px-4 py-4 text-sm leading-7 text-slate-800">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function EditablePaperContractRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid border-b border-slate-300 last:border-b-0 md:grid-cols-[170px_minmax(0,1fr)]">
      <div className="bg-rose-50 px-4 py-4 text-sm font-medium text-slate-700">{label}</div>
      <div className="px-4 py-4 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function ContractField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ContractInput({
  value,
  onChange,
  className = "",
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400 ${className}`.trim()}
    />
  );
}

function ContractTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-400"
    />
  );
}

export function buildHeadOfficeDocumentHtml({
  fields,
  periodLabel,
  isNoFixedTerm = fields.contractEndDate === "期間の定めなし",
}: {
  fields: HeadOfficeEditableFields;
  periodLabel: string;
  isNoFixedTerm?: boolean;
}) {
  const storeMaster = resolveStoreContractMaster(fields.selectedStoreName);
  const isCommissionedStore = isCommissionedStoreName(fields.selectedStoreName);
  const roleOptions = resolveRoleOptions(storeMaster.workLocationName, storeMaster.workLocationAddress);
  const role = findHeadOfficeRoleOption(roleOptions, fields.currentRoleCode, fields.currentRoleLabel);
  const cityCompensation = resolveCityCompensation(storeMaster.workLocationAddress);
  const urbanAllowanceLabel =
    cityCompensation.urbanAllowanceMonthly > 0
      ? `${cityCompensation.urbanAllowanceMonthly.toLocaleString("ja-JP")}円`
      : "なし";
  const minimumMonthlyWage =
    role.code === "employee_c"
      ? cityCompensation.employeeCMinimumMonthly
      : cityCompensation.washerMinimumMonthly;
  const contractPeriodRow = isNoFixedTerm
    ? ""
    : `<tr><th>契約期間</th><td><p>期間の定め有</p><p>${fields.contractStartDate || "-"} から ${fields.contractEndDate || "-"}</p><p>更新期間: 6ヶ月ごと。更新する場合があり得る。</p><p>※更新は、期間満了時の業務量、経営状況、労働者の勤務成績・態度により判断する。</p><p>更新上限の有無: （無）</p></td></tr>`;

  return `
    <h2>労働条件確認書</h2>
    <p>更新対象期間: ${periodLabel}</p>
    <p>使用者 ${isCommissionedStore ? storeMaster.employerName : DIRECT_MANAGED_MASTER.employerName} と労働者は、${fields.updateDate || "-"}、下記の条件のもと労働契約を締結した。</p>
    <table>
      <tbody>
        <tr><th>使用者</th><td><p>${isCommissionedStore ? storeMaster.employerName : DIRECT_MANAGED_MASTER.employerName}</p><p>${isCommissionedStore ? storeMaster.representativeTitle : DIRECT_MANAGED_MASTER.representativeTitle} ${isCommissionedStore ? storeMaster.representativeName : DIRECT_MANAGED_MASTER.representativeName}</p></td></tr>
        <tr><th>住所</th><td>${isCommissionedStore ? storeMaster.employerAddress : DIRECT_MANAGED_MASTER.employerAddress}</td></tr>
        ${contractPeriodRow}
        <tr><th>就業の場所</th><td><p>（雇い入れ直後） 店舗名：${storeMaster.workLocationName}</p><p>住所：${storeMaster.workLocationAddress}</p><p>（変更の範囲） 会社の定める場所</p></td></tr>
        <tr><th>従事すべき業務の内容</th><td><p>（雇い入れ直後） 他店舗の応援等</p><p>（変更の範囲） 会社の定める業務</p><p>現在の役職（ ${role.label} ）</p></td></tr>
        <tr><th>始業、終業の時刻、休憩時間等</th><td><p>1ヶ月変形労働制</p><p>始業時刻 ${fields.shiftStartTime || "-"} 〜 終業時刻 ${fields.shiftEndTime || "-"}　休憩時間 ${fields.breakMinutes || "-"}分間</p><p>ただし、他店舗応援時は、他店舗の労働時間とする。</p></td></tr>
        <tr><th>所定外労働</th><td><p>1. 所定時間外労働をさせることが有る</p><p>2. 休日労働をさせることが有る</p></td></tr>
        <tr><th>休日</th><td><p>1. 週休2日制（毎週月曜日から日曜日の間） ※シフトによる</p><p>2. その他会社が指定する日</p></td></tr>
        <tr><th>休暇</th><td><p>1. 年次有給休暇 6ヶ月継続勤務した場合→法令の通り</p><p>2. 育児休業 一定の要件を満たさなければ取得不可能</p><p>3. 介護休業 一定の要件を満たさなければ取得不可能</p><p>4. 子の看護休暇、介護休暇 1年に5日（ただし対象者が2名以上の時は10日）</p></td></tr>
        <tr><th>賃金</th><td><p>1. 基本賃金 役職による（下記参照）</p><p>2. 諸手当</p><p>職務手当 役職による（下記参照）</p><p>食べ歩き手当 月10,000円</p><p>書籍研修手当 月20,000円</p><p>都市手当 ${urbanAllowanceLabel}</p><p>旅手当 月10,000円</p><p>健康手当 月10,000円</p><p>物価応援手当 月20,000円</p><p>精勤手当 月10,000円</p><p>通勤手当 月10,000円</p><p>※最低賃金：月額 ${minimumMonthlyWage.toLocaleString("ja-JP")}円</p><p>3. 時間外、休日又は深夜労働に対して支払われる割増賃金率</p><p>イ 法定外労働（25）％ ※2023年4月〜月60時間超（50）％</p><p>ロ 法定休日労働（35）％</p><p>ハ 深夜労働（25）％</p><p>※固定残業代が職務手当に含まれている。含まれる時間は下記参照</p><p>4. 賃金締切日 毎月末日</p><p>5. 賃金支払日 翌月10日</p><p>6. 賃金支払方法 本人の指定する金融機関の預金口座（本人名義口座に限る）</p><p>7. 昇給 [ 有 ]</p><p>8. 賞与 [ 有 ]</p><p>9. 退職金 [ 無 ]</p></td></tr>
        <tr><th>退職に関する事項</th><td><p>1. 定年制 [ 60歳 ] 再雇用あり</p><p>2. 50歳の誕生日の月末にて、「役職定年」となる</p><p>3. 創業支援等措置 無</p><p>4. 自己都合退職の手続（退職する30日以上前に届け出ること）</p><p>5. 解雇の事由及び手続（詳細は社内規則による）</p></td></tr>
        <tr><th>その他</th><td><p>・社会保険等の加入状況 [ ${fields.socialInsuranceStatus} ]</p><p>・雇用保険の適用 [ ${fields.employmentInsuranceStatus} ]</p><p>・その他（業務の都合上他の部署への配置転換を命じることがある）</p><p>・雇用管理の改善に関する事項に関する相談窓口</p><p>${isCommissionedStore ? `担当組織（連絡先 ${storeMaster.phonePlaceholder}）` : "担当組織（連絡先 （有）草野企画本部 096-325-0601）"}</p><p>・以上のほかは、当社就業規則による</p><p>就業規則を確認できる場所や方法（就業場所に備付）</p></td></tr>
        <tr><th>労働者自署</th><td><p>日付: ${fields.signedDate || "-"}</p><p>住所: 〒 ${fields.addressZip || ""} ${fields.addressText || ""}</p><p>氏名: ${fields.signatureName || "-"}</p></td></tr>
      </tbody>
    </table>
    <h3>別紙1 役職ごとの基本給・職務手当</h3>
    <table>
      <thead>
        <tr><th>役職</th><th>基本給</th><th>職務手当</th></tr>
      </thead>
      <tbody>
        ${roleOptions.map((option) => `<tr><td>${option.label}</td><td>¥${option.basicSalaryMonthly.toLocaleString("ja-JP")}</td><td>¥${option.dutyAllowanceMonthly.toLocaleString("ja-JP")}</td></tr>`).join("")}
      </tbody>
    </table>
    <h3>別紙2 残業代について</h3>
    <table>
      <thead>
        <tr><th>役職</th><th>固定残業代内で、残業可能な時間</th><th>1ヶ月に労働可能な上限時間</th></tr>
      </thead>
      <tbody>
        ${roleOptions.map((option) => `<tr><td>${option.label}</td><td>${option.fixedOvertimeHours}時間</td><td>${option.monthlyWorkLimitHours}時間</td></tr>`).join("")}
      </tbody>
    </table>
    <p>◆1ヶ月の労働時間が、上限時間を超えた場合、割増単価となる</p>
    <p>◆実際には、1ヶ月の労働時間の合計が、休日出勤時間を除き、200時間を超えた場合、超えた時間に対し、時給1500円を支払する（2026年5月現在）</p>
    <p>（社員Cは、1ヶ月172時間を超えた場合）</p>
  `;
}

export function buildPartTimeDocumentHtml({
  fields,
  contract,
  storeName,
  periodLabel,
}: {
  fields: PartTimeEditableFields;
  contract: EmploymentContractPayload;
  storeName: string;
  periodLabel: string;
}) {
  const storeMaster = resolveStoreContractMaster(storeName);
  const startTime = `${fields.shiftStartHour || "--"}:${fields.shiftStartMinute || "--"}`;
  const endTime = `${fields.shiftEndHour || "--"}:${fields.shiftEndMinute || "--"}`;
  const isPermanentPartTimeContract =
    contract.renewalPatternText === "期間の定めなし";
  const employmentPeriodHtml = isPermanentPartTimeContract
    ? "<p>期間の定めなし</p>"
    : `<p>期間の定め: （有）</p><p>${fields.contractStartDate || "-"} 〜 ${fields.contractEndDate || "-"}</p>`;
  const renewalHtml = isPermanentPartTimeContract
    ? "<p>契約の更新の有無: （無）</p>"
    : "<p>契約の更新の有無: （有）</p><p>更新期間: 6ヶ月ごと。更新する場合があり得る。</p><p>※更新は、期間満了時の業務量、経営状況、労働者の勤務成績・態度により判断する。</p><p>更新上限の有無: （無）</p>";

  return `
    <h2>雇用契約書</h2>
    <p>以下の条件により雇用契約を締結する。</p>
    <p>更新対象期間: ${periodLabel}</p>
    <table>
      <tbody>
        <tr><th>氏名</th><td>${fields.employeeName || "-"}</td></tr>
        <tr><th>雇用期間</th><td>${employmentPeriodHtml}</td></tr>
        <tr><th>契約の更新</th><td>${renewalHtml}</td></tr>
        <tr><th>就業場所</th><td><p>（雇入れ直後）${storeMaster.workLocationName}</p><p>${storeMaster.workLocationAddress || "住所設定待ち"}</p><p>（変更の範囲）会社の定める場所</p></td></tr>
        <tr><th>業務の内容</th><td><p>（雇入れ直後）ホール、洗い場、ドリンカー、掃除</p><p>（変更の範囲）会社の定める業務</p></td></tr>
        <tr><th>就業日数</th><td>${fields.workDaysPerWeek ? `週 ${fields.workDaysPerWeek} 日` : "週 - 日"}</td></tr>
        <tr><th>就業時間</th><td><p>始業 ${startTime} 〜 終業 ${endTime}</p><p>※業務の都合により、就業時間を、繰上げまたは繰り下げることがある</p></td></tr>
        <tr><th>休憩時間</th><td><p>労働時間が6時間を超える場合、45分間</p><p>8時間を超える場合、60分間</p></td></tr>
        <tr><th>所定時間外労働</th><td>業務の都合により、発生することがある。</td></tr>
        <tr><th>休日</th><td>シフトによる（週1回は必ず休日を設ける）</td></tr>
        <tr><th>休暇</th><td>年次有給休暇 6ヶ月継続勤務した場合 法定のとおり</td></tr>
        <tr><th>賃金</th><td><p>時給 ${fields.hourlyWage || "-"} 円</p><p>通勤手当 400円/日 ※通勤した日数分支給する</p><p>時間外、休日又は深夜労働に対して支払われる割増賃金率</p><p>イ 法定外労働 25％ ※月60時間超 50％</p><p>ロ 法定休日労働 35％</p><p>ハ 深夜労働 25％</p><p>締切日 ${contract.payClosingDay} ・ 支払日 ${contract.payDate} ・ 支払方法 ${contract.wagePaymentMethod}</p><p>労使協定に基づく賃金支払い時の控除（無）</p><p>昇給（有 ※但し業績による）</p><p>賞与（無）</p><p>退職金（無）</p></td></tr>
        <tr><th>加入保険</th><td>法定の条件を満たせば、加入する</td></tr>
        <tr><th>退職に関する事項</th><td><p>1. 定年制：（有）（満60歳）継続雇用制度 65歳まで</p><p>2. 創業支援等措置 （無）</p><p>3. 自己都合退職（自己都合退職の場合、退職する30日前に届け出ること）</p><p>4. 解雇（解雇については、当社就業規則による）</p></td></tr>
        <tr><th>その他</th><td><p>1. 雇用管理の改善等に関する事項に係る相談窓口</p><p>部署及び連絡先 ${storeMaster.phonePlaceholder}</p><p>2. 以上の他は、当社就業規則による</p><p>就業規則を確認できる場所や方法（就業規則に備付）</p><p>3. 店舗敷地内は、禁煙です</p></td></tr>
        <tr><th>雇用者</th><td><p>${storeMaster.employerAddress}</p><p>${storeMaster.employerName}</p><p>${storeMaster.representativeTitle} ${storeMaster.representativeName}</p></td></tr>
        <tr><th>労働者自署</th><td><p>日付: ${fields.signedDate || "-"}</p><p>住所: 〒 ${fields.addressZip || ""} ${fields.addressText || ""}</p><p>氏名: ${fields.signatureName || "-"}</p></td></tr>
      </tbody>
    </table>
    <p>本書の交付は、労働基準法15条に基づく労働条件の明示及び短時間労働者及び有期雇用労働者の雇用管理の改善等に関する法律第6条に基づく文書の交付を兼ねるものであること。</p>
  `;
}

function appendEmploymentContractConfirmationHtml(bodyHtml: string) {
  const confirmationHtml = `
    <section>
      <h3>確認事項</h3>
      ${EMPLOYMENT_CONTRACT_CONFIRMATION_ITEMS.map(
        (item) => `<p>☑ ${item.label}</p>`,
      ).join("")}
    </section>
  `;

  return `${bodyHtml}${confirmationHtml}`;
}

function splitTime(value?: string) {
  if (!value) return ["", ""] as const;
  const [hour = "", minute = ""] = value.split(":");
  return [hour, minute] as const;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-slate-800">{value || "-"}</dd>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        readOnly
        value={value}
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </label>
  );
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}
