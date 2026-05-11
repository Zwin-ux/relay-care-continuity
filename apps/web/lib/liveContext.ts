import { LocationPack } from "@/lib/locationPacks";

export type LiveContextAlert = {
  id: string;
  source: "National Weather Service";
  event: string;
  severity: string;
  urgency: string;
  certainty: string;
  headline: string;
  effective?: string;
  expires?: string;
  url?: string;
};

export type LiveContextSignal = {
  location: string;
  status: "live" | "fallback";
  sourceLabel: string;
  generatedAt: string;
  alerts: LiveContextAlert[];
  contextNotes: Array<{ label: string; body: string; source: string }>;
  limitations: string[];
};

const fallbackByHazard: Record<string, Array<{ label: string; body: string; source: string }>> = {
  wildfire: [
    {
      label: "Wildfire care continuity",
      body: "Smoke, power loss, and evacuation timing can interrupt medication pickup, oxygen equipment, infant supplies, mobility, and public information.",
      source: "RELAY location pack",
    },
  ],
  flood: [
    {
      label: "Flood access continuity",
      body: "Flooding can interrupt transport, medication access, charging, accessible routing, and source confirmation.",
      source: "RELAY location pack",
    },
  ],
  "heat + blackout": [
    {
      label: "Heat and power continuity",
      body: "Cooling center operations can surface power-dependent device needs, medication storage questions, and mobility requests.",
      source: "RELAY location pack",
    },
  ],
};

export function fallbackLiveContext(pack: LocationPack, reason = "Live public alerts unavailable."): LiveContextSignal {
  return {
    location: pack.location.display,
    status: "fallback",
    sourceLabel: "Location pack fixture",
    generatedAt: new Date().toISOString(),
    alerts: [],
    contextNotes: fallbackByHazard[pack.hazard_type] ?? fallbackByHazard.wildfire,
    limitations: [
      reason,
      "Public context is not source evidence.",
      "Local source reports still require review before handoff.",
    ],
  };
}

export async function fetchLiveContext(pack: LocationPack, signal?: AbortSignal): Promise<LiveContextSignal> {
  const params = new URLSearchParams({
    point: `${pack.location.lat.toFixed(4)},${pack.location.lon.toFixed(4)}`,
    status: "actual",
    message_type: "alert",
  });
  const response = await fetch(`https://api.weather.gov/alerts/active?${params.toString()}`, {
    signal,
    headers: { Accept: "application/geo+json" },
  });
  if (!response.ok) {
    throw new Error(`NWS alerts unavailable (${response.status})`);
  }
  const body = (await response.json()) as {
    features?: Array<{
      id?: string;
      properties?: {
        id?: string;
        event?: string;
        severity?: string;
        urgency?: string;
        certainty?: string;
        headline?: string;
        effective?: string;
        expires?: string;
        uri?: string;
      };
    }>;
  };
  const alerts = (body.features ?? []).slice(0, 5).map((feature, index) => {
    const props = feature.properties ?? {};
    return {
      id: props.id ?? feature.id ?? `nws-${index}`,
      source: "National Weather Service" as const,
      event: props.event ?? "Weather alert",
      severity: props.severity ?? "Unknown",
      urgency: props.urgency ?? "Unknown",
      certainty: props.certainty ?? "Unknown",
      headline: props.headline ?? props.event ?? "National Weather Service alert",
      effective: props.effective,
      expires: props.expires,
      url: props.uri,
    };
  });
  return {
    location: pack.location.display,
    status: "live",
    sourceLabel: "National Weather Service active alerts",
    generatedAt: new Date().toISOString(),
    alerts,
    contextNotes: alerts.length
      ? alerts.map((alert) => ({
          label: alert.event,
          body: `${alert.severity} severity / ${alert.urgency} urgency / ${alert.certainty} certainty.`,
          source: alert.source,
        }))
      : [
          {
            label: "No active NWS alerts returned",
            body: "RELAY still uses the selected location pack and local source reports for continuity review.",
            source: "National Weather Service",
          },
        ],
    limitations: [
      "NWS alerts are public context only.",
      "They do not verify any local source report.",
      "Local reports and required fields still control handoff availability.",
    ],
  };
}
