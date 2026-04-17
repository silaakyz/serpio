import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { Comparison } from "@/components/marketing/Comparison";
import { CTA } from "@/components/marketing/CTA";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <section id="features">
        <Features />
      </section>
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="pricing">
        <Pricing />
      </section>
      <Comparison />
      <CTA />
    </>
  );
}
