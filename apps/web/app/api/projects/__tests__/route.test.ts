import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@serpio/database", () => ({
  db: {
    query: {
      projects: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
  projects: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import { GET, POST } from "../route";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";

const mockAuth = vi.mocked(auth);

describe("GET /api/projects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("oturum yoksa 401 döndürmeli", async () => {
    mockAuth.mockResolvedValue(null as any);

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("oturum varsa projeleri döndürmeli", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
    const mockProjects = [{ id: "proj-1", name: "Test Site" }];
    vi.mocked(db.query.projects.findMany).mockResolvedValue(mockProjects as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toEqual(mockProjects);
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("oturum yoksa 401 döndürmeli", async () => {
    mockAuth.mockResolvedValue(null as any);

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ websiteUrl: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("websiteUrl yoksa 400 döndürmeli", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/websiteUrl/);
  });

  it("geçerli istekle proje oluşturulmalı", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as any);
    const newProject = { id: "proj-new", name: "example.com", websiteUrl: "https://example.com" };

    const mockReturning = vi.fn().mockResolvedValue([newProject]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const req = new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify({ websiteUrl: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.id).toBe("proj-new");
  });
});
