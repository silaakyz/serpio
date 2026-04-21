import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, CREDIT_PACKS, CreditPackCredits } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe yapılandırılmamış. STRIPE_SECRET_KEY eksik." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body    = await req.json();
  const credits = body.credits as CreditPackCredits;

  const pack = CREDIT_PACKS.find((p) => p.credits === credits);
  if (!pack) {
    return NextResponse.json({ error: "Geçersiz kredi paketi" }, { status: 400 });
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      metadata: {
        userId:  session.user.id,
        credits: credits.toString(),
      },
      line_items: [
        {
          price_data: {
            currency:    "try",
            product_data: {
              name:        `Serpio — ${pack.label}`,
              description: `${credits.toLocaleString("tr-TR")} tek seferlik kredi`,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/credits?success=1&pack=${credits}`,
      cancel_url:  `${baseUrl}/dashboard/credits?canceled=1`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
