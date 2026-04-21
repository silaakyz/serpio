import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: !!process.env.STRIPE_SECRET_KEY,
  });
}
