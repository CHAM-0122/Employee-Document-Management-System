import { ok } from "@/src/lib/api/responses";
import { requirePublicIntakeToken } from "@/src/lib/api/auth";
import {
  findPublicIntakeByToken,
  listActiveDocumentTemplates,
} from "@/src/lib/db/public-intakes";
import { apiError } from "@/src/lib/api/responses";
import {
  getMockDocuments,
  getMockPublicIntakeByToken,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

type PledgeTerm =
  | "fixed_term"
  | "permanent"
  | "employee_c"
  | "fixed_part_time"
  | "permanent_part_time"
  | "timee"
  | "retirement";

type PublicDocumentType =
  | "employment_contract"
  | "employee_pledge"
  | "sns_pledge"
  | "retirement_pledge";

function buildEmployeePledgeDocument(params: {
  templateId: string;
  version: string;
  pledgeTerm?: PledgeTerm;
}) {
  const isPermanent = params.pledgeTerm === "permanent";
  const isEmployeeC = params.pledgeTerm === "employee_c";
  const isFixedPartTime = params.pledgeTerm === "fixed_part_time";
  const isPermanentPartTime = params.pledgeTerm === "permanent_part_time";
  const isTimee = params.pledgeTerm === "timee";
  const title = isPermanentPartTime
    ? "従業員誓約書（無期アルバイト・パート用）"
    : isFixedPartTime
      ? "従業員誓約書（有期アルバイト・パート用）"
      : isTimee
      ? "従業員誓約書（タイミー用）"
      : isEmployeeC
      ? "従業員誓約書（社員C用）"
      : isPermanent
      ? "従業員誓約書（無期社員用）"
      : "従業員誓約書（有期社員用）";
  const employmentTermArticle = isPermanentPartTime
    ? "私は、期間の定めのないアルバイト・パートとして勤務することを理解し、就業規則、会社の指示および店舗ルールを遵守して勤務します。"
    : isFixedPartTime
      ? "私は、有期雇用契約のアルバイト・パートとして勤務すること、契約期間および更新の有無は労働条件通知書・雇用契約書に定める内容によることを理解します。"
      : isTimee
      ? "私は、タイミーを通じて勤務する場合であっても、勤務先店舗のルール、会社の指示、守秘義務および本誓約の各条項を遵守して勤務します。"
      : isEmployeeC
      ? "私は、社員Cとして勤務すること、労働時間・賃金・契約条件は労働条件通知書・雇用契約書に定める内容によることを理解します。"
      : isPermanent
      ? "私は、期間の定めのない雇用契約であることを理解し、就業規則、会社の指示および店舗ルールを遵守して勤務します。"
      : "私は、有期雇用契約であること、契約期間および更新の有無は労働条件通知書・雇用契約書に定める内容によることを理解します。";

  return {
    type: "employee_pledge" as const,
    templateId: params.templateId,
    version: params.version,
    title,
    bodyHtml: `
      <h2>${title}</h2>
      <p>私は、勤務にあたり以下の各条項を遵守することを誓約します。</p>
      <figure class="employee-pledge-explanation" style="margin: 24px 0; padding: 16px; border: 1px solid #dbe4f0; border-radius: 16px; background: #f8fafc;">
        <img src="/documents/employee-pledge-explanation.png" alt="従業員誓約書のポイント" style="display: block; width: 100%; max-width: 760px; height: auto; margin: 0 auto; border-radius: 12px; background: #ffffff;" />
        <figcaption style="margin-top: 10px; text-align: center; font-size: 13px; color: #64748b;">従業員誓約書のポイント</figcaption>
      </figure>
      <h3>第1条（機密保持）</h3>
      <p>業務上知り得た顧客情報、仕入先情報、営業上の秘密、ノウハウ、店舗運営に関する情報等を、在職中および退職後も第三者に漏えいしません。</p>
      <h3>第2条（誠実義務）</h3>
      <p>法令、就業規則、店舗ルールを遵守し、会社の一員として誠実に勤務します。会社や店舗の信用を損なう行為は行いません。</p>
      <h3>第3条（虚偽記載・申告内容の正確性）</h3>
      <p>採用時および在職中に提出・申告した内容について虚偽の記載や申告を行いません。変更があった場合は速やかに届け出ます。</p>
      <h3>第4条（店舗備品・制服等の取り扱い）</h3>
      <p>会社から貸与された制服、鍵、名札、マニュアル、端末、備品等は適切に管理し、退職時または指示があった際には速やかに返却します。</p>
      <h3>第5条（トラブル発生時の対応）</h3>
      <p>顧客対応、事故、クレーム、紛失、破損、SNS投稿等のトラブルが発生した場合は、自己判断で対応せず、速やかに上長へ報告します。</p>
      <h3>第6条（賠償責任）</h3>
      <p>故意または重大な過失により会社、店舗、顧客または第三者へ損害を与えた場合、会社の定める範囲で責任を負うことを理解します。</p>
      <h3>第7条（退職時のルール）</h3>
      <p>退職する場合は原則として30日前までに申し出ます。会社貸与物の返却や引継ぎを完了するまで誠実に対応します。</p>
      <h3>第8条（兼業・副業）</h3>
      <p>兼業・副業の有無や変更については会社へ申告し、業務に支障が出る行為や競業にあたる行為は行いません。</p>
      <h3>第9条（雇用区分の確認）</h3>
      <p>${employmentTermArticle}</p>
      <h3>第10条（違反時の処分）</h3>
      <p>本誓約に違反した場合、就業規則に基づく懲戒処分、損害賠償請求その他必要な措置を受けることに異議を申し立てません。</p>
      <h3>第11条（SNS誓約書との関係）</h3>
      <p>別紙のSNS誓約書も本誓約の一部を構成するものとし、これを遵守します。</p>
    `,
  };
}

function buildRetirementPledgeDocument(params: {
  templateId: string;
  version: string;
}) {
  return {
    type: "retirement_pledge" as const,
    templateId: params.templateId,
    version: params.version,
    title: "退職時誓約書 兼 守秘義務に関する誓約書",
    bodyHtml: `
      <h2>退職時誓約書 兼 守秘義務に関する誓約書</h2>
      <p>私は、会社を退職するに当たり、下記の事項について誓約致します。</p>
      <p style="text-align:center;">記</p>
      <h3>1. 業務情報・資料の破棄と不使用</h3>
      <p>私が会社在職中に業務遂行のために知りえた、メニュー、レシピ、調理製造方法については、紙やデータをすべて破棄・削除し、これらの複製も一切保有していません。退職後も、他に漏らしたり使用したりすることは一切致しません。</p>
      <h3>2. 内部情報・個人情報の守秘</h3>
      <p>会社在職中に知り得た会社の内部情報及び個人情報（顧客情報、お取引先の情報のみならず会社の役員及び従業員に関する個人情報を含む。）は、退職後であっても、他に漏らし又は使用することは一切いたしません。</p>
      <h3>3. 違反時の賠償</h3>
      <p>退職後に、当該誓約書の規定に違反して、会社の秘密等及び個人情報を漏洩もしくは使用することにより又は会社の営業と競業する行為をし、実際に会社に損害を与えた場合にはこれを賠償します。</p>
      <p>＊SNS、ソーシャルメディア（ツイッター、フェイスブック、インスタグラム、ライン、他等、今後発明される全てのインターネットを介した技術）による書き込み・情報公開・拡散の行為を含みます。</p>
      <h3>4. 会社貸与物の返還</h3>
      <p>会社から貸与された制服・備品・金券などは、すべて会社に返還します。返却しない場合は、最終給与より控除されても異議申し立ては致しません。</p>
      <h3>5. 有給休暇に関する確認</h3>
      <p>退職後も、有給休暇に関する権利が失効することに、異議はありません。退職前に有給休暇の一括取得や、退職時の残日数分の支給がないことを承知しています。</p>
      <h3>6. 退職後の異議申し立て</h3>
      <p>在職中における事故・事件・トラブルについては、退職後会社に対して異議申し立ては致しません。</p>
    `,
  };
}

function buildSnsPledgeDocument(params: {
  templateId: string;
  version: string;
}) {
  return {
    type: "sns_pledge" as const,
    templateId: params.templateId,
    version: params.version,
    title: "SNS誓約書",
    bodyHtml: `
      <h2>従業員誓約書 別紙: SNS等の利用に関する誓約</h2>
      <p>私は、在職中および退職後においても、以下の各条項を遵守します。</p>
      <figure class="sns-pledge-explanation" style="margin: 24px 0; padding: 16px; border: 1px solid #dbe4f0; border-radius: 16px; background: #f8fafc;">
        <img src="/documents/sns-pledge-explanation.png" alt="SNS誓約書のポイント" style="display: block; width: 100%; max-width: 760px; height: auto; margin: 0 auto; border-radius: 12px; background: #ffffff;" />
        <figcaption style="margin-top: 10px; text-align: center; font-size: 13px; color: #64748b;">SNS誓約書のポイント</figcaption>
      </figure>
      <h3>第1条（SNSの定義）</h3>
      <p>本誓約におけるSNSとは、X、Instagram、Facebook、TikTok、YouTube、LINE、口コミサイト、ブログ、動画配信サービスその他これらに類する情報発信手段をいいます。</p>
      <h3>第2条（守秘義務）</h3>
      <p>会社、店舗、顧客、取引先、従業員に関する非公開情報、写真、動画、売上情報、仕入情報、ノウハウ等をSNSへ投稿・拡散しません。</p>
      <h3>第3条（会社の名誉・信用保持）</h3>
      <p>会社、店舗、顧客、従業員、取引先の信用を毀損する内容、誹謗中傷、差別的表現、公序良俗に反する内容を投稿しません。</p>
      <h3>第4条（写真・動画の取り扱い）</h3>
      <p>店内、厨房、バックヤード、顧客、取引先、従業員が写り込む写真や動画を、会社の許可なく撮影・投稿しません。</p>
      <h3>第5条（就業時間中の電子機器利用）</h3>
      <p>就業時間中に私物スマートフォン、タブレット、録音機器等を業務外目的で使用しません。業務に必要な場合は会社の指示に従います。</p>
      <h3>第6条（問題発生時の責任と報告）</h3>
      <p>SNS投稿や電子機器利用に関する問題が発生した場合は、直ちに上長へ報告し、会社の指示に従います。必要に応じて削除、訂正、謝罪等の対応を行います。</p>
      <h3>第7条（有効期間）</h3>
      <p>本誓約の効力は在職中に限らず、退職後も継続するものとします。</p>
      <h3>第8条（出向・異動時の適用）</h3>
      <p>他店舗、グループ会社、出向先等へ勤務する場合でも、本誓約を同様に適用し、遵守します。</p>
    `,
  };
}

function buildEmploymentContractDocument(params: {
  templateId: string;
  version: string;
  category: "regular_employee" | "fixed_term_employee" | "part_time";
  contract: {
    contractStartDate?: string;
    contractEndDate?: string;
    renewalPatternText?: string;
    workLocationName?: string;
    dutyDescription?: string;
    currentRoleLabel?: string;
    shiftStartTime?: string;
    shiftEndTime?: string;
    breakMinutes?: number;
    holidayRuleText?: string;
    basicSalaryMonthly?: number;
    dutyAllowanceMonthly?: number;
    hourlyWage?: number;
    commutingAllowanceNote?: string;
    commutingAllowanceMonthly?: number;
    payClosingDay?: string;
    payDate?: string;
    wagePaymentMethod?: string;
  };
}) {
  const title =
    params.category === "regular_employee"
      ? "労働条件確認書（正社員）"
      : params.category === "part_time"
        ? "労働条件確認書（アルバイト・パート）"
        : "労働条件確認書（有期社員）";

  const workingHoursText = `${params.contract.shiftStartTime ?? "-"} 〜 ${
    params.contract.shiftEndTime ?? "-"
  }（休憩 ${params.contract.breakMinutes ?? 0}分）`;
  const commutingText =
    params.contract.commutingAllowanceNote ||
    (params.contract.commutingAllowanceMonthly !== undefined
      ? `上限 ${params.contract.commutingAllowanceMonthly.toLocaleString("ja-JP")}円`
      : "会社規程による");
  const payCycleText = `${params.contract.payClosingDay ?? "-"} 締め / ${
    params.contract.payDate ?? "-"
  } 支払`;
  const isPermanentPartTimeContract =
    params.category === "part_time" &&
    params.contract.renewalPatternText === "期間の定めなし";
  const partTimeEmploymentPeriodHtml = isPermanentPartTimeContract
    ? "<p>期間の定めなし</p>"
    : `
      <p>期間の定め: 有</p>
      <p>${params.contract.contractStartDate ?? "-"} 〜 ${params.contract.contractEndDate ?? "-"}</p>
    `;
  const partTimeRenewalHtml = isPermanentPartTimeContract
    ? "<p>契約の更新: 無</p>"
    : `
      <p>契約の更新: 有</p>
      <p>更新期間: ${params.contract.renewalPatternText ?? "-"}</p>
    `;

  const bodyHtml =
    params.category === "regular_employee"
      ? `
        <h2>労働条件確認書（正社員）</h2>
        <p>以下の内容で、期間の定めのない雇用契約を締結します。</p>
        <h3>契約内容</h3>
        <ul>
          <li>契約開始日: ${params.contract.contractStartDate ?? "-"}</li>
          <li>契約期間: 期間の定めなし</li>
          <li>就業場所: ${params.contract.workLocationName ?? "-"}</li>
          <li>従事する業務: ${params.contract.dutyDescription ?? "-"}</li>
          <li>役職: ${params.contract.currentRoleLabel ?? "-"}</li>
        </ul>
        <h3>所定の労働時間等</h3>
        <ul>
          <li>勤務時間: ${workingHoursText}</li>
          <li>休日: ${params.contract.holidayRuleText ?? "-"}</li>
        </ul>
        <h3>賃金</h3>
        <ul>
          <li>基本給: ${(params.contract.basicSalaryMonthly ?? 0).toLocaleString("ja-JP")}円</li>
          <li>職務手当: ${(params.contract.dutyAllowanceMonthly ?? 0).toLocaleString("ja-JP")}円</li>
          <li>通勤手当: ${commutingText}</li>
          <li>賃金支払: ${payCycleText}</li>
          <li>支払方法: ${params.contract.wagePaymentMethod ?? "-"}</li>
        </ul>
      `
      : params.category === "part_time"
        ? `
          <h2>雇用契約書（アルバイト・パート）</h2>
          <p>以下の条件により雇用契約を締結します。記載内容に相違がある場合は、署名前に本部または店舗責任者へ申し出てください。</p>
          <table>
            <tbody>
              <tr>
                <th>雇用期間</th>
                <td>
                  ${partTimeEmploymentPeriodHtml}
                </td>
              </tr>
              <tr>
                <th>契約の更新</th>
                <td>
                  ${partTimeRenewalHtml}
                </td>
              </tr>
              <tr>
                <th>就業場所</th>
                <td>${params.contract.workLocationName ?? "-"}</td>
              </tr>
              <tr>
                <th>業務の内容</th>
                <td>${params.contract.dutyDescription ?? "-"}</td>
              </tr>
              <tr>
                <th>就業日数</th>
                <td>週ごとのシフトによる</td>
              </tr>
              <tr>
                <th>就業時間</th>
                <td>${workingHoursText}</td>
              </tr>
              <tr>
                <th>休憩時間</th>
                <td>労働時間が6時間を超える場合45分、8時間を超える場合60分</td>
              </tr>
              <tr>
                <th>所定時間外労働</th>
                <td>業務の都合により、発生することがある。</td>
              </tr>
              <tr>
                <th>休日</th>
                <td>${params.contract.holidayRuleText ?? "-"}</td>
              </tr>
              <tr>
                <th>賃金</th>
                <td>
                  <p>時給: ${(params.contract.hourlyWage ?? 0).toLocaleString("ja-JP")}円</p>
                  <p>通勤手当: ${commutingText}</p>
                  <p>賃金支払: ${payCycleText}</p>
                  <p>支払方法: ${params.contract.wagePaymentMethod ?? "-"}</p>
                </td>
              </tr>
              <tr>
                <th>その他</th>
                <td>就業日数・始業終業時刻・休憩時間は、シフト表または会社の指定により定めるものとします。</td>
              </tr>
            </tbody>
          </table>
        `
        : `
          <h2>労働条件確認書（有期社員）</h2>
          <p>以下の内容で、契約期間の定めがある雇用契約を締結します。</p>
          <h3>契約内容</h3>
          <ul>
            <li>契約開始日: ${params.contract.contractStartDate ?? "-"}</li>
            <li>契約終了日: ${params.contract.contractEndDate ?? "-"}</li>
            <li>契約更新: ${params.contract.renewalPatternText ?? "-"}</li>
            <li>就業場所: ${params.contract.workLocationName ?? "-"}</li>
            <li>従事する業務: ${params.contract.dutyDescription ?? "-"}</li>
            <li>役職: ${params.contract.currentRoleLabel ?? "-"}</li>
          </ul>
          <h3>所定の労働時間等</h3>
          <ul>
            <li>勤務時間: ${workingHoursText}</li>
            <li>休日: ${params.contract.holidayRuleText ?? "-"}</li>
          </ul>
          <h3>賃金</h3>
          <ul>
            <li>基本給: ${(params.contract.basicSalaryMonthly ?? 0).toLocaleString("ja-JP")}円</li>
            <li>職務手当: ${(params.contract.dutyAllowanceMonthly ?? 0).toLocaleString("ja-JP")}円</li>
            <li>通勤手当: ${commutingText}</li>
            <li>賃金支払: ${payCycleText}</li>
            <li>支払方法: ${params.contract.wagePaymentMethod ?? "-"}</li>
          </ul>
        `;

  return {
    type: "employment_contract" as const,
    templateId: params.templateId,
    version: params.version,
    title,
    bodyHtml,
  };
}

function buildDocumentFromTemplate(
  template: {
    id: string;
    documentType: PublicDocumentType;
    version: string;
    title: string;
    bodyHtml: string;
  },
  contract: {
    employmentCategory: "regular_employee" | "fixed_term_employee" | "part_time";
    contract: {
      contractStartDate?: string;
      contractEndDate?: string;
      renewalPatternText?: string;
      workLocationName?: string;
      dutyDescription?: string;
      currentRoleLabel?: string;
      shiftStartTime?: string;
      shiftEndTime?: string;
      breakMinutes?: number;
      holidayRuleText?: string;
      basicSalaryMonthly?: number;
      dutyAllowanceMonthly?: number;
      hourlyWage?: number;
      commutingAllowanceNote?: string;
      commutingAllowanceMonthly?: number;
      payClosingDay?: string;
      payDate?: string;
      wagePaymentMethod?: string;
    };
    pledgeTerm?: PledgeTerm;
  },
) {
  if (template.documentType === "employment_contract") {
    return buildEmploymentContractDocument({
      templateId: template.id,
      version: template.version,
      category: contract.employmentCategory,
      contract: contract.contract,
    });
  }

  if (template.documentType === "employee_pledge") {
    return buildEmployeePledgeDocument({
      templateId: template.id,
      version: template.version,
      pledgeTerm: contract.pledgeTerm,
    });
  }

  if (template.documentType === "retirement_pledge") {
    return buildRetirementPledgeDocument({
      templateId: template.id,
      version: template.version,
    });
  }

  return buildSnsPledgeDocument({
    templateId: template.id,
    version: template.version,
  });
}

function filterTemplatesForPledgeTerm<T extends { documentType: PublicDocumentType }>(
  templates: T[],
  pledgeTerm?: PledgeTerm,
) {
  return templates.filter((template) =>
    pledgeTerm === "retirement"
      ? template.documentType === "retirement_pledge"
      : template.documentType !== "retirement_pledge",
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const auth = await requirePublicIntakeToken(token);

  if (!auth.ok) {
    return auth.response;
  }

  const pledgeTermParam = new URL(request.url).searchParams.get("pledgeTerm");
  const pledgeTerm =
    pledgeTermParam === "permanent" ||
    pledgeTermParam === "fixed_term" ||
    pledgeTermParam === "employee_c" ||
    pledgeTermParam === "fixed_part_time" ||
    pledgeTermParam === "permanent_part_time" ||
    pledgeTermParam === "timee" ||
    pledgeTermParam === "retirement"
      ? pledgeTermParam
      : undefined;

  if (shouldUseMockData()) {
    const mock = getMockPublicIntakeByToken(token);
    if (!mock) {
      return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
    }

    return ok({
      documents: filterTemplatesForPledgeTerm(getMockDocuments(), pledgeTerm)
        .map((template) =>
          buildDocumentFromTemplate(template, {
            employmentCategory: mock.employmentContract.employmentCategory,
            contract: mock.employmentContract,
            pledgeTerm,
          }),
        ),
    });
  }

  const intake = await findPublicIntakeByToken(token);
  if (!intake) {
    return apiError("NOT_FOUND", "対象の手続きが見つかりません", 404);
  }

  const templates = await listActiveDocumentTemplates();

  return ok({
    documents: filterTemplatesForPledgeTerm(templates, pledgeTerm)
      .map((template) =>
        buildDocumentFromTemplate(template, {
          employmentCategory:
            (intake.employmentContract?.employmentCategory as
              | "regular_employee"
              | "fixed_term_employee"
              | "part_time") ?? "fixed_term_employee",
          contract: {
            contractStartDate:
              intake.employmentContract?.contractStartDate
                ?.toISOString()
                .slice(0, 10) ?? "",
            contractEndDate:
              intake.employmentContract?.contractEndDate
                ?.toISOString()
                .slice(0, 10) ?? "",
            renewalPatternText:
              intake.employmentContract?.renewalPatternText ?? "",
            workLocationName:
              intake.employmentContract?.workLocationName ?? "",
            dutyDescription:
              intake.employmentContract?.dutyDescription ?? "",
            currentRoleLabel:
              intake.employmentContract?.currentRoleLabel ?? "",
            shiftStartTime:
              intake.employmentContract?.shiftStartTime
                ?.toISOString()
                .slice(11, 16) ?? "",
            shiftEndTime:
              intake.employmentContract?.shiftEndTime
                ?.toISOString()
                .slice(11, 16) ?? "",
            breakMinutes: intake.employmentContract?.breakMinutes ?? 0,
            holidayRuleText:
              intake.employmentContract?.holidayRuleText ?? "",
            basicSalaryMonthly:
              intake.employmentContract?.basicSalaryMonthly ?? 0,
            dutyAllowanceMonthly:
              intake.employmentContract?.dutyAllowanceMonthly ?? 0,
            hourlyWage: intake.employmentContract?.hourlyWage ?? undefined,
            commutingAllowanceNote:
              intake.employmentContract?.commutingAllowanceNote ?? undefined,
            commutingAllowanceMonthly:
              intake.employmentContract?.commutingAllowanceMonthly ?? undefined,
            payClosingDay: intake.employmentContract?.payClosingDay ?? "",
            payDate: intake.employmentContract?.payDate ?? "",
            wagePaymentMethod:
              intake.employmentContract?.wagePaymentMethod ?? "",
          },
          pledgeTerm,
        }),
      ),
  });
}
