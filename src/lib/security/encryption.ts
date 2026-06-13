import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const IV_LENGTH = 12;

function getKey() {
  const secret =
    process.env.APP_ENCRYPTION_KEY ||
    "dev-only-encryption-key-change-before-production";

  return createHash("sha256").update(secret).digest();
}

export function encryptString(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((chunk) => chunk.toString("base64url"))
    .join(".");
}

export function decryptString(value: string) {
  const [ivText, authTagText, encryptedText] = value.split(".");
  if (!ivText || !authTagText || !encryptedText) {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function encryptJson<T>(value: T) {
  return encryptString(JSON.stringify(value));
}

export function decryptJson<T>(value: string) {
  return JSON.parse(decryptString(value)) as T;
}
