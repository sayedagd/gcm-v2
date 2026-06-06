import { NextRequest, NextResponse } from "next/server";
import { forwardWriteRequest } from "@/lib/server/writeProxy";
import { validateDeleteId } from "@/lib/server/writeValidation";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const validation = validateDeleteId(id);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message, code: validation.code },
      { status: 400 },
    );
  }

  return forwardWriteRequest(request, "drivers", "DELETE", id);
}
