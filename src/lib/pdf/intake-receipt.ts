import { readFile } from "node:fs/promises";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";

type DocumentState = {
  documentType: string;
  version?: string;
  consentedAt?: string;
  adminState?: "active" | "returned" | "invalidated";
  adminStateReason?: string;
  workflowState?: "active" | "returned" | "invalidated" | "resubmitted";
  resubmittedAt?: string;
};

type ReceiptPayload = {
  title: string;
  employeeName: string;
  storeName: string;
  status: string;
  submittedAt?: string;
  pledgeDate?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  currentAddress?: string;
  photoDataUrl?: string;
  emergencyContact?: string;
  bankSummary?: string;
  myNumberSummary?: string;
  companyName: string;
  documents: DocumentState[];
  signature?: {
    signerName: string;
    signedDate: string;
    signedAt?: string;
    signatureImageUrl?: string;
  };
};

const FONT_CANDIDATES = [
  "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
  "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
  "/Library/Fonts/Arial Unicode.ttf",
  "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
  "/System/Library/Fonts/Hiragino Sans GB.ttc",
];

export async function buildIntakeReceiptPdf(payload: ReceiptPayload) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fontBytes = await loadFontBytes();
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const signatureGraphic = payload.signature?.signatureImageUrl
    ? await loadSignatureGraphic(pdf, payload.signature.signatureImageUrl)
    : null;
  const photoGraphic = payload.photoDataUrl
    ? await loadSignatureGraphic(pdf, payload.photoDataUrl)
    : null;

  let page = pdf.addPage([595.28, 841.89]);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 40;
  const marginY = 42;
  const contentWidth = pageWidth - marginX * 2;
  const lineGap = 4;
  let cursorY = pageHeight - marginY;

  const palette = {
    text: rgb(0.14, 0.18, 0.24),
    muted: rgb(0.42, 0.47, 0.55),
    heading: rgb(0.08, 0.12, 0.18),
    border: rgb(0.82, 0.85, 0.89),
    surface: rgb(0.97, 0.98, 0.99),
    surfaceStrong: rgb(0.93, 0.95, 0.98),
    accent: rgb(0.16, 0.39, 0.74),
  };

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < marginY) {
      page = pdf.addPage([595.28, 841.89]);
      cursorY = pageHeight - marginY;
    }
  };

  const drawWrappedText = (text: string, x: number, y: number, width: number, size = 11) => {
    const lines = wrapText(text, font, size, width);
    let currentY = y;
    for (const line of lines) {
      page.drawText(line, {
        x,
        y: currentY,
        size,
        font,
        color: palette.text,
      });
      currentY -= size + lineGap;
    }
    return currentY;
  };

  const measureWrappedHeight = (text: string, width: number, size = 11) => {
    const lines = wrapText(text, font, size, width);
    return lines.length * size + Math.max(0, lines.length - 1) * lineGap;
  };

  const drawField = (
    label: string,
    value: string | undefined,
    x: number,
    y: number,
    width: number,
    options?: { valueSize?: number },
  ) => {
    const valueText = value && value.trim().length > 0 ? value : "未登録";
    const valueSize = options?.valueSize ?? 11;
    page.drawText(label, {
      x,
      y,
      size: 9,
      font,
      color: palette.muted,
    });
    const nextY = drawWrappedText(valueText, x, y - 16, width, valueSize);
    return nextY;
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(28);
    page.drawText(title, {
      x: marginX,
      y: cursorY,
      size: 13,
      font,
      color: palette.heading,
    });
    cursorY -= 18;
  };

  const drawBox = (height: number, fill = palette.surface) => {
    ensureSpace(height + 8);
    const topY = cursorY;
    page.drawRectangle({
      x: marginX,
      y: topY - height,
      width: contentWidth,
      height,
      borderColor: palette.border,
      borderWidth: 1,
      color: fill,
    });
    cursorY -= height + 12;
    return topY;
  };

  const drawDocumentCard = (document: DocumentState) => {
    const lines = [
      document.version ? `版: ${document.version}` : undefined,
      document.consentedAt ? `同意日時: ${formatDateTime(document.consentedAt)}` : undefined,
      `状態: ${formatWorkflowState(document.workflowState ?? document.adminState ?? "active")}`,
      document.adminStateReason ? `理由: ${document.adminStateReason}` : undefined,
      document.resubmittedAt ? `再提出日時: ${formatDateTime(document.resubmittedAt)}` : undefined,
    ].filter(Boolean) as string[];

    const bodyHeight =
      lines.reduce((sum, line) => sum + measureWrappedHeight(line, contentWidth - 36, 10), 0) +
      Math.max(0, lines.length - 1) * 6;
    const cardHeight = 38 + bodyHeight + 18;

    ensureSpace(cardHeight + 8);
    const topY = cursorY;
    page.drawRectangle({
      x: marginX,
      y: topY - cardHeight,
      width: contentWidth,
      height: cardHeight,
      borderColor: palette.border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page.drawRectangle({
      x: marginX,
      y: topY - 32,
      width: contentWidth,
      height: 32,
      color: palette.surfaceStrong,
    });
    page.drawText(getDocumentLabel(document.documentType), {
      x: marginX + 16,
      y: topY - 20,
      size: 11,
      font,
      color: palette.heading,
    });

    let innerY = topY - 48;
    for (const line of lines) {
      innerY = drawWrappedText(line, marginX + 16, innerY, contentWidth - 32, 10) - 6;
    }

    cursorY -= cardHeight + 10;
  };

  page.drawRectangle({
    x: marginX,
    y: cursorY - 72,
    width: contentWidth,
    height: 72,
    color: palette.surfaceStrong,
    borderColor: palette.border,
    borderWidth: 1,
  });
  page.drawText(payload.companyName, {
    x: marginX + 18,
    y: cursorY - 24,
    size: 11,
    font,
    color: palette.muted,
  });
  page.drawText(payload.title, {
    x: marginX + 18,
    y: cursorY - 48,
    size: 19,
    font,
    color: palette.heading,
  });
  page.drawText(`状態: ${formatStatus(payload.status)}`, {
    x: marginX + contentWidth - 110,
    y: cursorY - 48,
    size: 10,
    font,
    color: palette.accent,
  });
  cursorY -= 92;

  drawSectionHeading("基本情報");
  const basicBoxTop = drawBox(174);
  const leftX = marginX + 16;
  const rightX = marginX + contentWidth / 2 + 8;
  const columnWidth = contentWidth / 2 - 28;
  drawField("氏名", payload.employeeName, leftX, basicBoxTop - 18, columnWidth);
  drawField("店舗", payload.storeName, rightX, basicBoxTop - 18, columnWidth);
  drawField("記入日", payload.pledgeDate, leftX, basicBoxTop - 64, columnWidth);
  drawField("提出日時", payload.submittedAt ? formatDateTime(payload.submittedAt) : undefined, rightX, basicBoxTop - 64, columnWidth);
  drawField("生年月日", payload.birthDate, leftX, basicBoxTop - 110, columnWidth);
  drawField("電話番号", payload.phone, rightX, basicBoxTop - 110, columnWidth);
  drawField("メールアドレス", payload.email, leftX, basicBoxTop - 156, columnWidth);

  const addressHeight = 78 + measureWrappedHeight(payload.currentAddress ?? "未登録", contentWidth - 32, 11);
  drawSectionHeading("連絡先");
  const contactTop = drawBox(addressHeight);
  drawField("緊急連絡先", payload.emergencyContact, marginX + 16, contactTop - 18, contentWidth - 32);
  drawField("住所", payload.currentAddress, marginX + 16, contactTop - 64, contentWidth - 32);

  drawSectionHeading("本人写真");
  const photoTop = drawBox(photoGraphic ? 154 : 74);
  if (photoGraphic) {
    drawSignatureGraphic({
      page,
      graphic: photoGraphic,
      x: marginX + 16,
      y: photoTop - 18,
      width: 112,
      height: 112,
      borderColor: palette.border,
      fillColor: rgb(1, 1, 1),
    });
    drawField(
      "注意事項",
      "本人一人で写っている写真でお願いします。",
      marginX + 148,
      photoTop - 18,
      contentWidth - 164,
    );
  } else {
    drawField("本人写真", "写真は登録されていません。", marginX + 16, photoTop - 18, contentWidth - 32);
  }

  if (payload.bankSummary) {
    drawSectionHeading("口座情報");
    const bankTop = drawBox(62);
    drawField("登録口座", payload.bankSummary, marginX + 16, bankTop - 18, contentWidth - 32);
  }

  if (payload.myNumberSummary) {
    drawSectionHeading("マイナンバー");
    const myNumberTop = drawBox(62);
    drawField("マイナンバー", payload.myNumberSummary, marginX + 16, myNumberTop - 18, contentWidth - 32);
  }

  drawSectionHeading("提出書類");
  for (const document of payload.documents) {
    drawDocumentCard(document);
  }

  drawSectionHeading("署名情報");
  const signatureHeight = payload.signature
    ? signatureGraphic
      ? 170
      : 92
    : 56;
  const signatureTop = drawBox(signatureHeight);
  if (payload.signature) {
    drawField("署名者", payload.signature.signerName, marginX + 16, signatureTop - 18, columnWidth);
    drawField("署名日", payload.signature.signedDate, rightX, signatureTop - 18, columnWidth);
    drawField(
      "署名日時",
      payload.signature.signedAt ? formatDateTime(payload.signature.signedAt) : undefined,
      marginX + 16,
      signatureTop - 64,
      signatureGraphic ? columnWidth : contentWidth - 32,
    );
    if (signatureGraphic) {
      drawSignatureGraphic({
        page,
        graphic: signatureGraphic,
        x: rightX,
        y: signatureTop - 78,
        width: columnWidth,
        height: 86,
        borderColor: palette.border,
        fillColor: rgb(1, 1, 1),
      });
    }
  } else {
    drawField("署名情報", "署名情報は登録されていません。", marginX + 16, signatureTop - 18, contentWidth - 32);
  }

  ensureSpace(30);
  page.drawText("本PDFは電子提出時点の内容を控えとして出力したものです。", {
    x: marginX,
    y: cursorY,
    size: 9,
    font,
    color: palette.muted,
  });

  return pdf.save();
}

async function loadFontBytes() {
  for (const path of FONT_CANDIDATES) {
    try {
      return await readFile(path);
    } catch {
      continue;
    }
  }

  throw new Error("PDF用フォントの読み込みに失敗しました");
}

type EmbeddedSignatureGraphic =
  | {
      kind: "image";
      image: Awaited<ReturnType<PDFDocument["embedPng"]>>;
      width: number;
      height: number;
    }
  | {
      kind: "svgPath";
      paths: string[];
      width: number;
      height: number;
    };

async function loadSignatureGraphic(
  pdf: PDFDocument,
  signatureImageUrl: string,
): Promise<EmbeddedSignatureGraphic | null> {
  if (signatureImageUrl.startsWith("data:image/png")) {
    const image = await pdf.embedPng(signatureImageUrl);
    return {
      kind: "image",
      image,
      width: image.width,
      height: image.height,
    };
  }

  if (
    signatureImageUrl.startsWith("data:image/jpeg") ||
    signatureImageUrl.startsWith("data:image/jpg")
  ) {
    const image = await pdf.embedJpg(signatureImageUrl);
    return {
      kind: "image",
      image,
      width: image.width,
      height: image.height,
    };
  }

  if (signatureImageUrl.startsWith("data:image/svg+xml")) {
    const svgMarkup = decodeSvgDataUrl(signatureImageUrl);
    const pathMatches = [...svgMarkup.matchAll(/<path[^>]*d="([^"]+)"/g)].map(
      (match) => match[1],
    );
    if (pathMatches.length === 0) {
      return null;
    }
    const viewBoxMatch = svgMarkup.match(/viewBox="([\d.\s-]+)"/);
    const viewBox = viewBoxMatch?.[1]?.trim().split(/\s+/).map(Number);
    const width = viewBox?.[2] || 500;
    const height = viewBox?.[3] || 180;

    return {
      kind: "svgPath",
      paths: pathMatches,
      width,
      height,
    };
  }

  return null;
}

