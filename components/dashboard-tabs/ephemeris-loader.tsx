import CelestiaLoader from "../ui/CelestiaLoader";

type Props = {
  title: string;
  description: string;
  detail: string;
  activity?: string;
  tone?: "calendar" | "dashboard";
  compact?: boolean;
};

export default function EphemerisLoader({
  title,
  description,
  detail,
  activity = "Calculating positions",
  tone = "calendar",
  compact = false,
}: Props) {
  return <CelestiaLoader {...{ title, description, detail, activity, tone, compact }} />;
}
