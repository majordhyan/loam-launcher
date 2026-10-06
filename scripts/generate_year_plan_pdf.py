import os
import subprocess
import base64

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
os.makedirs(DIST_DIR, exist_ok=True)

ICON_PATH = os.path.join(PROJECT_ROOT, "src-tauri", "icons", "icon.png")
with open(ICON_PATH, "rb") as f:
    icon_b64 = base64.b64encode(f.read()).decode("utf-8")

HTML_PATH = os.path.join(DIST_DIR, "LOAM_Year_Plan_v1.5_to_v3.5.html")
PDF_PATH = os.path.join(DIST_DIR, "LOAM_Year_Plan_v1.5_to_v3.5.pdf")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LOAM Year Plan: v1.5 → v3.5 (October 2026 to September 2027)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {{
      size: A4;
      margin: 10mm 11mm 11mm 11mm;
      @bottom-right {{
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7pt;
        color: #8C8982;
      }}
      @bottom-left {{
        content: "LOAM MASTER ROADMAP · v1.5 → v3.5 · STRICTLY CONFIDENTIAL";
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7pt;
        color: #8C8982;
      }}
    }}

    :root {{
      --charcoal: #161614;
      --charcoal-soft: #232320;
      --sandstone: #EFECE6;
      --alabaster: #FAF9F6;
      --card-bg: #F4F2EC;
      --card-alt: #EBE8E0;
      --terracotta: #C15F3C;
      --terracotta-dark: #A54B2B;
      --terracotta-soft: rgba(193, 95, 60, 0.08);
      --green: #2F7A5E;
      --green-soft: rgba(47, 122, 94, 0.08);
      --muted: #6E6B64;
      --border: #DDD8CD;
      --border-dark: #383832;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}

    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--alabaster);
      color: var(--charcoal);
      line-height: 1.35;
      font-size: 8.2pt;
      padding: 0;
    }}

    .font-serif {{
      font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
    }}

    .font-mono {{
      font-family: 'JetBrains Mono', Consolas, monospace;
    }}

    .avoid-break {{
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }}

    .page-break {{
      page-break-before: always;
      break-before: page;
    }}

    /* Confidential Bar */
    .confidential-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 5px;
      margin-bottom: 8px;
      border-bottom: 1.5px solid var(--charcoal);
      font-size: 7pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--muted);
    }}

    .confidential-tag {{
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 1.5px 6px;
      background: var(--terracotta-soft);
      color: var(--terracotta);
      border: 1px solid var(--terracotta);
      border-radius: 4px;
      font-weight: 700;
    }}

    /* Hero Banner */
    .roadmap-hero {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 14px;
      background: var(--sandstone);
      border: 1.5px solid var(--border);
      border-radius: 8px;
      margin-bottom: 10px;
    }}

    .hero-text h1 {{
      font-size: 17pt;
      font-weight: 700;
      line-height: 1.1;
      color: var(--charcoal);
      letter-spacing: -0.02em;
    }}

    .hero-text .subtitle {{
      font-size: 9pt;
      color: var(--terracotta);
      font-weight: 600;
      margin-top: 2px;
    }}

    .hero-text .meta-desc {{
      font-size: 7.6pt;
      color: var(--muted);
      margin-top: 4px;
      line-height: 1.35;
    }}

    .hero-icon-box {{
      width: 52px;
      height: 52px;
      min-width: 52px;
      border-radius: 12px;
      background: var(--terracotta);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(193, 95, 60, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
    }}

    .hero-icon-box img {{
      width: 38px;
      height: 38px;
      object-fit: contain;
    }}

    /* Assumptions Row */
    .assumptions-box {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left: 3px solid var(--terracotta);
      border-radius: 0 6px 6px 0;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 7.6pt;
      color: #383632;
    }}

    .assumptions-box strong {{
      color: var(--charcoal);
    }}

    /* Section Headings */
    h2.section-title {{
      font-size: 10.5pt;
      font-weight: 700;
      color: var(--charcoal);
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      margin-bottom: 6px;
      padding-bottom: 2px;
      border-bottom: 1px solid var(--border);
      letter-spacing: -0.01em;
    }}

    h2.section-title .section-num {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      color: var(--terracotta);
      background: var(--terracotta-soft);
      padding: 1.5px 5px;
      border-radius: 3px;
      font-weight: 700;
    }}

    /* Compact Tables */
    table.compact-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.4pt;
      background: var(--card-bg);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }}

    table.compact-table th {{
      background: var(--card-alt);
      color: var(--charcoal);
      font-weight: 700;
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border);
      font-size: 7pt;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }}

    table.compact-table td {{
      padding: 4px 6px;
      border-bottom: 1px solid rgba(221, 216, 205, 0.5);
      color: #2F2E2A;
      vertical-align: top;
      line-height: 1.25;
    }}

    table.compact-table tr:last-child td {{
      border-bottom: none;
    }}

    .ver-badge {{
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: var(--alabaster);
      background: var(--terracotta);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 7pt;
      white-space: nowrap;
    }}

    .code-badge {{
      font-family: 'JetBrains Mono', monospace;
      color: var(--charcoal);
      font-weight: 600;
      font-size: 7.2pt;
    }}

    /* Release Grid */
    .release-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 7px;
      margin-bottom: 8px;
    }}

    .release-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-top: 2.5px solid var(--terracotta);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 7.3pt;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }}

    .release-card.accent-green {{
      border-top-color: var(--green);
    }}

    .release-card.accent-charcoal {{
      border-top-color: var(--charcoal);
    }}

    .rc-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(221, 216, 205, 0.6);
      padding-bottom: 3px;
      margin-bottom: 2px;
    }}

    .rc-title {{
      font-weight: 700;
      font-size: 8.5pt;
      color: var(--charcoal);
      display: flex;
      align-items: center;
      gap: 5px;
    }}

    .rc-date {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8pt;
      color: var(--muted);
      font-weight: 600;
    }}

    .rc-why {{
      color: var(--muted);
      font-style: italic;
      font-size: 7pt;
      line-height: 1.25;
    }}

    .rc-headlines {{
      list-style-type: none;
      margin: 2px 0;
    }}

    .rc-headlines li {{
      position: relative;
      padding-left: 9px;
      margin-bottom: 1.5px;
      line-height: 1.25;
      color: #2F2E2A;
    }}

    .rc-headlines li::before {{
      content: "•";
      position: absolute;
      left: 0;
      color: var(--terracotta);
      font-size: 7.5pt;
    }}

    .rc-footer-meta {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5px;
      background: rgba(235, 232, 224, 0.7);
      border-radius: 4px;
      padding: 3px 5px;
      font-size: 6.8pt;
      color: #383632;
      margin-top: 2px;
      line-height: 1.2;
    }}

    .rc-footer-meta span strong {{
      color: var(--charcoal);
    }}

    /* Release Train Rules */
    .rules-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }}

    .rule-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 7.2pt;
      line-height: 1.25;
    }}

    .rule-card strong {{
      color: var(--charcoal);
    }}

    /* Non-goals / Brief Card */
    .footer-summary-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-top: 6px;
      margin-bottom: 6px;
    }}

    .summary-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 7.2pt;
      line-height: 1.3;
    }}

    .summary-card-title {{
      font-weight: 700;
      font-size: 7.8pt;
      color: var(--charcoal);
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
    }}
  </style>
