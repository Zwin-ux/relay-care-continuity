import { expect, test } from "@playwright/test";

const apiURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_API_PORT ?? "8000"}`;

const emptySnapshot = {
  app: {
    model_mode: "replay",
    agent_provider: "mock",
    scenario_id: "wildfire_community_center",
    location_pack_id: "wildfire_santa_rosa",
    location_label: "Santa Rosa, CA",
    hazard_type: "wildfire",
    site_type: "evacuation shelter",
    context_mode: "fixture",
    scenario_loaded: false,
    last_updated_at: "2026-04-30T22:10:31Z",
  },
  counts: {
    signals_total: 0,
    signals_unprocessed: 0,
    incidents_total: 0,
    needs_verification: 0,
    high_priority: 0,
    ready_to_dispatch: 0,
    dispatched: 0,
    resolved: 0,
    follow_running: 0,
    follow_completed: 0,
  },
  signals: [],
  public_context: [
    {
      source: "CDC wildfire safety",
      label: "Smoke-sensitive groups",
      body: "Wildfire smoke can affect continuity needs.",
      context_only: true,
    },
  ],
  board: { lanes: [], counts: {} },
  selected_incident: null,
};

const ledgerHeading = { name: "Continuity Ledger" };

async function loadAndGroup(page: import("@playwright/test").Page) {
  await page.goto("/");
  try {
    await page.getByRole("button", { name: "Load reports" }).click({ timeout: 5_000 });
    await expect(page.getByRole("heading", { name: "Incoming Reports" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("30 reports").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Group reports" }).click({ timeout: 5_000 });
  } catch {
    await page.request.post(`${apiURL}/api/scenarios/load?include_snapshot=true`);
    await page.request.post(`${apiURL}/api/triage/run-batch?include_snapshot=true`);
    await page.goto("/");
  }
  await expect(page.getByText("Medication continuity").first()).toBeVisible({ timeout: 30_000 });
}

test("first-run workspace starts from the ledger, not an onboarding shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let serveEmptySnapshot = true;
  await page.route("**/api/snapshot**", async (route) => {
    if (route.request().method() === "GET" && serveEmptySnapshot) {
      await route.fulfill({ json: emptySnapshot });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByTestId("care-continuity-onboarding")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Incoming Reports" })).toBeVisible();
  await expect(page.getByRole("heading", ledgerHeading)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuity Review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load reports" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Group reports" })).toBeVisible();
  await expect(page.getByLabel("Activate location")).toBeVisible();

  for (const banned of ["AI-powered", "Mission control", "Confidence", "Human Controlled", "Start guided review", "Reviewer launch"]) {
    await expect(page.getByText(banned)).toHaveCount(0);
  }

  serveEmptySnapshot = false;
  await page.getByRole("button", { name: "Load reports" }).click();
  await expect(page.getByText("30 reports").first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Group reports" }).click();
  await expect(page.getByRole("heading", ledgerHeading)).toBeVisible();
  await expect(page.getByText("Medication continuity").first()).toBeVisible();
  const medication = page.getByTestId(/continuity-task-/).filter({ hasText: "Medication continuity" }).first();
  await expect(medication).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Handoff unavailable").first()).toBeVisible();
});

test("opens the care-continuity workspace above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  await expect(page.getByTestId("care-continuity-onboarding")).toHaveCount(0);
  await expect(page.getByRole("heading", ledgerHeading)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuity Review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Incoming Reports" })).toBeVisible();

  const ledgerBox = await page.getByRole("heading", ledgerHeading).boundingBox();
  expect(ledgerBox).not.toBeNull();
  expect(ledgerBox!.y).toBeLessThan(760);

  const medication = page.getByTestId(/continuity-task-/).filter({ hasText: "Medication continuity" }).first();
  await expect(medication).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Handoff unavailable").first()).toBeVisible();
});

test("loads reports into the care continuity workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  await expect(page.getByRole("heading", { name: "RELAY" })).toBeVisible();
  await expect(page.getByText("Care continuity desk").first()).toBeVisible();
  await expect(page.getByText("Evacuation shelter reports, source links, and blocked handoff review.")).toBeVisible();
  await expect(page.getByText(/Context only\. Source reports still require review\./)).toBeVisible();
  await expect(page.getByLabel("Activate location")).toHaveValue("wildfire_santa_rosa");
  await expect(page.getByRole("heading", { name: "Incoming Reports" })).toBeVisible();
  await expect(page.getByRole("heading", ledgerHeading)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuity Review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Required information" })).toBeVisible();
  await expect(page.getByText(/Live context|Context fallback/)).toBeVisible();
  await expect(page.getByLabel("Add local source report")).toBeVisible();
  await expect(page.getByText("Source report: My grandparents are on Maple Ave").first()).toBeVisible();
});

test("adds a local source report without treating it as verified truth", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  await page.getByLabel("Add local source report").fill("shelter desk reports oxygen battery low near west entrance");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText("Local source report: shelter desk reports oxygen battery low near west entrance").first()).toBeVisible();
  await expect(page.getByText("Local intake").first()).toBeVisible();
  await expect(page.getByText("New").first()).toBeVisible();
  await expect(page.getByText("Added reports stay unverified until grouping and required-field review run.")).toBeVisible();
});

test("selected medication continuity item shows missing fields and suppressed unsafe claims", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  await page.getByTestId(/continuity-task-/).filter({ hasText: "Medication continuity" }).first().click();
  await expect(page.getByText("Handoff unavailable").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for handoff" })).toBeDisabled();
  await expect(page.getByText(/required field.*open|Complete required fields/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unsafe claim review" })).toBeVisible();
  await expect(page.getByText("Unsafe medication instruction held for review.").first()).toBeVisible();
  await expect(page.getByText("Unsupported insulin request includes unsafe dosing suggestion for Maple area.")).toHaveCount(0);
  await expect(page.getByText("Suppressed as medical advice").first()).toBeVisible();
});

test("requesting missing info records a receipt without changing the selected ledger item", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  const firstTask = page.getByTestId(/continuity-task-/).filter({ hasText: "Medication continuity" }).first();
  await firstTask.click();
  const selectedId = await firstTask.getAttribute("data-testid");
  await page.getByRole("button", { name: "Request missing info" }).click();

  await expect(page.getByTestId("missing-info-pull")).toBeVisible();
  await expect(page.getByText("Dispatch Arcade")).toBeVisible();
  await expect(page.getByText("Match source")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Confirm recipient identity").first()).toBeVisible();
  await page.getByRole("button", { name: /Text report 01.*need medication picked up/i }).click();
  await expect(page.getByText("Choose safe ask")).toBeVisible();
  await page.getByRole("button", { name: /Confirm identity.*Ask the source owner/i }).click();
  await expect(page.getByTestId("arcade-score")).toContainText("Clean ticket");
  await page.getByTestId("arcade-lock-ticket").click();
  await expect(page.getByTestId("dispatch-arcade").getByText("Ticket printed")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Operation recorded")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Handoff unavailable").first()).toBeVisible();
  await expect(page.locator(`[data-testid="${selectedId}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Mark ready for handoff" })).toBeDisabled();
});

