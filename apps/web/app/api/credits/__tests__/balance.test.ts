import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock auth and getUserCredits before importing the route
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/check-credits", () => ({
  getUserCredits: vi.fn(),
}));

import { GET } from "../balance/route";
import { auth } from "@/lib/auth";
import { getUserCredits } from "@/lib/check-credits";

const mockAuth = vi.mocked(auth);
const mockGetUserCredits = vi.mocked(getUserCredits);

describe("GET /api/credits/balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("oturum açılmamışsa 401 döndürmeli", async () => {
    mockAuth.mockResolvedValue(null as any);

    const res = await GET();
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("oturum varsa bakiyeyi döndürmeli", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } } as any);
    mockGetUserCredits.mockResolvedValue(250);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.credits).toBe(250);
    expect(mockGetUserCredits).toHaveBeenCalledWith("user-123");
  });

  it("0 kredi de geçerli bir bakiye olarak döndürülmeli", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-456" } } as any);
    mockGetUserCredits.mockResolvedValue(0);

    const res = await GET();
    const body = await res.json();
    expect(body.credits).toBe(0);
  });
});
