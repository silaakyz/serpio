import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOAuth2Client } from "@/lib/google";
import { db, googleConnections, eq } from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code      = searchParams.get("code");
  const projectId = searchParams.get("state"); // OAuth state = projectId
  const error     = searchParams.get("error");

  if (error || !code || !projectId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?tab=performance&error=google_auth_failed", req.url)
    );
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Token alınamadı");
    }

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000);

    // Upsert
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
          scope:          tokens.scope ?? existing.scope,
          updatedAt:      new Date(),
        })
        .where(eq(googleConnections.projectId, projectId));
    } else {
      await db.insert(googleConnections).values({
        projectId,
        userId:         session.user.id,
        accessToken:    tokens.access_token,
        refreshToken:   tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        scope:          tokens.scope ?? "",
      });
    }

    return NextResponse.redirect(
      new URL("/dashboard/settings?tab=performance&success=google_connected", req.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/settings?tab=performance&error=token_exchange_failed", req.url)
    );
  }
}
