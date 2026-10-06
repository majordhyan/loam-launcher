export type MotionPreference = "system" | "full" | "reduced" | "off";
export function resolveMotion(preference: MotionPreference, osReduced: boolean, paused = false, slow = false): "full" | "reduced" | "off" {
  if (paused || preference === "off") return "off";
  if (osReduced || slow || preference === "reduced") return "reduced";
  return "full";
}
export function direction(from: string, to: string, order: readonly string[]): number {
  return order.indexOf(to) >= order.indexOf(from) ? 1 : -1;
}
export function preference(value: string | null, legacy = false): MotionPreference {
  return value === "full" || value === "reduced" || value === "off" || value === "system" ? value : legacy ? "reduced" : "system";
}
