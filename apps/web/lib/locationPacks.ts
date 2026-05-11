import packs from "../data/location_packs.json";
import { CareDomain } from "@/lib/careContinuity";
import type { Snapshot } from "@/lib/api";

export type LocationContextItem = {
  source: string;
  label: string;
  body: string;
  context_only: boolean;
};

export type LocationPack = {
  id: string;
  label: string;
  short_label: string;
  hazard_type: string;
  site_type: string;
  scenario_id: string;
  location: {
    city: string;
    region: string;
    display: string;
    lat: number;
    lon: number;
  };
  public_context: LocationContextItem[];
  care_domains: CareDomain[];
  required_fields: Record<string, string[]>;
  boundaries: string[];
};

export const locationPacks = packs as LocationPack[];
export const defaultLocationPackId = "wildfire_santa_rosa";

export function getDefaultLocationPack() {
  return locationPacks.find((pack) => pack.id === defaultLocationPackId) ?? locationPacks[0];
}

export function getLocationPack(id?: string | null) {
  return locationPacks.find((pack) => pack.id === id) ?? getDefaultLocationPack();
}

export function locationPackFromSnapshot(snapshot?: Snapshot | null) {
  return getLocationPack(snapshot?.app.location_pack_id);
}

export function locationContextLine(pack: LocationPack) {
  return `${pack.hazard_type} / ${pack.site_type} / fixture-backed source reports`;
}
