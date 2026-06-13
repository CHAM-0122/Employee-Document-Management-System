import {
  mockDocuments as initialMockDocuments,
  mockIntakes as initialMockIntakes,
  mockPendingSubmissions as initialMockPendingSubmissions,
} from "@/src/lib/mock/mock-data";
import fs from "node:fs";
import type {
  AttributesPayload,
  BankAccountPayload,
  EmploymentPayload,
  EmploymentContractPayload,
  MyNumberPayload,
  ProfilePayload,
} from "@/src/lib/intake-contracts/types";
import { mockJobPositions as initialMockJobPositions } from "@/src/lib/mock/mock-data";

type MockState = {
  documents: typeof initialMockDocuments;
  intakes: typeof initialMockIntakes;
  jobPositions: typeof initialMockJobPositions;
  pendingSubmissions: typeof initialMockPendingSubmissions;
};

const globalMockState = globalThis as typeof globalThis & {
  __employeeIntakeMockState?: MockState;
};

const mockState =
  globalMockState.__employeeIntakeMockState ??
  (globalMockState.__employeeIntakeMockState = {
    documents: initialMockDocuments,
    intakes: initialMockIntakes,
    jobPositions: initialMockJobPositions,
    pendingSubmissions: initialMockPendingSubmissions,
  });

const mockDocuments = mockState.documents;
const mockIntakes = mockState.intakes;
const mockJobPositions = mockState.jobPositions;
const mockPendingSubmissions = mockState.pendingSubmissions;
const mockStateFilePath =
  process.env.MOCK_STATE_FILE_PATH ?? "/tmp/employee-intake-contracts-mock-state.json";
const partTimeCommutingAllowanceNote = "400円/日 ※通勤した日数分支給する";

function getCurrentHalfYearStartDate(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() + 1 <= 6 ? `${year}-01-01` : `${year}-07-01`;
}

const mockStoresById: Record<string, { id: string; code: string; name: string }> = {
  "mock-store-hq": { id: "mock-store-hq", code: "hq", name: "本部" },
  "mock-store-ichinokura": { id: "mock-store-ichinokura", code: "ichinokura", name: "壱之倉庫" },
  "mock-store-yokobachi": { id: "mock-store-yokobachi", code: "yokobachi", name: "ヨコバチ" },
  "mock-store-kobozu": { id: "mock-store-kobozu", code: "kobozu", name: "おでん屋小坊主" },
  "mock-store-akagumi": { id: "mock-store-akagumi", code: "akagumi", name: "ラーメン赤組" },
  "mock-store-kamitori": { id: "mock-store-kamitori", code: "kamitori", name: "餃子屋弐ノ弐上通本店" },
  "mock-store-shimotori": { id: "mock-store-shimotori", code: "shimotori", name: "餃子屋弐ノ弐下通店" },
  "mock-store-central": { id: "mock-store-central", code: "central", name: "餃子屋弐ノ弐中央店" },
  "mock-store-imaizumi": { id: "mock-store-imaizumi", code: "imaizumi", name: "餃子屋弐ノ弐今泉店" },
  "mock-store-minamitenjin": { id: "mock-store-minamitenjin", code: "minamitenjin", name: "餃子屋弐ノ弐南天神店" },
  "mock-store-meijidori": { id: "mock-store-meijidori", code: "meijidori", name: "餃子屋弐ノ弐明治通り店" },
  "mock-store-kawabata": { id: "mock-store-kawabata", code: "kawabata", name: "餃子屋弐ノ弐川端店" },
  "mock-store-watanabedori": { id: "mock-store-watanabedori", code: "watanabedori", name: "餃子屋弐ノ弐渡辺通店" },
  "mock-store-yakuin": { id: "mock-store-yakuin", code: "yakuin", name: "餃子屋弐ノ弐薬院店" },
  "mock-store-daimyo": { id: "mock-store-daimyo", code: "daimyo", name: "餃子屋弐ノ弐大名店" },
  "mock-store-solaria": { id: "mock-store-solaria", code: "solaria", name: "餃子屋弐ノ弐ソラリアステージ店" },
  "mock-store-hakata-underground": { id: "mock-store-hakata-underground", code: "hakata-underground", name: "餃子屋弐ノ弐博多駅地下街店" },
  "mock-store-fukuromachi": { id: "mock-store-fukuromachi", code: "fukuromachi", name: "餃子屋弐ノ弐袋町店" },
  "mock-store-soemoncho": { id: "mock-store-soemoncho", code: "soemoncho", name: "餃子屋弐ノ弐宗右衛門町店" },
  "mock-store-naha": { id: "mock-store-naha", code: "naha", name: "餃子屋弐ノ弐那覇店" },
  "mock-store-makishi": { id: "mock-store-makishi", code: "makishi", name: "餃子屋弐ノ弐牧志店" },
  "mock-store-kumamoto-factory": { id: "mock-store-kumamoto-factory", code: "kumamoto-factory", name: "餃子屋弐ノ弐清水工場" },
  "mock-store-kumamoto-sales": { id: "mock-store-kumamoto-sales", code: "kumamoto-sales", name: "餃子屋弐ノ弐近見販売所" },
  "mock-store-fukuoka-factory": { id: "mock-store-fukuoka-factory", code: "fukuoka-factory", name: "餃子弐ノ弐福岡工場" },
  "mock-store-keigo": { id: "mock-store-keigo", code: "keigo", name: "餃子屋弐ノ弐警固店" },
  "mock-store-praliva": { id: "mock-store-praliva", code: "praliva", name: "餃子屋弐ノ弐プラリバ店" },
  "mock-store-paypaydome": { id: "mock-store-paypaydome", code: "paypaydome", name: "餃子屋弐ノ弐ペイペイドーム店" },
  "mock-store-shin-umeda": { id: "mock-store-shin-umeda", code: "shin-umeda", name: "餃子屋弐ノ弐新梅田食道街店" },
  "mock-store-osaka": { id: "mock-store-osaka", code: "osaka", name: "餃子屋弐ノ弐天満店" },
};

