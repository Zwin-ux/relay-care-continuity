import { describe, expect, it } from "vitest";
import { getDefaultLocationPack, getLocationPack, locationContextLine, locationPacks } from "@/lib/locationPacks";

describe("location packs", () => {
  it("ships the three submission location packs", () => {
    expect(locationPacks.map((pack) => pack.id)).toEqual(["wildfire_santa_rosa", "flood_asheville", "blackout_phoenix"]);
  });

  it("keeps wildfire as the default stable replay path", () => {
    const pack = getDefaultLocationPack();
    expect(pack.id).toBe("wildfire_santa_rosa");
    expect(pack.scenario_id).toBe("wildfire_community_center");
    expect(locationContextLine(pack)).toContain("fixture-backed source reports");
  });

  it("does not expose live-signal language in pack boundaries", () => {
    const text = JSON.stringify(locationPacks).toLowerCase();
    expect(text).not.toContain("get all signals");
    expect(text).not.toContain("live emergency feed");
    expect(text).not.toContain("verified local facts");
  });

  it("falls back to default pack for unknown snapshot metadata", () => {
    expect(getLocationPack("missing").id).toBe("wildfire_santa_rosa");
  });
});
