import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@serpio/database";
import { users, creditTransactions, subscriptions } from "@serpio/database";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Stripe v22 API'sinde bazı alanlar değişti — yardımcı tip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySub = any;

function subPeriodStart(sub: AnySub): Date {
  // v22'de current_period_start hala mevcut, ancak tip uyarısı verebilir
  const ts: number = sub.current_period_start ?? sub.billing_cycle_anchor ?? Math.floor(Date.now() / 1000);
  return new Date(ts * 1000);
}

function subPeriodEnd(sub: AnySub): Date {
  const ts: number = sub.current_period_end ?? Math.floor((Date.now() + 30 * 24 * 3600 * 1000) / 1000);
  return new Date(ts * 1000);
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Stripe-Signature header eksik" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET env değişkeni tanımlı değil");
    return NextResponse.json({ error: "Webhook yapılandırılmamış" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "İmza doğrulama hatası";
    console.error("[Stripe Webhook] İmza hatası:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  console.log("[Stripe Webhook] Event:", event.type);

  try {
    switch (event.type) {
      // ── Checkout tamamlandı ──────────────────────────────────────────────────
      case "checkout.session.completed": {
        const sess    = event.data.object as Stripe.Checkout.Session;
        const userId  = sess.metadata?.userId;
        const credits = parseInt(sess.metadata?.credits ?? "0", 10);
        const planId  = sess.metadata?.planId;

        if (!userId || !credits) break;

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user) break;

        const newBalance = user.credits + credits;

        await db.update(users)
          .set({ credits: newBalance, updatedAt: new Date() })
          .where(eq(users.id, userId));

        await db.insert(creditTransactions).values({
          userId,
          type:        "purchase",
          amount:      credits,
          balance:     newBalance,
          description: planId
            ? `${planId.charAt(0).toUpperCase() + planId.slice(1)} planı — ${credits.toLocaleString("tr-TR")} kredi`
            : `Kredi paketi — ${credits.toLocaleString("tr-TR")} kredi`,
          stripePaymentIntentId:
            typeof sess.payment_intent === "string" ? sess.payment_intent : null,
        });

        // Abonelik ise subscriptions tablosuna kaydet/güncelle
        if (sess.mode === "subscription" && sess.subscription) {
          const subId    = typeof sess.subscription === "string" ? sess.subscription : sess.subscription.id;
          const stripeSub: AnySub = await stripe.subscriptions.retrieve(subId);

          await db
            .insert(subscriptions)
            .values({
              userId,
              stripeCustomerId:     typeof sess.customer === "string" ? sess.customer : "",
              stripeSubscriptionId: stripeSub.id,
              stripePriceId:        stripeSub.items?.data?.[0]?.price?.id ?? "",
              status:               "active",
              currentPeriodStart:   subPeriodStart(stripeSub),
              currentPeriodEnd:     subPeriodEnd(stripeSub),
            })
            .onConflictDoUpdate({
              target: subscriptions.userId,
              set: {
                stripeSubscriptionId: stripeSub.id,
                stripeCustomerId:     typeof sess.customer === "string" ? sess.customer : "",
                stripePriceId:        stripeSub.items?.data?.[0]?.price?.id ?? "",
                status:               "active",
                currentPeriodStart:   subPeriodStart(stripeSub),
                currentPeriodEnd:     subPeriodEnd(stripeSub),
                updatedAt:            new Date(),
              },
            });
        }
        break;
      }

      // ── Fatura ödendi (aylık yenileme) ──────────────────────────────────────
      case "invoice.payment_succeeded": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice: any = event.data.object;
        const subId: string | undefined =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? invoice.parent?.subscription_details?.subscription;

        if (!subId || invoice.billing_reason !== "subscription_cycle") break;

        const subRecord = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subId),
        });
        if (!subRecord) break;

        const stripeSub: AnySub = await stripe.subscriptions.retrieve(subId);
        const credits   = parseInt(stripeSub.metadata?.credits ?? "500", 10);

        const user = await db.query.users.findFirst({ where: eq(users.id, subRecord.userId) });
        if (!user) break;

        const newBalance = user.credits + credits;

        await db.update(users)
          .set({ credits: newBalance, updatedAt: new Date() })
          .where(eq(users.id, subRecord.userId));

        await db.insert(creditTransactions).values({
          userId:      subRecord.userId,
          type:        "purchase",
          amount:      credits,
          balance:     newBalance,
          description: `Aylık yenileme — ${credits.toLocaleString("tr-TR")} kredi`,
        });

        await db.update(subscriptions)
          .set({
            currentPeriodStart: subPeriodStart(stripeSub),
            currentPeriodEnd:   subPeriodEnd(stripeSub),
            updatedAt:          new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subId));

        break;
      }

      // ── Abonelik güncellendi ─────────────────────────────────────────────────
      case "customer.subscription.updated": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub: any = event.data.object;
        const status: "active" | "canceled" | "past_due" | "incomplete" =
          sub.status === "active"   ? "active"   :
          sub.status === "past_due" ? "past_due" :
          sub.status === "canceled" ? "canceled" : "incomplete";

        await db.update(subscriptions)
          .set({
            status,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            currentPeriodEnd:  subPeriodEnd(sub),
            updatedAt:         new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      // ── Abonelik silindi ─────────────────────────────────────────────────────
      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub: any = event.data.object;
        await db.update(subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }
    }
  } catch (err: unknown) {
    console.error("[Stripe Webhook] İşleme hatası:", err);
    return NextResponse.json({ received: true, warning: "İşleme hatası oluştu" });
  }

  return NextResponse.json({ received: true });
}