function resolveMockStoreById(storeId: string) {
  return mockStoresById[storeId] ?? {
    id: storeId,
    code: storeId.replace(/^mock-store-/, ""),
    name: "未設定店舗",
  };
}

function normalizeMockQrInviteStores() {
  for (const intake of mockIntakes) {
    const match = intake.inviteEmail.match(
      /^(?:pledge|employment_contract)\.(mock-store-[^@]+)@qr\.local$/,
    );
    if (!match) {
      continue;
    }

    const store = mockStoresById[match[1]];
    if (!store || intake.store.id === store.id) {
      continue;
    }

    intake.store = { ...store };
    intake.profile.storeName = store.name;
    intake.employmentContract.workLocationName = store.name;
  }
}

function normalizeMockEmploymentContractOnlySubmissions() {
  for (const intake of mockIntakes) {
    const signerName = intake.signature?.signerName?.trim();

    if (!intake.profile.fullName && signerName) {
      intake.profile.fullName = signerName;
    }

    const activeConsents = intake.consents.filter(
      (item) => item.adminState !== "invalidated",
    );
    const hasOnlyEmploymentContract =
      activeConsents.length > 0 &&
      activeConsents.every((item) => item.documentType === "employment_contract");

    if (
      hasOnlyEmploymentContract &&
      intake.signature?.signatureImageUrl &&
      intake.status === "in_progress"
    ) {
      intake.status = "submitted";
    }
  }
}

function normalizeMockEmploymentContractPayload(
  payload: EmploymentContractPayload,
): EmploymentContractPayload {
  if (payload.employmentCategory !== "part_time") {
    return payload;
  }

  return {
    ...payload,
    shiftStartTime: payload.shiftStartTime || "13:00",
    shiftEndTime:
      !payload.shiftEndTime || payload.shiftEndTime === "24:00"
        ? "17:00"
        : payload.shiftEndTime,
    commutingAllowanceMonthly: undefined,
    commutingAllowanceNote: partTimeCommutingAllowanceNote,
  };
}

function normalizeMockPartTimeEmploymentContracts() {
  for (const intake of mockIntakes) {
    intake.employmentContract = normalizeMockEmploymentContractPayload(
      intake.employmentContract,
    );
  }
}

function normalizeMockLinkedBankAccount(
  target: BankAccountPayload,
  source: BankAccountPayload,
): BankAccountPayload {
  return {
    ...target,
    bankName: target.bankName || source.bankName,
    branchName: target.branchName || source.branchName,
    branchCode: target.branchCode || source.branchCode,
    accountType: target.accountType || source.accountType,
    accountNumber: target.accountNumber || source.accountNumber,
    accountHolderKana: target.accountHolderKana || source.accountHolderKana,
    agreedUsage: target.agreedUsage || source.agreedUsage,
    confirmedOwnAccount: target.confirmedOwnAccount || source.confirmedOwnAccount,
  };
}

function normalizeMockLinkedMyNumber(
  target: MyNumberPayload,
  source: MyNumberPayload,
): MyNumberPayload {
  return {
    ...target,
    myNumber: target.myNumber || source.myNumber,
    confirmMyNumber: target.confirmMyNumber || source.confirmMyNumber,
    purposeOfUseVersion:
      target.purposeOfUseVersion || source.purposeOfUseVersion || "MN-001",
    agreedPurpose: target.agreedPurpose || source.agreedPurpose,
    confirmedAccuracy: target.confirmedAccuracy || source.confirmedAccuracy,
  };
}