function decodeSvgDataUrl(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",", 2);
  return decodeURIComponent(payload);
}

function drawSignatureGraphic(params: {
  page: ReturnType<PDFDocument["addPage"]>;
  graphic: EmbeddedSignatureGraphic;
  x: number;
  y: number;
  width: number;
  height: number;
  borderColor: ReturnType<typeof rgb>;
  fillColor: ReturnType<typeof rgb>;
}) {
  const { page, graphic, x, y, width, height, borderColor, fillColor } = params;

  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor,
    borderWidth: 1,
    color: fillColor,
  });

  if (graphic.kind === "image") {
    const scale = Math.min(width / graphic.width, height / graphic.height);
    const drawWidth = graphic.width * scale;
    const drawHeight = graphic.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y - height + (height - drawHeight) / 2;

    page.drawImage(graphic.image, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
    return;
  }

  const scale = Math.min(width / graphic.width, height / graphic.height) * 0.88;
  const offsetX = x + (width - graphic.width * scale) / 2;
  const offsetY = y - height + (height - graphic.height * scale) / 2;

  for (const path of graphic.paths) {
    page.drawSvgPath(path, {
      x: offsetX,
      y: offsetY + graphic.height * scale,
      scale,
      borderColor: rgb(0.06, 0.12, 0.2),
      borderWidth: 1.6,
      color: undefined,
    });
  }
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    let current = "";
    for (const char of paragraph) {
      const next = `${current}${char}`;
      const width = font.widthOfTextAtSize(next, size);
      if (width > maxWidth && current) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    lines.push(current || " ");
  }

  return lines;
}

function getDocumentLabel(documentType: string) {
  if (documentType === "employee_pledge") return "従業員誓約書";
  if (documentType === "sns_pledge") return "SNS誓約書";
  if (documentType === "retirement_pledge") return "退職時誓約書";
  return "雇用契約書";
}

function formatWorkflowState(
  state: "active" | "returned" | "invalidated" | "resubmitted",
) {
  if (state === "returned") return "差し戻し";
  if (state === "invalidated") return "無効";
  if (state === "resubmitted") return "再提出済み";
  return "有効";
}

function formatStatus(status: string) {
  if (status === "submitted") return "提出済み";
  if (status === "reviewed") return "確認済み";
  if (status === "returned") return "差し戻し";
  if (status === "in_progress") return "入力中";
  if (status === "sent") return "招待送信済み";
  return status;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP");
}
