import { useState } from "react";
import { call, native } from "./api";

type Check = { code: string; ok: boolean; message: string };

export function VerificationTools({ gameId, onError }: { gameId?: string; onError: (error: unknown) => void }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [pending, setPending] = useState(false);
  async function run() {
    setPending(true);
    try {
      setChecks(await call<Check[]>("doctor", { id: gameId }));
    } catch (e) { onError(e); } finally { setPending(false); }
  }
  return <section aria-label="Local verification">
    <div className="setting-row"><div><h3>Check selected game</h3><p>Read-only checks for files, JAR structure, managed Java and available space. GPU drivers and network access are not tested here.</p></div>
      <button className="secondary" disabled={!native || !gameId || pending} onClick={() => void run()}>{pending ? "Checking game…" : "Check game"}</button></div>
    {checks && <ul aria-live="polite">{checks.map((check) => <li key={check.code}><strong>{check.ok ? "PASS" : "NEEDS ATTENTION"}</strong> — {check.message}</li>)}</ul>}
  </section>;
}
