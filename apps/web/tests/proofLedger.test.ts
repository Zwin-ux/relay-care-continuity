import { afterEach, describe, expect, it, vi } from "vitest";
import { fallbackProofSnapshot, getProofSnapshot } from "@/lib/proofLedger";

describe("proof ledger reader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("falls back to the local proof fixture without public Supabase env vars", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const result = await getProofSnapshot();

    expect(result.source).toBe("fixture");
    expect(result.snapshot.run_slug).toBe(fallbackProofSnapshot.run_slug);
    expect(result.snapshot.counts.unsafe_claims_held).toBeGreaterThan(0);
  });

  it("reads the latest public Supabase snapshot when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ snapshot_json: { ...fallbackProofSnapshot, run_slug: "supabase-run" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProofSnapshot();

    expect(result.source).toBe("supabase");
    expect(result.snapshot.run_slug).toBe("supabase-run");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/relay_public_snapshots"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
