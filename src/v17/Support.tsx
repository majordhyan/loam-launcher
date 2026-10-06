// Support (1.7): ways to get help, what's new, this installation, and your saved reports.
import { ArrowUpRight, Copy, FileText, LifeBuoy, Mail, MessageSquare, Package, ShieldCheck, Sparkles, Cpu, HardDrive, Keyboard, CheckCircle2, CircleDot } from "lucide-react";
import type { Snapshot } from "../api";
import { bytes } from "../api";

type Issue = { id: string; title: string; status: string; fixedIn?: string; workaround?: string };
type Report = { id: string; type: string; date: string };

const shortcuts: [string, string][] = [
  ["Ctrl ↵", "Play or stop the selected game"], ["Ctrl K", "Search and actions"], ["Ctrl N", "Create a game"],
  ["Alt 1–4", "Home, Library, Discover, Skins"], ["Ctrl 1–9", "Select a game"], ["Ctrl ,", "Settings"], ["F1", "Help"],
];

export default function Support({ snap, reports, issues, onDiscord, onEmail, onCopy, onReport, onWhatsNew }: {
  snap: Snapshot;
  reports: Report[];
  issues: Issue[];
  onDiscord: () => void;
  onEmail: () => void;
  onCopy: (text: string, message: string) => void;
  onReport: () => void;
  onWhatsNew: () => void;
}) {
  const ways = [
    { icon: MessageSquare, title: "Ask the community", text: "Questions, tips and first steps with other LOAM players on Discord.", action: "Open Discord", onClick: onDiscord, accent: true, off: !snap.configuration.discord },
    { icon: Mail, title: "Email the LOAM team", text: "For private questions. loamlauncher@gmail.com", action: "Write an email", onClick: onEmail },
    { icon: FileText, title: "Report a problem", text: "LOAM gathers the useful details. You review everything before it's saved.", action: "Start a report", onClick: onReport },
    { icon: Sparkles, title: "What's new", text: `What changed in LOAM ${snap.version}, and known issues with workarounds.`, action: "Read", onClick: onWhatsNew },
  ];
  const info = `LOAM ${snap.version} · Windows x64 · ${snap.data.games.length} games`;
  return (
    <main className="v17-page v17-support">
      <header className="v17-page-head v17-rise">
        <div>
          <p className="v17-eyebrow"><LifeBuoy size={13} /> Help is close by</p>
          <h1 className="v17-display">Support<span className="v17-dot">.</span></h1>
        </div>
      </header>

      <div className="v17-ways">
        {ways.map((w, i) => {
          const Icon = w.icon;
          return (
            <button key={w.title} type="button" className={`v17-way v17-rise ${w.accent ? "accent" : ""}`} style={{ animationDelay: `${40 + i * 40}ms` }} onClick={w.onClick}>
              <span className="v17-way-icon"><Icon size={22} /></span>
              <strong>{w.title}</strong>
              <small>{w.text}</small>
              <span className="v17-way-go">{w.off ? "Invite not set up yet" : w.action} <ArrowUpRight size={14} /></span>
            </button>
          );
        })}
      </div>

      <div className="v17-support-grid">
        <section className="v17-panel v17-rise" style={{ animationDelay: "200ms" }}>
          <div className="v17-panel-head">
            <h3>This installation</h3>
            <button type="button" className="v17-text-btn" onClick={() => onCopy(info, "Version info copied.")}><Copy size={14} /> Copy</button>
          </div>
          <dl className="v17-facts">
            <div><dt><Package size={14} /> LOAM</dt><dd className="mono">{snap.version}</dd></div>
            <div><dt><Cpu size={14} /> Memory</dt><dd className="mono">{(snap.ramMB / 1024).toFixed(0)} GB</dd></div>
            <div><dt><HardDrive size={14} /> Free space</dt><dd className="mono">{snap.freeDisk ? bytes(snap.freeDisk) : "—"}</dd></div>
            <div><dt><CircleDot size={14} /> Games</dt><dd className="mono">{snap.data.games.length}</dd></div>
            <div><dt><ShieldCheck size={14} /> Java</dt><dd className="mono">Managed: 8, 17, 21, 25</dd></div>
          </dl>
          <p className="v17-quiet"><ShieldCheck size={14} /> Nothing is sent automatically. Reports stay on this PC until you share them.</p>
        </section>

        <section className="v17-panel v17-rise" style={{ animationDelay: "240ms" }}>
          <div className="v17-panel-head"><h3><Keyboard size={16} /> Keyboard</h3></div>
          <div className="v17-keys">
            {shortcuts.map(([k, what]) => <div key={k}><kbd>{k}</kbd><span>{what}</span></div>)}
          </div>
        </section>

        <section className="v17-panel v17-rise" style={{ animationDelay: "280ms" }}>
          <div className="v17-panel-head"><h3>Known issues</h3></div>
          {issues.length ? issues.slice(0, 5).map((i) => (
            <div key={i.id} className="v17-issue">
              <span className={`v17-issue-dot ${i.fixedIn ? "fixed" : ""}`} />
              <div><strong>{i.title}</strong><small>{i.fixedIn ? `Fixed in ${i.fixedIn}` : i.status}{i.workaround ? ` · ${i.workaround}` : ""}</small></div>
            </div>
          )) : <p className="v17-quiet"><CheckCircle2 size={14} /> No known issues listed for this version.</p>}
        </section>

        <section className="v17-panel v17-rise" style={{ animationDelay: "320ms" }}>
          <div className="v17-panel-head"><h3>Your reports</h3><button type="button" className="v17-text-btn" onClick={onReport}>New report</button></div>
          {reports.length ? reports.slice(0, 6).map((r) => (
            <div key={r.id} className="v17-report">
              <span className="mono">{r.id}</span><span>{r.type}</span><small>{new Date(r.date).toLocaleDateString()}</small>
            </div>
          )) : <p className="v17-quiet">No reports yet. When something goes wrong, a report helps us fix it fast.</p>}
        </section>
      </div>
    </main>
  );
}