function normalizeMockLinkedPledgeProfileDetails() {
  for (const intake of mockIntakes) {
    const hasEmploymentContract = intake.consents.some(
      (item) =>
        item.documentType === "employment_contract" &&
        item.adminState !== "invalidated",
    );

    if (!hasEmploymentContract) {
      continue;
    }

    const fullName = (intake.profile.fullName || intake.signature?.signerName || "").trim();

    if (!fullName) {
      continue;
    }

    const pledgeSource = mockIntakes.find((candidate) => {
      if (candidate.id === intake.id || candidate.store.id !== intake.store.id) {
        return false;
      }

      const candidateName = (
        candidate.profile.fullName ||
        candidate.signature?.signerName ||
        ""
      ).trim();
      const hasPledge = candidate.consents.some(
        (item) =>
          (item.documentType === "employee_pledge" ||
            item.documentType === "sns_pledge") &&
          item.adminState !== "invalidated",
      );

      return candidateName === fullName && hasPledge;
    });

    if (!pledgeSource) {
      continue;
    }

    intake.profile = {
      ...intake.profile,
      fullName: intake.profile.fullName || pledgeSource.profile.fullName,
      fullNameKana: intake.profile.fullNameKana || pledgeSource.profile.fullNameKana,
      gender: intake.profile.gender || pledgeSource.profile.gender,
      birthDate: intake.profile.birthDate || pledgeSource.profile.birthDate,
      email: intake.profile.email || pledgeSource.profile.email,
      phone: intake.profile.phone || pledgeSource.profile.phone,
      postalCode: intake.profile.postalCode || pledgeSource.profile.postalCode,
      currentAddress:
        intake.profile.currentAddress || pledgeSource.profile.currentAddress,
      residentSameAsCurrent:
        intake.profile.residentSameAsCurrent ??
        pledgeSource.profile.residentSameAsCurrent,
      residentAddress:
        intake.profile.residentAddress || pledgeSource.profile.residentAddress,
      photoDataUrl: intake.profile.photoDataUrl || pledgeSource.profile.photoDataUrl,
    };

    intake.employment = {
      ...intake.employment,
      commuteMethod:
        intake.employment.commuteMethod || pledgeSource.employment.commuteMethod,
      emergencyContactName:
        intake.employment.emergencyContactName ||
        pledgeSource.employment.emergencyContactName,
      emergencyContactKana:
        intake.employment.emergencyContactKana ||
        pledgeSource.employment.emergencyContactKana,
      emergencyContactRelation:
        intake.employment.emergencyContactRelation ||
        pledgeSource.employment.emergencyContactRelation,
      emergencyContactPhone:
        intake.employment.emergencyContactPhone ||
        pledgeSource.employment.emergencyContactPhone,
    };

    intake.attributes = {
      ...intake.attributes,
      hasSecondJob:
        intake.attributes.hasSecondJob || pledgeSource.attributes.hasSecondJob,
      secondJobType:
        intake.attributes.secondJobType || pledgeSource.attributes.secondJobType,
      secondJobNote:
        intake.attributes.secondJobNote || pledgeSource.attributes.secondJobNote,
      isStudent: intake.attributes.isStudent || pledgeSource.attributes.isStudent,
      schoolName: intake.attributes.schoolName || pledgeSource.attributes.schoolName,
      schoolType: intake.attributes.schoolType || pledgeSource.attributes.schoolType,
      schoolGrade: intake.attributes.schoolGrade || pledgeSource.attributes.schoolGrade,
      schoolSchedule:
        intake.attributes.schoolSchedule || pledgeSource.attributes.schoolSchedule,
      isMinor: intake.attributes.isMinor ?? pledgeSource.attributes.isMinor,
      guardianName:
        intake.attributes.guardianName || pledgeSource.attributes.guardianName,
      guardianRelation:
        intake.attributes.guardianRelation || pledgeSource.attributes.guardianRelation,
      guardianPhone:
        intake.attributes.guardianPhone || pledgeSource.attributes.guardianPhone,
      guardianWorkPermissionConfirmed:
        intake.attributes.guardianWorkPermissionConfirmed ??
        pledgeSource.attributes.guardianWorkPermissionConfirmed,
      isForeignNational:
        intake.attributes.isForeignNational ??
        pledgeSource.attributes.isForeignNational,
      residenceCardFrontDataUrl:
        intake.attributes.residenceCardFrontDataUrl ||
        pledgeSource.attributes.residenceCardFrontDataUrl,
      residenceCardBackDataUrl:
        intake.attributes.residenceCardBackDataUrl ||
        pledgeSource.attributes.residenceCardBackDataUrl,
    };

    intake.bankAccount = normalizeMockLinkedBankAccount(
      intake.bankAccount,
      pledgeSource.bankAccount,
    );
    intake.myNumber = normalizeMockLinkedMyNumber(
      intake.myNumber,
      pledgeSource.myNumber,
    );
  }
}

