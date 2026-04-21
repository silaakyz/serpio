import { describe, it, expect } from "vitest";
import { SKIP_PATTERNS } from "./scraper.service";

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(url));
}

describe("SKIP_PATTERNS — statik dosya filtreleme", () => {
  it(".pdf URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/doc.pdf")).toBe(true);
  });

  it(".jpg URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/image.jpg")).toBe(true);
  });

  it(".css ve .js URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/style.css")).toBe(true);
    expect(shouldSkip("https://example.com/bundle.js")).toBe(true);
  });

  it("query string içeren statik dosyalar atlanmalı", () => {
    expect(shouldSkip("https://example.com/img.png?v=2")).toBe(true);
  });
});

describe("SKIP_PATTERNS — taksonomi URL filtreleme", () => {
  it("/tag/ URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/tag/seo")).toBe(true);
  });

  it("/category/ URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/category/marketing")).toBe(true);
  });

  it("/author/ URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/author/john")).toBe(true);
  });

  it("WordPress /wp-content/ URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/wp-content/uploads/image.jpg")).toBe(true);
  });

  it("/page/2 gibi sayfalandırma URL'leri atlanmalı", () => {
    expect(shouldSkip("https://example.com/blog/page/2")).toBe(true);
  });
});

describe("SKIP_PATTERNS — protokol filtreleme", () => {
  it("javascript: URL'leri atlanmalı", () => {
    expect(shouldSkip("javascript:void(0)")).toBe(true);
  });

  it("mailto: URL'leri atlanmalı", () => {
    expect(shouldSkip("mailto:info@example.com")).toBe(true);
  });

  it("tel: URL'leri atlanmalı", () => {
    expect(shouldSkip("tel:+905001234567")).toBe(true);
  });

  it("anchor (#) içeren URL'ler atlanmalı", () => {
    expect(shouldSkip("https://example.com/article#section-2")).toBe(true);
  });
});

describe("SKIP_PATTERNS — geçerli içerik URL'leri", () => {
  it("normal makale URL'leri atlanmamalı", () => {
    expect(shouldSkip("https://example.com/blog/my-article")).toBe(false);
  });

  it("slug içeren URL'ler atlanmamalı", () => {
    expect(shouldSkip("https://example.com/seo-rehberi-2024")).toBe(false);
  });

  it("alt dizin içeren URL'ler atlanmamalı", () => {
    expect(shouldSkip("https://example.com/blog/seo/on-page-optimization")).toBe(false);
  });
});
