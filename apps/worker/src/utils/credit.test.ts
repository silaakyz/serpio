import { describe, it, expect } from "vitest";
import { CREDIT_COSTS } from "./credit";

describe("CREDIT_COSTS", () => {
  it("tüm temel aksiyonlar için maliyet tanımlı olmalı", () => {
    expect(CREDIT_COSTS.scrape_per_100_urls).toBe(10);
    expect(CREDIT_COSTS.ai_rewrite).toBe(15);
    expect(CREDIT_COSTS.publish_api).toBe(2);
  });

  it("tüm maliyetler pozitif tam sayı olmalı", () => {
    for (const [key, value] of Object.entries(CREDIT_COSTS)) {
      expect(value, `${key} pozitif olmalı`).toBeGreaterThan(0);
      expect(Number.isInteger(value), `${key} tam sayı olmalı`).toBe(true);
    }
  });

  it("ai_rewrite, ai_analyze'dan pahalı olmalı", () => {
    expect(CREDIT_COSTS.ai_rewrite).toBeGreaterThan(CREDIT_COSTS.ai_analyze);
  });
});