let mockStateHydrated = false;

function hydrateMockStateFromFile() {
  if (mockStateHydrated) {
    return;
  }

  mockStateHydrated = true;

  try {
    if (!fs.existsSync(mockStateFilePath)) {
      return;
    }

    const raw = fs.readFileSync(mockStateFilePath, "utf8");
    const persisted = JSON.parse(raw) as Partial<MockState>;

    if (Array.isArray(persisted.intakes)) {
      mockIntakes.splice(0, mockIntakes.length, ...persisted.intakes);
    }
    if (Array.isArray(persisted.documents)) {
      mockDocuments.splice(0, mockDocuments.length, ...persisted.documents);
    }
    if (Array.isArray(persisted.jobPositions)) {
      mockJobPositions.splice(0, mockJobPositions.length, ...persisted.jobPositions);
    }
    if (Array.isArray(persisted.pendingSubmissions)) {
      mockPendingSubmissions.splice(
        0,
        mockPendingSubmissions.length,
        ...persisted.pendingSubmissions,
      );
    }
    normalizeMockQrInviteStores();
    normalizeMockEmploymentContractOnlySubmissions();
    normalizeMockLinkedPledgeProfileDetails();
    normalizeMockPartTimeEmploymentContracts();
    ensureMockDocuments();
  } catch (error) {
    console.warn("Failed to hydrate mock state:", error);
  }
}

function ensureMockDocuments() {
  for (const document of initialMockDocuments) {
    if (!mockDocuments.some((item) => item.id === document.id)) {
      mockDocuments.push(document);
    }
  }
}