test("dispatch arcade blocks unsafe ask choices before recording a ticket", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  const firstTask = page.getByTestId(/continuity-task-/).filter({ hasText: "Medication continuity" }).first();
  await firstTask.click();
  await page.getByRole("button", { name: "Request missing info" }).click();

  await expect(page.getByText("Match source")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Text report 01.*need medication picked up/i }).click();
  await page.getByRole("button", { name: /Give care advice.*medication or treatment/i }).click();

  await expect(page.getByTestId("arcade-score")).toContainText("Unsafe ask blocked");
  await expect(page.getByText("Unsafe ask blocked. RELAY cannot give treatment instructions.")).toBeVisible();
  await expect(page.getByTestId("arcade-lock-ticket")).toBeDisabled();
});

test("desktop layout keeps the three main zones in one row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await loadAndGroup(page);

  const reports = await page.getByRole("heading", { name: "Incoming Reports" }).boundingBox();
  const ledger = await page.getByRole("heading", ledgerHeading).boundingBox();
  const review = await page.getByRole("heading", { name: "Continuity Review" }).boundingBox();

  expect(reports).not.toBeNull();
  expect(ledger).not.toBeNull();
  expect(review).not.toBeNull();
  expect(ledger!.x).toBeGreaterThan(reports!.x + 120);
  expect(review!.x).toBeGreaterThan(ledger!.x + 220);
  expect(Math.abs(reports!.y - ledger!.y)).toBeLessThan(40);
  expect(Math.abs(ledger!.y - review!.y)).toBeLessThan(40);
});

test("banned command-center and fake-precision copy is not visible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAndGroup(page);

  for (const banned of [
    "Human Controlled",
    "Human Verified",
    "AI-powered",
    "Mission Lanes",
    "Mission Review",
    "Mission control",
    "Draft Response Tasks",
    "Task Review",
    "Confidence",
    "Report match",
    "% rel.",
    "Suggested unit",
    "Handoff Lock",
    "Route held",
    "Emergency controlled",
    "Start guided review",
    "Reviewer launch",
    "Get all signals",
    "Live emergency feed",
    "Verified local facts",
  ]) {
    await expect(page.getByText(banned)).toHaveCount(0);
  }
});

test("mobile layout keeps core care-continuity surfaces reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadAndGroup(page);

  await expect(page.getByRole("heading", { name: "RELAY" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Incoming Reports" })).toBeVisible();
  await expect(page.getByRole("heading", ledgerHeading)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continuity Review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for handoff" })).toBeDisabled();
});

test("proof ledger route is available with live Supabase or safe fixture fallback", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/proof");

  await expect(page.getByRole("heading", { name: "RELAY Proof Ledger" })).toBeVisible();
  await expect(page.getByText(/Supabase live|Proof ledger offline/)).toBeVisible();
  await expect(page.getByText("Unsafe medication instruction held for review.").first()).toBeVisible();
  await expect(page.getByText("Return to workspace")).toBeVisible();
});