</head>
<body>

  <!-- ========================================================= -->
  <!-- PAGE 1: EXECUTIVE ROADMAP & THE YEAR AT A GLANCE          -->
  <!-- ========================================================= -->
  <div class="confidential-bar">
    <span>LOAM FOUNDATION · MASTER PRODUCT ROADMAP 2026–2027</span>
    <span class="confidential-tag">● STRICTLY CONFIDENTIAL & PROPRIETARY</span>
    <span>RELEASE ARCHITECTURE</span>
  </div>

  <div class="roadmap-hero">
    <div class="hero-text">
      <h1 class="font-serif">LOAM Year Plan: v1.5 → v3.5</h1>
      <div class="subtitle font-mono">12-Month Cadence · October 2026 to September 2027</div>
      <div class="meta-desc">
        A month-by-month release master plan defining topics, features, quality gates, owner tasks, and risk mitigations for each update. Each monthly section is engineered to convert directly into a Codex execution brief.
      </div>
    </div>
    <div class="hero-icon-box">
      <img src="data:image/png;base64,{icon_b64}" alt="LOAM Emblem" />
    </div>
  </div>

  <div class="assumptions-box">
    <strong>Planning Assumptions & Cadence Bounds:</strong> (1) Starts with <strong>v1.5 in October 2026</strong> and ends with <strong>v3.5 in September 2027</strong> (12 monthly trains). (2) v1.4.0 (Full Edition, Doctor, Launch Insurance) is complete; v1.5 executes the Master Brief. (3) Built by a small team + AI agent with human review; monthly cadence is maintained via fixed scope shapes. (4) <strong>Slip rule:</strong> If gates fail, the release slips and subsequent dates shift; never compress the hardening week. (5) Major numbers (2.0, 3.0) represent platform shifts; skipped minors (1.7, 2.3, etc.) are reserved for hotfix patch lines.
  </div>

  <!-- SECTION 1: THE YEAR AT A GLANCE TABLE -->
  <h2 class="section-title font-serif">
    <span class="section-num">01</span> The Year at a Glance (12 Monthly Releases)
  </h2>

  <table class="compact-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 13%;">Release Date</th>
        <th style="width: 10%;">Version</th>
        <th style="width: 11%;">Codename</th>
        <th style="width: 25%;">Theme</th>
        <th style="width: 37%;">Flagship Headlines</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>27 Oct 2026</td>
        <td><span class="ver-badge">v1.5</span></td>
        <td><span class="code-badge">Humus</span></td>
        <td><strong>Trust, Smoothness, Revamp</strong></td>
        <td>Signed & verifiable builds · smooth open/launch/close · revamped core</td>
      </tr>
      <tr>
        <td>2</td>
        <td>24 Nov 2026</td>
        <td><span class="ver-badge">v1.6</span></td>
        <td><span class="code-badge">Topsoil</span></td>
        <td><strong>Accounts Live, Safety Nets</strong></td>
        <td>LOAM Account & sync · Mod Guard + World Time Machine · Servers page</td>
      </tr>
      <tr>
        <td>3</td>
        <td>15 Dec 2026</td>
        <td><span class="ver-badge">v1.8</span></td>
        <td><span class="code-badge">Subsoil</span></td>
        <td><strong>Instances 2.0 & Storage</strong></td>
        <td>Groups, overrides, clone · shared store & storage map · safe folder move</td>
      </tr>
      <tr>
        <td>4</td>
        <td>26 Jan 2027</td>
        <td><span class="ver-badge">v2.0</span></td>
        <td><span class="code-badge">Tilth</span></td>
        <td><strong>The Mods Hub</strong></td>
        <td>Browse & install mods · dependency resolver & Update-all · shaders/packs</td>
      </tr>
      <tr>
        <td>5</td>
        <td>23 Feb 2027</td>
        <td><span class="ver-badge">v2.1</span></td>
        <td><span class="code-badge">Furrow</span></td>
        <td><strong>Session Health & Tuning</strong></td>
        <td>Session Health Report · evidence-based tuning · startup accelerator</td>
      </tr>
      <tr>
        <td>6</td>
        <td>30 Mar 2027</td>
        <td><span class="ver-badge">v2.2</span></td>
        <td><span class="code-badge">Terrace</span></td>
        <td><strong>Multiplayer & Servers</strong></td>
        <td>Server Hub · Join & Prepare (auto-sync) · local server manager & LAN helper</td>
      </tr>
      <tr>
        <td>7</td>
        <td>27 Apr 2027</td>
        <td><span class="ver-badge">v2.4</span></td>
        <td><span class="code-badge">Aquifer</span></td>
        <td><strong>Creators & Sharing</strong></td>
        <td>Skin Studio 2 · private share links · screenshot gallery & Streamer mode</td>
      </tr>
      <tr>
        <td>8</td>
        <td>25 May 2027</td>
        <td><span class="ver-badge">v2.6</span></td>
        <td><span class="code-badge">Seam</span></td>
        <td><strong>Power Tools</strong></td>
        <td>Log viewer & crash analyzer 2 · Mod Bisect assistant · loam CLI & URL scheme</td>
      </tr>
      <tr>
        <td>9</td>
        <td>29 Jun 2027</td>
        <td><span class="ver-badge">v2.8</span></td>
        <td><span class="code-badge">Loess</span></td>
        <td><strong>Global Reach & Accessibility</strong></td>
        <td>Localization & RTL · WCAG 2.2 AA audit · controller & handheld mode</td>
      </tr>
      <tr>
        <td>10</td>
        <td>27 Jul 2027</td>
        <td><span class="ver-badge">v3.0</span></td>
        <td><span class="code-badge">Canopy</span></td>
        <td><strong>Beyond Windows x64</strong></td>
        <td>Windows ARM64 native · macOS beta (Apple Silicon/Intel) · Linux beta</td>
      </tr>
      <tr>
        <td>11</td>
        <td>31 Aug 2027</td>
        <td><span class="ver-badge">v3.2</span></td>
        <td><span class="code-badge">Understory</span></td>
        <td><strong>Extensions & Themes</strong></td>
        <td>Extension API v1 (Wasm sandbox) · Curated Gallery · theme token engine</td>
      </tr>
      <tr>
        <td>12</td>
        <td>28 Sep 2027</td>
        <td><span class="ver-badge">v3.5</span></td>
        <td><span class="code-badge">Evergreen</span></td>
        <td><strong>Long-Term Support (LTS)</strong></td>
        <td>12-month LTS branch · independent security audit · final Polish 2.0</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2: THE MONTHLY RELEASE TRAIN -->
  <h2 class="section-title font-serif">
    <span class="section-num">02</span> The Monthly Release Train (Fixed 4-Week Rhythm)
  </h2>

  <table class="compact-table">
    <thead>
      <tr>
        <th style="width: 14%;">Cadence Week</th>
        <th style="width: 48%;">Scope of Work</th>
        <th style="width: 38%;">Measurable Exit Output</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Week 1</strong></td>
        <td><strong>Spec:</strong> Turn monthly section into plan, threat model, test plan, owner tasks</td>
        <td><code>docs/&lt;version&gt;/PLAN.md</code>, <code>THREAT_MODEL.md</code>, test fixtures</td>
      </tr>
      <tr>
        <td><strong>Weeks 2–3</strong></td>
        <td><strong>Build:</strong> Behind feature flags in small milestones; adversarial review after each</td>
        <td>Green <code>verify</code> on every merge; automated test passes</td>
      </tr>
      <tr>
        <td><strong>Week 4</strong></td>
        <td><strong>Harden & Release:</strong> RC, clean-VM tests (Win 10/11, Lite/Full), upgrade test, sign, scan</td>
        <td>Signed installer binary, release report, flags enabled</td>
      </tr>
      <tr>
        <td><strong>Post-Release</strong></td>
        <td>Hotfix window (patch releases), Minecraft-compatibility duty, support triage</td>
        <td>Patch line <code>x.y.z</code>, Known-Issues DB live updates</td>
      </tr>
    </tbody>
  </table>

  <div class="rules-grid">
    <div class="rule-card">
      <strong>1. Max 3 Headlines:</strong> Everything else is secondary and cut first if time compresses.
    </div>
    <div class="rule-card">
      <strong>2. 25% Reliability Tax:</strong> 20–30% of monthly effort is dedicated strictly to debt, bugs, and tests.
    </div>
    <div class="rule-card">
      <strong>3. Land Dark:</strong> Features ship enabled only if gates pass; otherwise flag stays dark.
    </div>
    <div class="rule-card">
      <strong>4. Mandatory Upgrade Test:</strong> Never skip verifying that prior worlds, games, and configs survive.
    </div>
    <div class="rule-card">
      <strong>5. Signed Updater First:</strong> Staged rollouts executed locally without tracking or identifiers.
    </div>
    <div class="rule-card">
      <strong>6. Signed Content Packs:</strong> Update catalog & known issues out-of-band without full re-installs.
    </div>
  </div>

  <!-- ========================================================= -->
  <!-- PAGE 2: MONTH BY MONTH — RELEASES 1 TO 6 (Q4 2026 - Q1 2027) -->
  <!-- ========================================================= -->
  <div class="page-break"></div>

  <div class="confidential-bar">
    <span>LOAM FOUNDATION · DETAILED MONTHLY SPECIFICATIONS (PART 1)</span>
    <span class="confidential-tag">● STRICTLY CONFIDENTIAL & PROPRIETARY</span>
    <span>RELEASES 1 TO 6</span>
  </div>

  <h2 class="section-title font-serif">
    <span class="section-num">03</span> Month by Month Execution (Releases 1 to 6)
  </h2>

  <div class="release-grid">
    <!-- RELEASE 1: v1.5 Humus -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v1.5</span> Humus</span>
        <span class="rc-date">27 Oct 2026</span>
      </div>
      <div class="rc-why">Eliminate SmartScreen warnings; achieve smooth open/launch/close; unblock modularity.</div>
      <ul class="rc-headlines">
        <li><strong>Signed & Verifiable Builds:</strong> Signing pipeline, publisher identity, winget manifest, Trust Ledger.</li>
        <li><strong>Smooth Lifecycle:</strong> Measurement harness, quiet gate, window detection, hardened close.</li>
        <li><strong>Code Revamp Phase 1:</strong> Strangler rewrite of core modules, state machines, math library, UI physics.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Guest account polish, dark LOAM Account backend, signed in-app updater.</span>
        <span><strong>Gate:</strong> v1.5.0 DoD pass + recorded SmartScreen reputation outcome on clean VM.</span>
        <span><strong>Owner:</strong> Code-signing cert, domain, SECURITY.md, legal review start. <strong>Risk:</strong> Scope breadth.</span>
      </div>
    </div>

    <!-- RELEASE 2: v1.6 Topsoil -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v1.6</span> Topsoil</span>
        <span class="rc-date">24 Nov 2026</span>
      </div>
      <div class="rc-why">Activate sync and cloud safety nets; establish clear architectural superiority over competitors.</div>
      <ul class="rc-headlines">
        <li><strong>LOAM Account GA:</strong> Browser auth, cloud sync (settings, games, skins, servers), export/delete.</li>
        <li><strong>Mod Guard & World Time Machine GA:</strong> Pre-launch compatibility & incremental world snapshots.</li>
        <li><strong>Servers Page GA:</strong> Saved servers, ping, compatibility chip, one-click join, servers.dat sync.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Stable/Beta channels, one-click rollback, signed content packs, patch notes.</span>
        <span><strong>Gate:</strong> Multi-device sync merge, account deletion verification, non-destructive restore.</span>
        <span><strong>Owner:</strong> Privacy policy, terms, age policy, hosting costs. <strong>Risk:</strong> Legal delays.</span>
      </div>
    </div>

    <!-- RELEASE 3: v1.8 Subsoil -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v1.8</span> Subsoil</span>
        <span class="rc-date">15 Dec 2026</span>
      </div>
      <div class="rc-why">Solve multi-game disk bloat & organization; ship early for safe holiday freeze (Dec 16–Jan 5).</div>
      <ul class="rc-headlines">
        <li><strong>Instances 2.0:</strong> Groups, tags, favorites, search; per-instance overrides (Java, RAM, env); clone.</li>
        <li><strong>Shared Content-Addressed Store:</strong> Deduplication, "What is using space" map, safe cleanup.</li>
        <li><strong>Data Folder Move:</strong> Journaled, resumable drive relocation; scheduled local backups.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Custom instance crests (Strata seeds), per-instance notes, read-only copy import.</span>
        <span><strong>Gate:</strong> Measured disk savings on test corpus; zero deletion of referenced files; power-loss recovery.</span>
        <span><strong>Holiday:</strong> Feature freeze Dec 16 to Jan 5. <strong>Risk:</strong> Store corruption edge cases.</span>
      </div>
    </div>

    <!-- RELEASE 4: v2.0 Tilth -->
    <div class="release-card accent-green">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge" style="background: var(--green);">v2.0</span> Tilth</span>
        <span class="rc-date">26 Jan 2027</span>
      </div>
      <div class="rc-why">Lift the "no mod search" limitation securely; deliver native modpack resolution.</div>
      <ul class="rc-headlines">
        <li><strong>Browse & Install:</strong> Modrinth integration (mods, packs, shaders) with sanitized project views.</li>
        <li><strong>Dependency Resolver & Update-All:</strong> Constraint backtracking, automated snapshots & rollback.</li>
        <li><strong>Mod Profiles per Instance:</strong> 1-click mod set switching; Mod Guard enforced on every install.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Optional cloud snapshots for Account holders; schema 4 data baseline migration.</span>
        <span><strong>Gate:</strong> Deterministic 30-mod install; full rollback restore; hash checks from allowlisted hosts.</span>
        <span><strong>Owner:</strong> Modrinth API terms compliance. <strong>Risk:</strong> Upstream API changes.</span>
      </div>
    </div>

    <!-- RELEASE 5: v2.1 Furrow -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v2.1</span> Furrow</span>
        <span class="rc-date">23 Feb 2027</span>
      </div>
      <div class="rc-why">Empirical evidence beats guesswork: detect real bottlenecks (GC pauses, throttling, GPU).</div>
      <ul class="rc-headlines">
        <li><strong>Session Health Report:</strong> Post-game GC pause ratio, heap pressure, GPU detection, throttling advice.</li>
        <li><strong>Evidence-Based Tuning:</strong> User-consented heap/GC recommendations; signed hardware profile table.</li>
        <li><strong>Startup Accelerator:</strong> Class-data-sharing archives where measured faster; battery/handheld profile.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Windows 11 Dev Drive hint; reduced idle memory; honest zero-fake FPS reporting rule.</span>
        <span><strong>Gate:</strong> Correct flagging of known-bad configs (tiny heap, wrong GPU); measured startup gains.</span>
        <span><strong>Owner:</strong> Multi-hardware benchmark rigs (hybrid laptop, low-end PC). <strong>Risk:</strong> Over-tuning.</span>
      </div>
    </div>

    <!-- RELEASE 6: v2.2 Terrace -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v2.2</span> Terrace</span>
        <span class="rc-date">30 Mar 2027</span>
      </div>
      <div class="rc-why">Eliminate multiplayer friction: auto-provision matching game version and mods for any server.</div>
      <ul class="rc-headlines">
        <li><strong>Server Hub:</strong> Groups, status history, Quick Play, plain-language join failure diagnostics.</li>
        <li><strong>Join & Prepare:</strong> Manifest standard (<code>loam-server.json</code>) auto-provisions matching game & mods.</li>
        <li><strong>Local Server Manager & LAN Helper:</strong> Run local dedicated server; explicit EULA prompt; LAN discovery.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Under the hood:</strong> Process supervisor (log streaming, stdin stop), firewall prompts with consent.</span>
        <span><strong>Gate:</strong> Create server, join from instance, stop gracefully, restore world; manifest fuzzing.</span>
        <span><strong>Owner:</strong> Publish server manifest specification; EULA legal audit. <strong>Risk:</strong> Malicious manifests.</span>
      </div>
    </div>
  </div>

  <!-- ========================================================= -->
  <!-- PAGE 3: MONTH BY MONTH — RELEASES 7 TO 12 (Q2 2027 - Q3 2027) -->
  <!-- ========================================================= -->
  <div class="page-break"></div>

  <div class="confidential-bar">
    <span>LOAM FOUNDATION · DETAILED MONTHLY SPECIFICATIONS (PART 2)</span>
    <span class="confidential-tag">● STRICTLY CONFIDENTIAL & PROPRIETARY</span>
    <span>RELEASES 7 TO 12</span>
  </div>

  <h2 class="section-title font-serif">
    <span class="section-num">03</span> Month by Month Execution (Releases 7 to 12)
  </h2>

  <div class="release-grid">
    <!-- RELEASE 7: v2.4 Aquifer -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v2.4</span> Aquifer</span>
        <span class="rc-date">27 Apr 2027</span>
      </div>
      <div class="rc-why">Drive organic word-of-mouth growth via skin artistry, creator utilities, and streaming tools.</div>
      <ul class="rc-headlines">
        <li><strong>Skin Studio 2:</strong> Pixel editor with layers, symmetry, undo/redo, slim/classic, cape/elytra preview.</li>
        <li><strong>Private Share Links:</strong> Share instance recipes or skins; private by default; non-enumerable tokens.</li>
        <li><strong>Screenshots & Streamer Mode:</strong> Mask account email, server IPs, and file paths; Discord RPC opt-in.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Under the hood:</strong> Editor undo/redo property tests, PNG validation fuzzing, abuse reporting workflow.</span>
        <span><strong>Gate:</strong> Share link privacy verified; rate limiting active; moderation contacts established.</span>
        <span><strong>Owner:</strong> Moderation policy; translator recruitment call for v2.8. <strong>Risk:</strong> Moderation volume.</span>
      </div>
    </div>

    <!-- RELEASE 8: v2.6 Seam -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v2.6</span> Seam</span>
        <span class="rc-date">25 May 2027</span>
      </div>
      <div class="rc-why">Provide deep technical diagnostics without forcing users into third-party command-line utilities.</div>
      <ul class="rc-headlines">
        <li><strong>Log Viewer & Crash Analyzer 2:</strong> Live logs, search, level coloring, mod attribution of stack traces.</li>
        <li><strong>Mod Bisect Assistant:</strong> Automated binary search disabling half of mods to isolate crashing culprits.</li>
        <li><strong>loam CLI & loam:// URL Scheme:</strong> Scriptable launch, list, export, doctor with strict user prompts.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> JVM presets editor with dry-run check, instance diff, optional pre/post launch hooks.</span>
        <span><strong>Gate:</strong> Bisect locates planted bad mod in expected iterations; CLI golden tests pass; hooks guarded.</span>
        <span><strong>Owner:</strong> Book external security auditor for v3.5. <strong>Risk:</strong> Malicious hook imports.</span>
      </div>
    </div>

    <!-- RELEASE 9: v2.8 Loess -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v2.8</span> Loess</span>
        <span class="rc-date">29 Jun 2027</span>
      </div>
      <div class="rc-why">Universal reach: expand LOAM to every player regardless of language, accessibility, or device.</div>
      <ul class="rc-headlines">
        <li><strong>Localization & RTL:</strong> ICU message format, 10–12 languages with right-to-left support & CI checks.</li>
        <li><strong>Accessibility Audit:</strong> Narrator/NVDA passes, full keyboard map, 200%+ text zoom, high-contrast mode.</li>
        <li><strong>Controller & Handheld Mode:</strong> Gamepad navigation, 10-foot UI, on-screen keyboard, Steam Deck profile.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Onboarding 2 (<=3 clicks to Play); ARM64 cross-platform preparation.</span>
        <span><strong>Gate:</strong> WCAG 2.2 AA verified, axe-core clean, RTL layout test passes with +40% string expansion.</span>
        <span><strong>Owner:</strong> Translation platform decision & string freezes. <strong>Risk:</strong> Translation quality.</span>
      </div>
    </div>

    <!-- RELEASE 10: v3.0 Canopy -->
    <div class="release-card accent-charcoal">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge" style="background: var(--charcoal);">v3.0</span> Canopy</span>
        <span class="rc-date">27 Jul 2027</span>
      </div>
      <div class="rc-why">Break free of Windows x64 lock-in; establish multi-platform desktop leadership.</div>
      <ul class="rc-headlines">
        <li><strong>Windows ARM64 Native:</strong> Zero emulation overhead for Snapdragon X Elite and Surface devices.</li>
        <li><strong>macOS Beta (Universal):</strong> Apple Silicon & Intel, signed/notarized, macOS QoS thread priority.</li>
        <li><strong>Linux Beta:</strong> AppImage & .deb, Wayland/X11 compatibility, distribution-specific Doctor checks.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Under the hood:</strong> Native credential vaults (Win Credential Mgr, Keychain, Secret Service), multi-OS CI.</span>
        <span><strong>Gate:</strong> Tier-1 real launches verified on all 3 OSes; clean-machine installs; betas clearly tagged.</span>
        <span><strong>Owner:</strong> Apple Developer notarization setup, test hardware provision. <strong>Risk:</strong> Support overhead.</span>
      </div>
    </div>

    <!-- RELEASE 11: v3.2 Understory -->
    <div class="release-card">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge">v3.2</span> Understory</span>
        <span class="rc-date">31 Aug 2027</span>
      </div>
      <div class="rc-why">Deliver modular extensibility without compromising LOAM's zero-trust privacy guarantee.</div>
      <ul class="rc-headlines">
        <li><strong>Extension API v1:</strong> Sandboxed WebAssembly plugins with explicit capabilities (no net/disk by default).</li>
        <li><strong>Curated Gallery:</strong> Reviewed & signed packages, permission review prompts, instant offline revocation.</li>
        <li><strong>Theme Engine:</strong> CSS token community themes with automated contrast and dark-mode validation.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Under the hood:</strong> Capability security model, Wasm CPU/memory budgets, Trust Ledger event tracking.</span>
        <span><strong>Gate:</strong> Internal red-team sandbox escape tests; zero access to credentials or system tokens.</span>
        <span><strong>Owner:</strong> Extension review policy and curator staffing. <strong>Risk:</strong> Sandbox escape exploits.</span>
      </div>
    </div>

    <!-- RELEASE 12: v3.5 Evergreen -->
    <div class="release-card accent-green">
      <div class="rc-header">
        <span class="rc-title"><span class="ver-badge" style="background: var(--green);">v3.5</span> Evergreen</span>
        <span class="rc-date">28 Sep 2027</span>
      </div>
      <div class="rc-why">Culmination of the 12-month engineering journey: rock-solid long-term support.</div>
      <ul class="rc-headlines">
        <li><strong>LTS Branch:</strong> 12 months of guaranteed security & Minecraft compatibility maintenance.</li>
        <li><strong>Independent Security Audit:</strong> Full third-party review of auth, updater, loopback, and Wasm sandbox.</li>
        <li><strong>Polish 2.0:</strong> Final performance budgets, schema freeze, removal of legacy shims, accessibility re-audit.</li>
      </ul>
      <div class="rc-footer-meta">
        <span><strong>Also:</strong> Local-only "Year in Review" stats (zero upload); public 2028 roadmap publication.</span>
        <span><strong>Gate:</strong> 100% of audit findings closed; 24-hour stability soak; upgrade test from all releases since v1.5.</span>
        <span><strong>Owner:</strong> Audit closure sign-off; LTS policy publication. <strong>Risk:</strong> Late audit remediations.</span>
      </div>
    </div>
  </div>

  <!-- ========================================================= -->
  <!-- PAGE 4: GOVERNANCE, QUALITY TRACKS, MEASURES & RISKS      -->
  <!-- ========================================================= -->
  <div class="page-break"></div>

  <div class="confidential-bar">
    <span>LOAM FOUNDATION · GOVERNANCE, QUALITY TRACKS & RISK REGISTER</span>
    <span class="confidential-tag">● STRICTLY CONFIDENTIAL & PROPRIETARY</span>
    <span>PAGE 4 OF 4</span>
  </div>

  <!-- SECTION 4: STANDING TRACKS -->
  <h2 class="section-title font-serif">
    <span class="section-num">04</span> Standing Tracks (Run Concurrently Every Month)
  </h2>

  <table class="compact-table">
    <thead>
      <tr>
        <th style="width: 15%;">Standing Track</th>
        <th style="width: 85%;">Ongoing Operational Mandate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Quality</strong></td>
        <td>Expand automated tests by risk; maintain flaky test rate &lt;1%; mutation tests on core; green <code>verify</code> before every merge.</td>
      </tr>
      <tr>
        <td><strong>Performance</strong></td>
        <td>Smoothness scenarios and startup budgets evaluated on every RC; zero speed regression allowed without formal rationale.</td>
      </tr>
      <tr>
        <td><strong>Security</strong></td>
        <td>Dependency audits (<code>cargo audit</code>, <code>cargo deny</code>, npm), secret scans, WebView2 tracking, 72-hour critical fix SLA.</td>
      </tr>
      <tr>
        <td><strong>Trust</strong></td>
        <td>Signed builds, published SHA-256 hashes, forbidden-string checks, Trust Ledger instrumentation for all network events.</td>
      </tr>
      <tr>
        <td><strong>Compatibility</strong></td>
        <td>New Minecraft & loader releases in catalog &lt;24 hours; Tier-2 automated checks &lt;72 hours; matrix regenerated.</td>
      </tr>
      <tr>
        <td><strong>Support & Docs</strong></td>
        <td>Known-Issues DB updated from reports; changelogs, signed release notes, and documentation refreshed with every train.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5: SUCCESS MEASURES -->
  <h2 class="section-title font-serif">
    <span class="section-num">05</span> Empirical Success Measures (Zero Telemetry)
  </h2>

  <table class="compact-table">
    <thead>
      <tr>
        <th style="width: 32%;">Metric / Measure</th>
        <th style="width: 25%;">Target Threshold</th>
        <th style="width: 43%;">Measurement Methodology</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Real-Launch Matrix Success</td>
        <td><strong>≥ 99.0%</strong></td>
        <td>Lab test runs across Tier-1 combinations on every RC</td>
      </tr>
      <tr>
        <td>Fresh Install to First Play</td>
        <td><strong>≤ 3 Minutes</strong></td>
        <td>Scripted clean-VM run over typical consumer connection</td>
      </tr>
      <tr>
        <td>Cold Start to Usable Window</td>
        <td><strong>≤ 900 ms</strong></td>
        <td>Smoothness harness profiling on mid-range hardware</td>
      </tr>
      <tr>
        <td>Idle Background Memory</td>
        <td><strong>≤ Previous Release</strong></td>
        <td>Smoothness harness home-screen memory measurement</td>
      </tr>
      <tr>
        <td>Update Download Success</td>
        <td><strong>≥ 98.0%</strong></td>
        <td>Release server aggregate counter (zero user tracking)</td>
      </tr>
      <tr>
        <td>Time to Remediate Critical P0</td>
        <td><strong>≤ 72 Hours</strong></td>
        <td>Internal security SLA & issue tracker timestamp</td>
      </tr>
      <tr>
        <td>Open P0 Defects at Launch</td>
        <td><strong>0 Blocking</strong></td>
        <td>Strict release gate requirement</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 6 & 7: CALENDAR & RISK REGISTER -->
  <div style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px; margin-bottom: 8px;">
    <!-- OWNER CALENDAR -->
    <div>
      <h2 class="section-title font-serif" style="margin-top: 4px;">
        <span class="section-num">06</span> Owner Calendar
      </h2>
      <table class="compact-table">
        <thead>
          <tr>
            <th style="width: 28%;">Month</th>
            <th>Required Owner Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Oct 2026</strong></td>
            <td>Signing cert, domain, SECURITY.md, legal review</td>
          </tr>
          <tr>
            <td><strong>Nov 2026</strong></td>
            <td>Approve privacy/terms/age, server costs, MS OAuth</td>
          </tr>
          <tr>
            <td><strong>Dec 2026</strong></td>
            <td>Holiday coverage, decide cloud snapshot quota</td>
          </tr>
          <tr>
            <td><strong>Jan 2027</strong></td>
            <td>Review Modrinth API terms, mod sources</td>
          </tr>
          <tr>
            <td><strong>Feb 2027</strong></td>
            <td>Provide low-end & hybrid benchmark hardware</td>
          </tr>
          <tr>
            <td><strong>Mar 2027</strong></td>
            <td>Publish server-manifest spec, EULA check</td>
          </tr>
          <tr>
            <td><strong>Apr 2027</strong></td>
            <td>Moderation policy & contact, recruit translators</td>
          </tr>
          <tr>
            <td><strong>May 2027</strong></td>
            <td>Apple Dev Program, ARM64 hardware, <strong>book auditor</strong></td>
          </tr>
          <tr>
            <td><strong>Jun–Jul</strong></td>
            <td>Translation review, Linux packaging decisions</td>
          </tr>
          <tr>
            <td><strong>Aug–Sep</strong></td>
            <td>Extension review staffing, audit closure, LTS policy</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TOP RISKS -->
    <div>
      <h2 class="section-title font-serif" style="margin-top: 4px;">
        <span class="section-num">07</span> Top Risk Register & Mitigations
      </h2>
      <table class="compact-table">
        <thead>
          <tr>
            <th style="width: 28%;">Primary Risk</th>
            <th>Proactive Engineering Mitigation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Scope Overrun</strong></td>
            <td>3 headlines max; features land dark behind flags; slip rule.</td>
          </tr>
          <tr>
            <td><strong>SmartScreen Flags</strong></td>
            <td>EV signing, winget distribution, clean submissions, honest advice.</td>
          </tr>
          <tr>
            <td><strong>Legal Exposure</strong></td>
            <td>Professional legal counsel, no bypasses, flags off until signed.</td>
          </tr>
          <tr>
            <td><strong>Backend Breach</strong></td>
            <td>Managed identity provider, zero unnecessary data, Wasm sandbox audit.</td>
          </tr>
          <tr>
            <td><strong>Bandwidth Costs</strong></td>
            <td>Quotas, opt-in cloud snapshots, quarterly financial reviews.</td>
          </tr>
          <tr>
            <td><strong>Minecraft Churn</strong></td>
            <td>Nightly contract tests, 24-hr catalog duty, signed content packs.</td>
          </tr>
          <tr>
            <td><strong>Sync Data Loss</strong></td>
            <td>Review sheet on first sync, local backups, HLC merge tests.</td>
          </tr>
          <tr>
            <td><strong>Wasm Sandbox Escape</strong></td>
            <td>Zero-trust capabilities, red-team review, independent 3rd-party audit.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- SECTION 8 & 9: SUMMARY FOOTER -->
  <div class="footer-summary-grid">
    <div class="summary-card">
      <div class="summary-card-title">
        <span style="color: var(--terracotta);">✦</span> Non-Goals & Ethical Guardrails
      </div>
      <div>
        <strong>Uncompromising Stance:</strong> Zero ads, zero telemetry, zero paywalls on core features, zero bundling of Mojang-owned proprietary files, zero mod redistribution, and zero authentication bypasses. LOAM exists to uphold user sovereignty and clean software engineering.
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-card-title">
        <span style="color: var(--green);">✦</span> Codex Brief Protocol & Capacity Check
      </div>
      <div>
        <strong>Standard Prompt:</strong> Write <code>docs/&lt;version&gt;/BRIEF.md</code> using the v1.4/v1.5 structure: goals, honesty rules, ledger, findings, milestones, DoD, owner tasks, and risks. If capacity tightens, drop secondary items first, then defer Headline 3. Hardening week is inviolable.
      </div>
    </div>
  </div>

</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML written to {HTML_PATH}")

# Render to PDF using Headless Edge
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

print(f"Executing Headless Edge from: {edge_path}...")
cmd = [
    edge_path,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={PDF_PATH}",
    HTML_PATH
]

res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0 and os.path.exists(PDF_PATH):
    print(f"SUCCESS! Master Roadmap PDF generated at: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes)")
else:
    print(f"Edge execution error: {res.stderr}")