function persistMockStateToFile() {
  hydrateMockStateFromFile();

  try {
    fs.writeFileSync(
      mockStateFilePath,
      JSON.stringify(
        {
          documents: mockDocuments,
          intakes: mockIntakes,
          jobPositions: mockJobPositions,
          pendingSubmissions: mockPendingSubmissions,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.warn("Failed to persist mock state:", error);
  }
}

export function shouldUseMockData() {
  return !process.env.DATABASE_URL || process.env.USE_MOCK_DATA === "1";
}

export function getMockPublicIntakeByToken(token: string) {
  hydrateMockStateFromFile();
  normalizeMockQrInviteStores();
  normalizeMockEmploymentContractOnlySubmissions();
  normalizeMockLinkedPledgeProfileDetails();
  normalizeMockPartTimeEmploymentContracts();
  return mockIntakes.find((item) => item.intakeToken === token) ?? null;
}

export function getMockAdminIntakeById(id: string) {
  hydrateMockStateFromFile();
  normalizeMockQrInviteStores();
  normalizeMockEmploymentContractOnlySubmissions();
  normalizeMockLinkedPledgeProfileDetails();
  normalizeMockPartTimeEmploymentContracts();
  return mockIntakes.find((item) => item.id === id) ?? null;
}

export function canAccessMockAdminIntake(params: {
  id: string;
  adminStoreId?: string;
  restrictToStore: boolean;
}) {
  const intake = getMockAdminIntakeById(params.id);

  if (!intake) {
    return false;
  }

  if (!params.restrictToStore) {
    return true;
  }

  return Boolean(params.adminStoreId) && intake.store.id === params.adminStoreId;
}

export function getMockDocuments() {
  hydrateMockStateFromFile();
  ensureMockDocuments();
  return mockDocuments;
}

export function getMockJobPositions() {
  hydrateMockStateFromFile();
  return mockJobPositions;
}

export function getMockAdminIntakes() {
  hydrateMockStateFromFile();
  normalizeMockQrInviteStores();
  normalizeMockEmploymentContractOnlySubmissions();
  normalizeMockLinkedPledgeProfileDetails();
  normalizeMockPartTimeEmploymentContracts();
  return mockIntakes;
}

export function getMockPendingAdminSubmissions() {
  hydrateMockStateFromFile();
  return mockPendingSubmissions;
}

export function createMockInvite(params: {
  invitedName?: string;
  inviteEmail: string;
  storeId: string;
  expiresAt: string;
  flowKind: "onboarding" | "employment_contract";
  employmentTrack:
    | "part_time"
    | "permanent_part_time"
    | "head_office_employee"
    | "permanent_head_office_employee"
    | "commissioned_store_employee"
    | "permanent_commissioned_store_employee"
    | "employee_c";
  pledgeEmploymentTerm?:
    | "fixed_term"
    | "permanent"
    | "employee_c"
    | "fixed_part_time"
    | "permanent_part_time"
    | "timee"
    | "retirement";
}) {
  hydrateMockStateFromFile();

  const isQrInviteEmail = params.inviteEmail.endsWith("@qr.local");
  const baseStore =
    mockIntakes.find((item) => item.store.id === params.storeId)?.store ??
    resolveMockStoreById(params.storeId);
  const storeName = baseStore.name;
  const token = `mock-${Math.random().toString(36).slice(2, 10)}`;
  const id = `mock-intake-${Math.random().toString(36).slice(2, 10)}`;

  const isPermanentPartTime =
    params.employmentTrack === "permanent_part_time" ||
    params.pledgeEmploymentTerm === "permanent_part_time";
  const isPermanentEmployee =
    params.employmentTrack === "permanent_head_office_employee" ||
    params.employmentTrack === "permanent_commissioned_store_employee" ||
    params.pledgeEmploymentTerm === "permanent";
  const isPartTime =
    params.employmentTrack === "part_time" ||
    params.pledgeEmploymentTerm === "fixed_part_time" ||
    params.pledgeEmploymentTerm === "timee" ||
    isPermanentPartTime;
  const isCommissioned =
    params.employmentTrack === "commissioned_store_employee" ||
    params.employmentTrack === "permanent_commissioned_store_employee";
  const isEmployeeC =
    params.employmentTrack === "employee_c" ||
    params.pledgeEmploymentTerm === "employee_c";

  const employmentCategory = isPartTime
    ? "part_time"
    : params.pledgeEmploymentTerm === "fixed_term"
      ? "fixed_term_employee"
      : "regular_employee";
  const roleCode = isEmployeeC ? "employee_c" : isPartTime ? "1" : "9";
  const roleLabel = isEmployeeC ? "社員C" : isPartTime ? "ウォッシャー" : "リーダー";
  const basicSalaryMonthly = isEmployeeC || isPartTime ? 120000 : 160000;
  const dutyAllowanceMonthly = isEmployeeC ? 50000 : isPartTime ? 110000 : 150000;
  const shiftStartTime = isEmployeeC ? "09:00" : isPartTime ? "13:00" : "09:00";
  const shiftEndTime = isEmployeeC ? "17:00" : isPartTime ? "24:00" : "18:00";
  const breakMinutes = isEmployeeC ? 60 : isPartTime ? 75 : 60;
  const socialInsuranceNote = isPartTime ? "法定の条件を満たせば、加入する" : isCommissioned ? "無" : "有";
  const employmentInsuranceNote = isPartTime ? "法定の条件を満たせば、加入する" : isCommissioned ? "無" : "有";
  const inviteStatus = params.flowKind === "employment_contract" ? "reviewed" : "sent";

  mockIntakes.unshift({
    id,
    intakeToken: token,
    status: inviteStatus,
    inviteEmail: params.inviteEmail,
    inviteExpiresAt: params.expiresAt,
    store: {
      id: baseStore.id,
      code: baseStore.code,
      name: baseStore.name,
    },
    profile: {
      pledgeDate: "",
      storeName,
      fullName: params.invitedName || "",
      fullNameKana: "",
      gender: "no_answer",
      birthDate: "",
      email: isQrInviteEmail ? "" : params.inviteEmail,
      phone: "",
      postalCode: "",
      currentAddress: "",
      residentSameAsCurrent: true,
      residentAddress: "",
    },
    employment: {
      emergencyContactName: "",
      emergencyContactKana: "",
      emergencyContactRelation: "",
      emergencyContactPhone: "",
      commuteMethod: "walk",
      commuteDistanceKm: undefined,
      referralSource: undefined,
      referralPerson: "",
      referralStoreName: "",
      workDaysPerWeek: undefined,
      workHoursPerWeek: undefined,
      shiftStartTime: "",
      shiftEndTime: "",
    },
    employmentContract: {
      employmentCategory,
      contractStartDate:
        isPermanentPartTime || isPermanentEmployee
          ? getCurrentHalfYearStartDate()
          : "",
      contractEndDate: isPermanentPartTime || isPermanentEmployee ? "期間の定めなし" : "",
      renewalPatternText: isPermanentPartTime || isPermanentEmployee
        ? "期間の定めなし"
        : "以後、半年ごとの契約更新",
      workLocationName: storeName,
      workLocationAddress: "",
      dutyDescription: isPartTime ? "調理、ホール業務" : "他店舗の応援等",
      jobPositionCode: roleCode,
      currentRoleLabel: roleLabel,
      shiftStartTime,
      shiftEndTime,
      breakMinutes,
      overtimeAllowed: true,
      holidayWorkAllowed: true,
      holidayRuleText: isPartTime ? "週休2日制（シフト制）" : "週休2日制（シフト制）",
      basicSalaryMonthly,
      dutyAllowanceMonthly,
      hourlyWage: isPartTime ? 1100 : undefined,
      fixedOvertimeHoursNote: "固定残業時間は別紙確認中",
      commutingAllowanceMonthly: 10000,
      commutingAllowanceNote: "上限10,000円",
      payClosingDay: "毎月末日",
      payDate: "翌月10日",
      wagePaymentMethod: "本人指定口座へ振込",
      hasRaise: true,
      hasBonus: !isPartTime,
      hasRetirementPay: false,
      retirementRuleText: "自己都合退職は30日以上前に届け出",
      socialInsuranceNote,
      employmentInsuranceNote,
      transferPossibilityNote: "業務都合により他部署への配置転換あり",
    },
    attributes: {
      hasSecondJob: "no",
      secondJobType: "",
      secondJobNote: "",
      isStudent: false,
      schoolType: undefined,
      schoolGrade: "",
      schoolSchedule: undefined,
      schoolName: "",
      isMinor: false,
      guardianName: "",
      guardianRelation: "",
      guardianPhone: "",
      guardianWorkPermissionConfirmed: false,
      isForeignNational: false,
      residenceCardFrontDataUrl: "",
      residenceCardBackDataUrl: "",
    },
    bankAccount: {
      bankName: "",
      branchName: "",
      branchCode: "",
      accountType: "ordinary",
      accountNumber: "",
      accountHolderKana: "",
      bankBookImageDataUrl: "",
      agreedUsage: false,
      confirmedOwnAccount: false,
    },
    myNumber: {
      myNumber: "",
      confirmMyNumber: "",
      purposeOfUseVersion: "MN-001",
      agreedPurpose: false,
      confirmedAccuracy: false,
    },
    consents: [],
    generatedDocuments: [],
    renewalHistory: [],
  });

  persistMockStateToFile();

  return {
    id,
    intakeToken: token,
    flowPath:
      params.flowKind === "employment_contract"
        ? `/employment-contracts/${token}`
        : `/intakes/${token}`,
  };
}

export function saveMockBankAccount(
  token: string,
  payload: BankAccountPayload,
) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.bankAccount = payload;
  intake.status = "in_progress";
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function saveMockProfile(token: string, payload: ProfilePayload) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.profile = {
    ...intake.profile,
    ...payload,
    photoDataUrl: payload.photoDataUrl || undefined,
  };
  intake.status = "in_progress";
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function saveMockEmployment(token: string, payload: EmploymentPayload) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.employment = {
    ...intake.employment,
    ...payload,
  };
  intake.status = "in_progress";
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function saveMockMyNumber(
  token: string,
  payload: MyNumberPayload,
) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.myNumber = payload;
  intake.status = "in_progress";
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function saveMockEmployeePledgeConsent(params: {
  token: string;
  version: string;
  ipAddress: string;
  userAgent: string;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === params.token);

  if (!intake) {
    return null;
  }

  const existing = intake.consents.find(
    (item) => item.documentType === "employee_pledge",
  );
  const consentedAt = new Date().toISOString();

  if (existing) {
    const wasReturned =
      existing.adminState === "returned" || existing.adminState === "invalidated";
    existing.version = params.version;
    existing.consentedAt = consentedAt;
    existing.ipAddress = params.ipAddress;
    existing.userAgent = params.userAgent;
    existing.adminState = "active";
    existing.adminStateReason = undefined;
    existing.adminStateChangedAt = undefined;
    existing.lastResubmittedAt = wasReturned ? consentedAt : existing.lastResubmittedAt;
  } else {
    intake.consents.push({
      documentType: "employee_pledge",
      version: params.version,
      consentedAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      adminState: "active",
    });
  }

  intake.status = "in_progress";
  persistMockStateToFile();

  return { consentedAt, status: intake.status };
}

export function saveMockSnsPledgeConsent(params: {
  token: string;
  version: string;
  ipAddress: string;
  userAgent: string;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === params.token);

  if (!intake) {
    return null;
  }

  const existing = intake.consents.find(
    (item) => item.documentType === "sns_pledge",
  );
  const consentedAt = new Date().toISOString();

  if (existing) {
    const wasReturned =
      existing.adminState === "returned" || existing.adminState === "invalidated";
    existing.version = params.version;
    existing.consentedAt = consentedAt;
    existing.ipAddress = params.ipAddress;
    existing.userAgent = params.userAgent;
    existing.adminState = "active";
    existing.adminStateReason = undefined;
    existing.adminStateChangedAt = undefined;
    existing.lastResubmittedAt = wasReturned ? consentedAt : existing.lastResubmittedAt;
  } else {
    intake.consents.push({
      documentType: "sns_pledge",
      version: params.version,
      consentedAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      adminState: "active",
    });
  }

  intake.status = "in_progress";
  persistMockStateToFile();

  return { consentedAt, status: intake.status };
}

export function saveMockRetirementPledgeConsent(params: {
  token: string;
  version: string;
  ipAddress: string;
  userAgent: string;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === params.token);

  if (!intake) {
    return null;
  }

  const existing = intake.consents.find(
    (item) => item.documentType === "retirement_pledge",
  );
  const consentedAt = new Date().toISOString();

  if (existing) {
    const wasReturned =
      existing.adminState === "returned" || existing.adminState === "invalidated";
    existing.version = params.version;
    existing.consentedAt = consentedAt;
    existing.ipAddress = params.ipAddress;
    existing.userAgent = params.userAgent;
    existing.adminState = "active";
    existing.adminStateReason = undefined;
    existing.adminStateChangedAt = undefined;
    existing.lastResubmittedAt = wasReturned ? consentedAt : existing.lastResubmittedAt;
  } else {
    intake.consents.push({
      documentType: "retirement_pledge",
      version: params.version,
      consentedAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      adminState: "active",
    });
  }

  intake.status = "in_progress";
  persistMockStateToFile();

  return { consentedAt, status: intake.status };
}

export function saveMockEmploymentContractConsent(params: {
  token: string;
  version: string;
  ipAddress: string;
  userAgent: string;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === params.token);

  if (!intake) {
    return null;
  }

  const existing = intake.consents.find(
    (item) => item.documentType === "employment_contract",
  );
  const consentedAt = new Date().toISOString();

  if (existing) {
    const wasReturned =
      existing.adminState === "returned" || existing.adminState === "invalidated";
    existing.version = params.version;
    existing.consentedAt = consentedAt;
    existing.ipAddress = params.ipAddress;
    existing.userAgent = params.userAgent;
    existing.adminState = "active";
    existing.adminStateReason = undefined;
    existing.adminStateChangedAt = undefined;
    existing.lastResubmittedAt = wasReturned ? consentedAt : existing.lastResubmittedAt;
  } else {
    intake.consents.push({
      documentType: "employment_contract",
      version: params.version,
      consentedAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      adminState: "active",
    });
  }

  intake.status = "submitted";
  persistMockStateToFile();

  return { consentedAt, status: intake.status };
}

export function saveMockSignature(params: {
  token: string;
  signerName: string;
  signedDate: string;
  signatureImageUrl: string;
  ipAddress: string;
  userAgent: string;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === params.token);

  if (!intake) {
    return null;
  }

  const signedAt = new Date().toISOString();
  intake.signature = {
    signerName: params.signerName,
    signedDate: params.signedDate,
    signedAt,
    signatureImageUrl: params.signatureImageUrl,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
  if (!intake.profile.fullName && params.signerName.trim()) {
    intake.profile.fullName = params.signerName.trim();
  }
  if (intake.status !== "submitted" && intake.status !== "reviewed") {
    intake.status = "in_progress";
  }
  persistMockStateToFile();

  return { signedAt, status: intake.status };
}

export function submitMockIntake(token: string) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.status = "submitted";
  persistMockStateToFile();

  return {
    status: intake.status,
    submittedAt: new Date().toISOString(),
  };
}

export function saveMockAttributes(token: string, payload: AttributesPayload) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.attributes = {
    ...intake.attributes,
    ...payload,
  };
  intake.status = "in_progress";
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function saveMockEmploymentContract(
  token: string,
  payload: EmploymentContractPayload,
) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.intakeToken === token);

  if (!intake) {
    return null;
  }

  intake.employmentContract = normalizeMockEmploymentContractPayload(payload);
  intake.status = "in_progress";
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function saveMockAdminEmploymentContractById(
  id: string,
  payload: EmploymentContractPayload,
  options?: {
    adminStoreId?: string;
    restrictToStore?: boolean;
  },
) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.id === id);

  if (!intake) {
    return null;
  }

  if (
    options?.restrictToStore &&
    (!options.adminStoreId || intake.store.id !== options.adminStoreId)
  ) {
    return null;
  }

  intake.employmentContract = normalizeMockEmploymentContractPayload(payload);
  persistMockStateToFile();

  return {
    status: intake.status,
    savedAt: new Date().toISOString(),
  };
}

