import { NextResponse } from "next/server";

/** GET /api/health — verificação de saúde da aplicação. */
export function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
