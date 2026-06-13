type ReturnNotificationProvider = "resend" | "console" | "skipped";

export type ReturnNotificationResult = {
  attempted: boolean;
  delivered: boolean;
  provider: ReturnNotificationProvider;
  to?: string;
  subject?: string;
  error?: string;
};

type SendReturnNotificationEmailParams = {
  to?: string | null;
  recipientName?: string | null;
  documentLabel: string;
  reason: string;
  resubmissionUrl: string;
  storeName?: string | null;
};

export async function sendReturnNotificationEmail(
  params: SendReturnNotificationEmailParams,
): Promise<ReturnNotificationResult> {
  const to = params.to?.trim();
  if (!to) {
    return {
      attempted: false,
      delivered: false,
      provider: "skipped",
      error: "通知先メールアドレスが未設定です",
    };
  }

  const recipientName = params.recipientName?.trim() || "従業員";
  const subject = `【要対応】${params.documentLabel}の再提出をお願いします`;
  const bodyText = buildReturnNotificationText({
    ...params,
    recipientName,
    to,
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_EMAIL_FROM;

  if (resendApiKey && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          text: bodyText,
        }),
      });

      if (!response.ok) {
        return {
          attempted: true,
          delivered: false,
          provider: "resend",
          to,
          subject,
          error: `Resend送信エラー: ${response.status}`,
        };
      }

      return {
        attempted: true,
        delivered: true,
        provider: "resend",
        to,
        subject,
      };
    } catch (error) {
      return {
        attempted: true,
        delivered: false,
        provider: "resend",
        to,
        subject,
        error: error instanceof Error ? error.message : "メール送信に失敗しました",
      };
    }
  }

  console.info("[return-notification-email:preview]", {
    to,
    subject,
    body: bodyText,
  });

  return {
    attempted: true,
    delivered: false,
    provider: "console",
    to,
    subject,
  };
}

function buildReturnNotificationText(
  params: SendReturnNotificationEmailParams & { to: string; recipientName: string },
) {
  const storeLine = params.storeName ? `対象店舗: ${params.storeName}\n` : "";

  return [
    `${params.recipientName} 様`,
    "",
    `${params.documentLabel}が差し戻されました。`,
    "以下の内容を確認し、再提出をお願いします。",
    "",
    storeLine.trimEnd(),
    `差し戻し理由: ${params.reason}`,
    `再提出URL: ${params.resubmissionUrl}`,
    "",
    "このメールに心当たりがない場合は、店舗責任者または本部までご確認ください。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getReturnedDocumentLabel(documentType: string) {
  if (documentType === "employment_contract") {
    return "雇用契約書";
  }
  if (documentType === "employee_pledge") {
    return "誓約書";
  }
  if (documentType === "sns_pledge") {
    return "SNS誓約書";
  }
  if (documentType === "retirement_pledge") {
    return "退職時誓約書";
  }
  return "提出内容";
}

export function buildResubmissionUrl(params: {
  requestUrl: string;
  token: string;
  documentType?: string;
}) {
  const origin = new URL(params.requestUrl).origin;
  const path =
    params.documentType === "employment_contract"
      ? `/employment-contracts/${params.token}`
      : `/intakes/${params.token}`;

  return `${origin}${path}`;
}
