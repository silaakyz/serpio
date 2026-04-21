import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, PLANS, PlanId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe yapılandırılmamış. STRIPE_SECRET_KEY eksik." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { planId, billingPeriod = "monthly" } = body as {
    planId: string;
    billingPeriod?: "monthly" | "yearly";
  };

  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
  }

  const plan  = PLANS[planId as PlanId];
  const price = billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email,
      metadata: {
        userId:  session.user.id,
        planId,
        credits: plan.credits.toString(),
      },
      subscription_data: {
        metadata: {
          userId:  session.user.id,
          planId,
          credits: plan.credits.toString(),
        },
      },
      line_items: [
        {
          price_data: {
            currency:    "try",
            product_data: {
              name:        `Serpio ${plan.name}`,
              description: `${plan.credits.toLocaleString("tr-TR")} kredi/ay`,
            },
            unit_amount: price,
            recurring:   { interval: billingPeriod === "yearly" ? "year" : "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/credits?success=1&plan=${planId}`,
      cancel_url:  `${baseUrl}/dashboard/credits?canceled=1`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