export function updateMockConsentAdminState(params: {
  id: string;
  documentType:
    | "employment_contract"
    | "employee_pledge"
    | "sns_pledge"
    | "retirement_pledge";
  nextState: "returned" | "invalidated";
  reason: string;
  adminStoreId?: string;
  restrictToStore?: boolean;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.id === params.id);

  if (!intake) {
    return null;
  }

  if (
    params.restrictToStore &&
    (!params.adminStoreId || intake.store.id !== params.adminStoreId)
  ) {
    return null;
  }

  const consent = intake.consents.find(
    (item) => item.documentType === params.documentType,
  );

  if (!consent) {
    return null;
  }

  const changedAt = new Date().toISOString();
  consent.adminState = params.nextState;
  consent.adminStateReason = params.reason;
  consent.adminStateChangedAt = changedAt;
  consent.lastAdminState = params.nextState;

  if (params.nextState === "returned") {
    intake.status = "returned";
  }
  persistMockStateToFile();

  return {
    id: intake.id,
    documentType: consent.documentType,
    adminState: consent.adminState,
    adminStateReason: consent.adminStateReason,
    adminStateChangedAt: consent.adminStateChangedAt,
    intakeStatus: intake.status,
    intakeToken: intake.intakeToken,
    recipientEmail: intake.profile.email || intake.inviteEmail,
    recipientName: intake.profile.fullName || "従業員",
    storeName: intake.store.name,
  };
}

