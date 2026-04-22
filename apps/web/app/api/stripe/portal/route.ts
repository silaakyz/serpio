import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@serpio/database";
import { subscriptions } from "@serpio/database";
import { eq } from "@serpio/database";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe yapılandırılmamış. STRIPE_SECRET_KEY eksik." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
  });

  if (!sub) {
    return NextResponse.json({ error: "Aktif abonelik bulunamadı" }, { status: 404 });
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   sub.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/credits`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
