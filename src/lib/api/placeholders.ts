import { ok } from "@/src/lib/api/responses";

export function todo(message: string, extra?: Record<string, unknown>) {
  return ok({
    ok: true,
    todo: true,
    message,
    ...(extra ? { extra } : {}),
  });
}