export function markMockIntakeReturned(
  id: string,
  options?: {
    adminStoreId?: string;
    restrictToStore?: boolean;
  },
) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.id === id);

  if (!intake) {
    return null;
  }

  if (
    options?.restrictToStore &&
    (!options.adminStoreId || intake.store.id !== options.adminStoreId)
  ) {
    return null;
  }

  intake.status = "returned";
  persistMockStateToFile();

  return {
    id: intake.id,
    status: intake.status,
    intakeToken: intake.intakeToken,
    recipientEmail: intake.profile.email || intake.inviteEmail,
    recipientName: intake.profile.fullName || "従業員",
    storeName: intake.store.name,
  };
}

export function markMockIntakeReviewed(
  id: string,
  options?: {
    adminStoreId?: string;
    restrictToStore?: boolean;
  },
) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.id === id);

  if (!intake) {
    return null;
  }

  if (
    options?.restrictToStore &&
    (!options.adminStoreId || intake.store.id !== options.adminStoreId)
  ) {
    return null;
  }

  intake.status = "reviewed";
  persistMockStateToFile();

  return {
    id: intake.id,
    status: intake.status,
    reviewedAt: new Date().toISOString(),
  };
}

function getCurrentRenewalPeriod(now = new Date()) {
  const periodYear = now.getFullYear();
  const periodHalf = now.getMonth() + 1 <= 6 ? 1 : 2;
  const periodLabel =
    periodHalf === 1
      ? `${periodYear}年1月〜6月`
      : `${periodYear}年7月〜12月`;

  return { periodYear, periodHalf, periodLabel };
}

