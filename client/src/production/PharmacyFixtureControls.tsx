import type { PharmacyFixtureRequest } from "@/lib/pharmacyFixtures";

type Props = {
  fixtureMode: boolean;
  onLoad: (fixtures: PharmacyFixtureRequest[]) => void;
  onClear: () => void;
};

export default function PharmacyFixtureControls(_: Props) {
  return null;
}

export function FixtureSafetyNotice() {
  return null;
}

export function FixtureModeHeaderBadge() {
  return null;
}
