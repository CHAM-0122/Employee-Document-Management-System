import { z } from "zod";

import { zodError } from "@/src/lib/api/responses";

export async function parseJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
) {
  const json = await request.json();
  const result = schema.safeParse(json);

  if (!result.success) {
    return { success: false as const, response: zodError(result.error) };
  }

  return { success: true as const, data: result.data as z.output<TSchema> };
}
