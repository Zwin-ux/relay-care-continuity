export type ProofContinuityItem = {
  continuity_item_id: string;
  title: string;
  care_domain: string;
  care_label: string;
  urgency: "low" | "medium" | "high" | "critical";
  state_label: string;
  handoff_status: string;
  source_report_count: number;
  source_link_count: number;
  missing_fields: string[];
  unsafe_claims: string[];
  conflicts: string[];
};

export type ProofSnapshot = {
  run_slug: string;
  generated_at: string;
  scenario_id: string;
  location?: {
    pack_id: string;
    label: string;
    hazard_type: string;
    site_type: string;
    context_mode: string;
  };
  model_mode: string;
  gemma_model: string;
  counts: {
    source_reports: number;
    continuity_items: number;
    unsafe_claims_held: number;
    missing_fields: number;
    audit_events: number;
  };
  eval_metrics: Record<string, number>;
  continuity_items: ProofContinuityItem[];
  proof_notes: string[];
};

export type ProofReadResult = {
  snapshot: ProofSnapshot;
  source: "supabase" | "fixture";
  error?: string;
};

export const fallbackProofSnapshot: ProofSnapshot = {
  run_slug: "relay-care-continuity-replay",
  generated_at: "2026-05-05T08:12:00Z",
  scenario_id: "wildfire_community_center",
  location: {
    pack_id: "wildfire_santa_rosa",
    label: "Santa Rosa, CA",
    hazard_type: "wildfire",
    site_type: "evacuation shelter",
    context_mode: "fixture",
  },
  model_mode: "replay",
  gemma_model: "gemma4:e2b",
  counts: {
    source_reports: 30,
    continuity_items: 9,
    unsafe_claims_held: 1,
    missing_fields: 18,
    audit_events: 30,
  },
  eval_metrics: {
    incident_type_accuracy: 1,
    urgency_accuracy: 1,
    missing_info_detection: 1,
    unsafe_action_rate: 0,
  },
  continuity_items: [
    {
      continuity_item_id: "medication_continuity",
      title: "Medication continuity",
      care_domain: "medication",
      care_label: "Medication",
      urgency: "high",
      state_label: "Unsafe claim held",
      handoff_status: "Unavailable",
      source_report_count: 3,
      source_link_count: 3,
      missing_fields: [
        "authorized pickup contact",
        "pharmacy or pickup location",
        "prescription authorization",
        "qualified clinical guidance",
        "recipient identity",
        "specific recipient",
      ],
      unsafe_claims: ["Unsafe medication instruction held for review."],
      conflicts: ["Unsafe medication instruction held for review."],
    },
    {
      continuity_item_id: "power-dependent_care",
      title: "Power-dependent care",
      care_domain: "oxygen_power",
      care_label: "Oxygen / power",
      urgency: "critical",
      state_label: "Missing information",
      handoff_status: "Unavailable",
      source_report_count: 2,
      source_link_count: 2,
      missing_fields: ["backup power source", "contact phone", "safe route"],
      unsafe_claims: [],
      conflicts: [],
    },
    {
      continuity_item_id: "infant_supply_continuity",
      title: "Infant supply continuity",
      care_domain: "infant_supply",
      care_label: "Infant supply",
      urgency: "high",
      state_label: "Missing information",
      handoff_status: "Unavailable",
      source_report_count: 4,
      source_link_count: 4,
      missing_fields: ["current quantity", "drop-off contact", "formula type"],
      unsafe_claims: [],
      conflicts: [],
    },
  ],
  proof_notes: [
    "Supabase proof ledger stores durable run receipts for judging.",
    "Unsafe health claims are represented only as held-review labels.",
    "Public preview remains replay-safe; local Ollama is the Gemma verification path.",
  ],
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getProofSnapshot(): Promise<ProofReadResult> {
  if (!hasSupabaseConfig()) {
    return { snapshot: fallbackProofSnapshot, source: "fixture", error: "Supabase public env vars are not configured." };
  }

  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/relay_public_snapshots`);
    url.searchParams.set("select", "run_slug,snapshot_json,published_at");
    url.searchParams.set("public_read", "eq.true");
    url.searchParams.set("order", "published_at.desc");
    url.searchParams.set("limit", "1");
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Supabase proof ledger returned ${response.status}`);
    }
    const rows = (await response.json()) as Array<{ snapshot_json?: ProofSnapshot }>;
    const snapshot = rows[0]?.snapshot_json;
    if (!snapshot) {
      throw new Error("No public proof snapshot has been published yet.");
    }
    return { snapshot, source: "supabase" };
  } catch (error) {
    return {
      snapshot: fallbackProofSnapshot,
      source: "fixture",
      error: error instanceof Error ? error.message : "Proof ledger unavailable.",
    };
  }
}
