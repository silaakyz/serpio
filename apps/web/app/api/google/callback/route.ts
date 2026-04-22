import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";
import { db, googleConnections, eq } from "@serpio/database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const dashUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${dashUrl}/dashboard/performance?error=google_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${dashUrl}/dashboard/performance?error=invalid_callback`);
  }

  let projectId: string;
  let userId: string;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    [projectId, userId] = decoded.split("|");
    if (!projectId || !userId) throw new Error("bad state");
  } catch {
    return NextResponse.redirect(`${dashUrl}/dashboard/performance?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${dashUrl}/dashboard/performance?error=no_refresh_token`);
    }

    const expiresAt = new Date(tokens.expiry_date ?? Date.now() + 3600_000);
    const scope = tokens.scope ?? "";

    // Upsert — bu proje için tek bağlantı
    const existing = await db.query.googleConnections.findFirst({
      where: eq(googleConnections.projectId, projectId),
    });

    if (existing) {
      await db
        .update(googleConnections)
        .set({
          accessToken:    tokens.access_token,
          refreshToken:   tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          scope,
          updatedAt:      new Date(),
        })
        .where(eq(googleConnections.projectId, projectId));
    } else {
      await db.insert(googleConnections).values({
        projectId,
        userId,
        accessToken:    tokens.access_token,
        refreshToken:   tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        scope,
      });
    }

    return NextResponse.redirect(`${dashUrl}/dashboard/performance?connected=1`);
  } catch (err) {
    console.error("[Google OAuth callback error]", err);
    return NextResponse.redirect(`${dashUrl}/dashboard/performance?error=token_exchange`);
  }
}