export function issueMockEmploymentContractRenewal(params: {
  id: string;
  baseUrl: string;
}) {
  hydrateMockStateFromFile();

  const intake = mockIntakes.find((item) => item.id === params.id);

  if (!intake) {
    return null;
  }

  const period = getCurrentRenewalPeriod();
  const renewalUrl = `${params.baseUrl}/employment-contracts/${intake.intakeToken}?periodYear=${period.periodYear}&periodHalf=${period.periodHalf}`;
  const existing = intake.renewalHistory.find(
    (item) =>
      item.periodYear === period.periodYear && item.periodHalf === period.periodHalf,
  );

  if (existing) {
    existing.status = "sent";
    existing.issuedAt = new Date().toISOString();
    existing.renewalUrl = renewalUrl;
    persistMockStateToFile();

    return {
      ...existing,
      renewalUrl,
    };
  }

  const created = {
    id: `renewal-${Math.random().toString(36).slice(2, 10)}`,
    periodYear: period.periodYear,
    periodHalf: period.periodHalf as 1 | 2,
    periodLabel: period.periodLabel,
    status: "sent" as const,
    issuedAt: new Date().toISOString(),
    renewalUrl,
  };

  intake.renewalHistory.unshift(created);
  persistMockStateToFile();

  return created;
}
