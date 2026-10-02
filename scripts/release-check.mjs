import fs from "node:fs";
const config = JSON.parse(fs.readFileSync("loam.config.json", "utf8"));
const missing = [];
try {
  const u = new URL(config.support.discordInviteUrl);
  if (
    u.protocol !== "https:" ||
    !["discord.gg", "discord.com"].includes(u.hostname) ||
    u.pathname.includes("REPLACE_ME")
  )
    missing.push("permanent Discord invite");
} catch {
  missing.push("valid Discord invite");
}
if (!config.microsoftClientId)
  missing.push("approved Microsoft public-client ID");
if (!config.support.knownIssuesUrl.startsWith("https://"))
  missing.push("HTTPS known-issues feed");
if (
  !config.updates.endpoint.startsWith("https://") ||
  !config.updates.publicKey
)
  missing.push("signed updater configuration");
if (missing.length) {
  console.error("PUBLIC RELEASE BLOCKED: " + missing.join(", "));
  process.exit(1);
}
console.log(
  "Public configuration checks passed. Live acceptance evidence is still required.",
);
