/** "0.16.9" → "Fabric 0.16.9", "quilt:0.26.4" → "Quilt 0.26.4", null → "Vanilla". */
export function loaderLabel(loader: string | null | undefined): string {
  if (!loader) return "Vanilla";
  return loader.startsWith("quilt:") ? `Quilt ${loader.slice(6)}` : `Fabric ${loader}`;
}

/**
 * Java major Mojang's metadata requires for a release. Used only for display before
 * install; the launcher itself always reads `javaVersion` from the version JSON.
 */
export function javaFor(version: string): number | null {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version);
  if (!m) return null; // snapshots: shown after install from the real metadata
  const [major, minor, patch] = [+m[1], +m[2], +(m[3] ?? 0)];
  if (major >= 26) return 25;
  if (major !== 1) return null;
  if (minor <= 16) return 8;
  if (minor === 17) return 16;
  if (minor < 20 || (minor === 20 && patch <= 4)) return 17;
  return 21;
}
