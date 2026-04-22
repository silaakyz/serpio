import { google, Auth } from "googleapis";
import { db, googleConnections, eq } from "@serpio/database";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "openid",
  "email",
];

export function createOAuth2Client(): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent",
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshAccessToken(projectId: string): Promise<string> {
  const conn = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.projectId, projectId),
  });
  if (!conn) throw new Error("Google bağlantısı bulunamadı");

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: conn.refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  const newAccessToken = credentials.access_token!;
  const newExpiry = new Date(credentials.expiry_date ?? Date.now() + 3600_000);

  await db
    .update(googleConnections)
    .set({ accessToken: newAccessToken, tokenExpiresAt: newExpiry, updatedAt: new Date() })
    .where(eq(googleConnections.projectId, projectId));

  return newAccessToken;
}

export async function getValidAccessToken(projectId: string): Promise<string> {
  const conn = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.projectId, projectId),
  });
  if (!conn) throw new Error("Google bağlantısı bulunamadı");

  // 5 dakika öncesinden itibaren yenile
  const needsRefresh = conn.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (needsRefresh) {
    return refreshAccessToken(projectId);
  }
  return conn.accessToken;
}

export async function getAuthenticatedClient(projectId: string) {
  const accessToken = await getValidAccessToken(projectId);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}
