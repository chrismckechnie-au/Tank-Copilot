import { NextResponse } from "next/server";

import { getPhase0ConfigStatus } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "tank-copilot",
    phase: "0-foundation",
    config: getPhase0ConfigStatus(),
    now: new Date().toISOString(),
  });
}
