import { NextRequest, NextResponse } from "next/server";
import { forwardWriteRequest } from "@/lib/server/writeProxy";
import { validateEntityUpsertPayload } from "@/lib/server/writeValidation";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const validation = validateEntityUpsertPayload("vehicles", payload);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message, code: validation.code },
      { status: 400 },
    );
  }

  return forwardWriteRequest(request, "vehicles", "POST", undefined, JSON.stringify(payload));
}
