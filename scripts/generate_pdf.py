import os
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
os.makedirs(DIST_DIR, exist_ok=True)

ICON_PATH = os.path.join(PROJECT_ROOT, "src-tauri", "icons", "icon.png")
import base64
with open(ICON_PATH, "rb") as f:
    icon_b64 = base64.b64encode(f.read()).decode("utf-8")

HTML_PATH = os.path.join(DIST_DIR, "LOAM_Application_Brief.html")
PDF_PATH = os.path.join(DIST_DIR, "LOAM_Application_Brief.pdf")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LOAM Launcher — Comprehensive Application Brief</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {{
      size: A4;
      margin: 14mm 14mm 16mm 14mm;
      @bottom-right {{
        content: "Page " counter(page);
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 8pt;
        color: #8C8982;
      }}
      @bottom-left {{
        content: "LOAM · PRIVATE & CONFIDENTIAL";
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 8pt;
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
      line-height: 1.55;
      font-size: 9.5pt;
      padding: 0;
    }}

    .font-serif {{
      font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
    }}

    .font-mono {{
      font-family: 'JetBrains Mono', Consolas, monospace;
    }}

    /* Layout Containers */
    .container {{
      max-width: 100%;
      margin: 0 auto;
    }}

    .avoid-break {{
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }}

    .page-break {{
      page-break-before: always;
      break-before: page;
    }}

    /* Header Masthead */
    .confidential-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 14px;
      border-bottom: 1.5px solid var(--charcoal);
      font-size: 7.5pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--muted);
    }}

    .confidential-tag {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      background: var(--terracotta-soft);
      color: var(--terracotta);
      border: 1px solid var(--terracotta);
      border-radius: 4px;
    }}

    .header-hero {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 16px 20px;
      background: var(--sandstone);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 18px;
    }}

    .header-text h1 {{
      font-size: 24pt;
      font-weight: 700;
      line-height: 1.1;
      color: var(--charcoal);
      letter-spacing: -0.02em;
    }}

    .header-text .subtitle {{
      font-size: 11pt;
      color: var(--terracotta);
      font-weight: 600;
      margin-top: 4px;
      letter-spacing: -0.01em;
    }}

    .header-text .summary {{
      font-size: 9pt;
      color: var(--muted);
      margin-top: 8px;
      line-height: 1.45;
      max-width: 540px;
    }}

    .header-icon-box {{
      width: 72px;
      height: 72px;
      min-width: 72px;
      border-radius: 16px;
      background: var(--terracotta);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(193, 95, 60, 0.25);
      border: 1.5px solid rgba(255, 255, 255, 0.4);
    }}

    .header-icon-box img {{
      width: 56px;
      height: 56px;
      object-fit: contain;
    }}

    /* Section Styling */
    h2.section-title {{
      font-size: 13pt;
      font-weight: 700;
      color: var(--charcoal);
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 18px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border);
      letter-spacing: -0.01em;
    }}

    h2.section-title .section-num {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      color: var(--terracotta);
      background: var(--terracotta-soft);
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
    }}

    h3.pillar-title {{
      font-size: 10.5pt;
      font-weight: 700;
      color: var(--charcoal);
      margin-top: 10px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    p {{
      margin-bottom: 8px;
      color: #33322E;
    }}

    /* Grid cards for Philosophy */
    .cards-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }}

    .card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
    }}

    .card-title {{
      font-size: 9pt;
      font-weight: 700;
      color: var(--charcoal);
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .card-desc {{
      font-size: 8pt;
      color: var(--muted);
      line-height: 1.4;
    }}

    /* Architecture Block */
    .arch-container {{
      background: #1C1C19;
      color: #FAF9F6;
      border-radius: 10px;
      padding: 12px 16px;
      margin: 12px 0;
      border: 1px solid #33322D;
    }}

    .arch-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }}

    .arch-box {{
      background: #252522;
      border: 1px solid #3A3A34;
      border-radius: 6px;
      padding: 8px 10px;
    }}

    .arch-box-title {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      color: var(--terracotta);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .arch-box-list {{
      list-style: none;
      font-size: 7.8pt;
      color: #D6D3CC;
      line-height: 1.45;
    }}

    .arch-box-list li::before {{
      content: "• ";
      color: var(--terracotta);
    }}

    /* Feature Pillar list */
    .pillar-card {{
      background: var(--card-bg);
      border-left: 3px solid var(--terracotta);
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      border-radius: 0 8px 8px 0;
      padding: 9px 12px;
      margin-bottom: 9px;
    }}

    ul.bullet-list {{
      list-style-type: none;
      margin-left: 0;
      margin-top: 4px;
    }}

    ul.bullet-list li {{
      position: relative;
      padding-left: 14px;
      margin-bottom: 3px;
      font-size: 8.5pt;
      color: #383632;
    }}

    ul.bullet-list li strong {{
      color: var(--charcoal);
    }}

    ul.bullet-list li::before {{
      content: "▪";
      position: absolute;
      left: 0;
      color: var(--terracotta);
      font-size: 8pt;
      top: -1px;
    }}

    /* Tables */
    table.data-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
      background: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }}

    table.data-table th {{
      background: var(--card-alt);
      color: var(--charcoal);
      font-weight: 700;
      text-align: left;
      padding: 7px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 8pt;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }}

    table.data-table td {{
      padding: 7px 12px;
      border-bottom: 1px solid rgba(221, 216, 205, 0.6);
      color: #383632;
    }}

    table.data-table tr:last-child td {{
      border-bottom: none;
    }}

    /* Lifecycle Steps */
    .lifecycle-list {{
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin: 10px 0;
    }}

    .lifecycle-item {{
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
    }}

    .step-badge {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      font-weight: 700;
      color: var(--alabaster);
      background: var(--terracotta);
      width: 22px;
      height: 22px;
      min-width: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }}

    .step-content strong {{
      font-size: 8.8pt;
      color: var(--charcoal);
    }}

    .step-content p {{
      margin: 0;
      font-size: 8.2pt;
      color: var(--muted);
    }}

    /* Document Footer */
    .doc-footer {{
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: var(--muted);
      font-family: 'JetBrains Mono', monospace;
    }}
  </style>
</head>
<body>

  <div class="container">

    <!-- PAGE 1 -->
    <!-- Confidentiality Header -->
    <div class="confidential-bar">
      <span>LOAM LAUNCHER · ARCHITECTURAL SPECIFICATION</span>
      <span class="confidential-tag">● STRICTLY PRIVATE & CONFIDENTIAL</span>
      <span>INTERNAL USE ONLY</span>
    </div>

    <!-- Header Hero Banner with Official Icon -->
    <div class="header-hero">
      <div class="header-text">
        <h1 class="font-serif">LOAM Launcher</h1>
        <div class="subtitle">Comprehensive Application & Architecture Brief</div>
        <div class="summary">
          A high-performance, offline-first Minecraft launcher engineered for players who demand absolute privacy, instantaneous startup times, and total control over their game environment. Built with a <strong>Rust core</strong> and a <strong>Tauri v2</strong> framework, eliminating launcher bloat, telemetry, and background tracking in favor of a sandboxed, resilient game orchestration platform wrapped in a handcrafted Scandinavian editorial aesthetic.
        </div>
      </div>
      <div class="header-icon-box">
        <img src="data:image/png;base64,{icon_b64}" alt="LOAM Emblem" />
      </div>
    </div>

    <!-- 1. Product Philosophy & Core Ethos -->
    <h2 class="section-title font-serif">
      <span class="section-num">01</span> Product Philosophy & Core Ethos
    </h2>
    <div class="cards-grid">
      <div class="card">
        <div class="card-title">
          <span style="color: var(--terracotta);">⚡</span> Lightweight & High-Velocity
        </div>
        <div class="card-desc">
          Instant cold start with a sub-5 MB executable footprint, replacing electron-heavy launchers with native system webviews and asynchronous Rust threads.
        </div>
      </div>
      <div class="card">
        <div class="card-title">
          <span style="color: var(--green);">🛡️</span> Offline-First & Sovereign
        </div>
        <div class="card-desc">
          Fully playable offline without persistent network checks. Your profiles, configurations, and game files remain strictly local and private.
        </div>
      </div>
      <div class="card">
        <div class="card-title">
          <span style="color: var(--charcoal);">🔒</span> Zero Telemetry
        </div>
        <div class="card-desc">
          No user analytics, no background tracking, no crash telemetry sent to remote servers. All telemetry is retained strictly on your machine.
        </div>
      </div>
      <div class="card">
        <div class="card-title">
          <span style="color: var(--terracotta);">🏺</span> Warm Brutalist Aesthetic
        </div>
        <div class="card-desc">
          Moves away from neon gamer aesthetics toward tactile, editorial Scandinavian craft—featuring warm parchment backdrops, terracotta clay accents, and real-time procedural sound effects.
        </div>
      </div>
    </div>

    <!-- 2. Technical Architecture & Stack -->
    <h2 class="section-title font-serif">
      <span class="section-num">02</span> Technical Architecture & Stack
    </h2>

    <div class="arch-container avoid-break">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #33322D; padding-bottom: 6px;">
        <span class="font-mono" style="font-size: 8pt; color: var(--terracotta); font-weight: 700;">SYSTEM COMPONENT MAP</span>
        <span class="font-mono" style="font-size: 7.5pt; color: #8C8982;">RUST CORE + TAURI V2 IPC BRIDGE</span>
      </div>

      <div class="arch-grid">
        <div class="arch-box">
          <div class="arch-box-title">NATIVE RUST CORE (src-tauri)</div>
          <ul class="arch-box-list">
            <li><strong>Engine:</strong> Process builder & native classpath formulation</li>
            <li><strong>Catalog:</strong> Mojang, Fabric, & Quilt upstream meta resolvers</li>
            <li><strong>Network:</strong> Parallel chunk downloader with SHA-1 checks</li>
            <li><strong>Skins:</strong> Era-compliant dynamic pack.mcmeta generator</li>
            <li><strong>Windows Perf:</strong> High-priority scheduling & CPU affinity</li>
            <li><strong>Diagnostics:</strong> LOAM Doctor automated crash triage engine</li>
          </ul>
        </div>
        <div class="arch-box">
          <div class="arch-box-title">FRONTEND CLIENT (src)</div>
          <ul class="arch-box-list">
            <li><strong>React & TypeScript:</strong> Modular state & reactive panels</li>
            <li><strong>Tauri IPC Bridge:</strong> Type-safe asynchronous command calls</li>
            <li><strong>Procedural Audio:</strong> Web Audio synthesis (sound.ts)</li>
            <li><strong>Tactile Design:</strong> Non-modal sliding configuration sheets</li>
            <li><strong>SkinStudio:</strong> 3D avatar preview & instant skin injection</li>
            <li><strong>Context Guard:</strong> Protected right-click with native text inputs</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- PAGE BREAK FOR CLEAN SECTION 3 READABILITY -->
    <div class="page-break"></div>

    <!-- Confidential Header on Page 2 -->
    <div class="confidential-bar">
      <span>LOAM LAUNCHER · CORE FEATURE PILLARS</span>
      <span class="confidential-tag">● STRICTLY PRIVATE & CONFIDENTIAL</span>
      <span>PAGE 2</span>
    </div>

    <!-- 3. Core Feature Pillars -->
    <h2 class="section-title font-serif">
      <span class="section-num">03</span> Core Feature Pillars
    </h2>

    <!-- A. Game Engine -->
    <div class="pillar-card avoid-break">
      <h3 class="pillar-title font-serif">A. Game Engine & Mod Loader Orchestration</h3>
      <ul class="bullet-list">
        <li><strong>Vanilla Minecraft Ecosystem:</strong> Seamless synchronization with official Mojang manifests to install releases, snapshots, historical versions, and experimental builds.</li>
        <li><strong>Native Modded Loaders (Fabric & Quilt):</strong> Full upstream meta-catalog integration. Automatically queries upstream loader APIs, resolves game-version intermediary mappings, and downloads all required maven dependencies.</li>
        <li><strong>Safe Parallel Downloader:</strong> Multi-threaded parallel asset downloading with retry backoff, SHA-1 cryptographic validation, and automatic healing of truncated or zero-byte cached files.</li>
      </ul>
    </div>

    <!-- B. Java Runtime -->
    <div class="pillar-card avoid-break">
      <h3 class="pillar-title font-serif">B. Intelligent Java Runtime Management</h3>
      <ul class="bullet-list">
        <li><strong>Automated Runtime Sandboxing:</strong> Automatically maps game versions to their required Java environment (Java 8, 17, 21, or 25) and downloads sandboxed Adoptium / Eclipse Temurin builds directly into LOAM's private cache.</li>
        <li><strong>Zero System Pollution:</strong> Does not overwrite or alter system-wide <code>PATH</code> or environment variables.</li>
        <li><strong>Flexible Java Overrides:</strong> Allows switching between LOAM-Managed Java and custom system Java installations per game instance.</li>
        <li><strong>Tuned JVM Profiling:</strong> Interactive memory allocation slider (RAM control) and pre-configured G1GC garbage collection parameters designed to prevent in-game memory stuttering.</li>
      </ul>
    </div>

    <!-- C. Authentication -->
    <div class="pillar-card avoid-break">
      <h3 class="pillar-title font-serif">C. Dual Authentication & Privacy Architecture</h3>
      <ul class="bullet-list">
        <li><strong>Offline Profile Engine:</strong> Instant profile creation with custom usernames, offline UUID generation, and seamless local player state persistence.</li>
        <li><strong>Official Microsoft OAuth2 Integration:</strong> Secure, official Microsoft authentication workflow with automated Xbox Live token refresh.</li>
        <li><strong>Local Data Storage:</strong> Credentials and tokens are stored securely in local app storage without intermediate proxy servers.</li>
      </ul>
    </div>

    <!-- D. SkinStudio -->
    <div class="pillar-card avoid-break">
      <h3 class="pillar-title font-serif">D. SkinStudio & Universal Era Compatibility</h3>
      <ul class="bullet-list">
        <li><strong>Offline Skin Injection:</strong> Apply custom <code>.png</code> skins directly to offline accounts without requiring an active Mojang account.</li>
        <li><strong>Universal pack.mcmeta Generation:</strong> Bridges custom offline skins directly into the game using dynamically generated resource packs that conform to Minecraft's format standards across all version eras (historic formats, modern formats 15–64, and bleeding-edge releases requiring <code>min_format</code> and <code>max_format</code> definitions).</li>
        <li><strong>Integrated Skin Studio:</strong> Real-time preview of player skins, slim/classic model switching, and one-click application.</li>
      </ul>
    </div>

    <!-- E. Windows Performance -->
    <div class="pillar-card avoid-break">
      <h3 class="pillar-title font-serif">E. Windows Performance Engine (windows_perf.rs)</h3>
      <ul class="bullet-list">
        <li><strong>Process Priority Optimization:</strong> Elevates game process priority to <code>HIGH_PRIORITY_CLASS</code> upon launch to reduce frame drops caused by background Windows processes.</li>
        <li><strong>Thread Affinity & Boost:</strong> Ensures Minecraft threads take full advantage of performance cores while minimizing background worker interference.</li>
        <li><strong>Post-Launch Memory Trimming:</strong> Minimizes launcher background RAM consumption while the game is running, freeing system memory for the Minecraft JVM.</li>
      </ul>
    </div>

    <!-- F. Diagnostics -->
    <div class="pillar-card avoid-break">
      <h3 class="pillar-title font-serif">F. LOAM Doctor & Automated Crash Diagnostics</h3>
      <ul class="bullet-list">
        <li><strong>Integrated Health Check:</strong> Evaluates system disk space, read/write permissions, Java runtime integrity, and network connectivity before launch.</li>
        <li><strong>Intelligent Crash Triage:</strong> Automatically detects JVM crashes, uncaught game exceptions, and missing native libraries upon exit.</li>
        <li><strong>One-Click Diagnostic Export:</strong> Bundles system specs, OS build, memory state, active loader details, and full launcher logs into an anonymized ZIP diagnostic archive ready for troubleshooting.</li>
      </ul>
    </div>

    <!-- PAGE BREAK FOR CLEAN SECTION 4 & 5 -->
    <div class="page-break"></div>

    <!-- Confidential Header on Page 3 -->
    <div class="confidential-bar">
      <span>LOAM LAUNCHER · UX & OPERATIONAL LIFECYCLE</span>
      <span class="confidential-tag">● STRICTLY PRIVATE & CONFIDENTIAL</span>
      <span>PAGE 3</span>
    </div>

    <!-- 4. User Experience & Interface Design -->
    <h2 class="section-title font-serif">
      <span class="section-num">04</span> User Experience & Interface Design
    </h2>

    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="width: 28%;">Interface Element</th>
          <th>Implementation & Aesthetic Rationale</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Colorway</strong></td>
          <td>Warm Sandstone (<code>#EFECE6</code>), Alabaster (<code>#FAF9F6</code>), Deep Charcoal (<code>#1D1D1B</code>), and Terracotta Clay (<code>#E05A47</code> / <code>#C15F3C</code>). Evokes tactile paper craft and Scandinavian brutalism.</td>
        </tr>
        <tr>
          <td><strong>Typography</strong></td>
          <td>Serif editorial headings (Newsreader / Georgia) paired with precise monospace data readouts (JetBrains Mono / Consolas) and clean sans-serif navigation (Plus Jakarta Sans).</td>
        </tr>
        <tr>
          <td><strong>Tactile Controls</strong></td>
          <td>High-contrast beveled buttons, physical-feel toggle switches, dynamic input fields with custom native context menu passthrough for seamless clipboard copying and pasting.</td>
        </tr>
        <tr>
          <td><strong>Sliding Drawers</strong></td>
          <td>Non-modal, edge-docked configuration sheets for game settings, account switching, version selection, and skin management, preserving navigation context.</td>
        </tr>
        <tr>
          <td><strong>Acoustic Feedback</strong></td>
          <td>Synthesized mechanical micro-clicks on navigation, resonant wooden tone on installation complete, and a signature low-frequency harmonic surge on game launch.</td>
        </tr>
      </tbody>
    </table>

    <!-- 5. End-to-End Operational Lifecycle -->
    <h2 class="section-title font-serif">
      <span class="section-num">05</span> End-to-End Operational Lifecycle
    </h2>

    <div class="lifecycle-list avoid-break">
      <div class="lifecycle-item">
        <div class="step-badge">1</div>
        <div class="step-content">
          <strong>Setup & Provisioning:</strong>
          <p>The custom single-binary installer extracts LOAM into <code>%LOCALAPPDATA%\Programs\LOAM</code>, registers shortcuts and file associations without polluting system directories.</p>
        </div>
      </div>
      <div class="lifecycle-item">
        <div class="step-badge">2</div>
        <div class="step-content">
          <strong>Version & Loader Selection:</strong>
          <p>Choose any vanilla Minecraft release or select a Fabric/Quilt loader combination from the version selector with real-time upstream catalog synchronization.</p>
        </div>
      </div>
      <div class="lifecycle-item">
        <div class="step-badge">3</div>
        <div class="step-content">
          <strong>Automated Dependency Resolution:</strong>
          <p>LOAM validates local cache, downloads missing assets, pulls required intermediary libraries, and fetches the appropriate sandboxed JDK runtime.</p>
        </div>
      </div>
      <div class="lifecycle-item">
        <div class="step-badge">4</div>
        <div class="step-content">
          <strong>Process Execution & Win32 Tuning:</strong>
          <p>Constructs the full classpath, binds custom JVM parameters, applies Windows <code>HIGH_PRIORITY_CLASS</code> and thread affinities, and spawns the game.</p>
        </div>
      </div>
      <div class="lifecycle-item">
        <div class="step-badge">5</div>
        <div class="step-content">
          <strong>Monitoring & Triage:</strong>
          <p>Streams game console logs in real time; if an error occurs, LOAM Doctor parses the stack trace and presents an actionable recovery plan with anonymized export.</p>
        </div>
      </div>
    </div>

    <!-- Document Footer -->
    <div class="doc-footer">
      <span>LOAM ARCHITECTURAL BRIEF · PROPRIETARY SPECIFICATION</span>
      <span>CONFIDENTIAL · DO NOT DISTRIBUTE</span>
      <span>DOCUMENT REF: LOAM-SPEC-2026-A1</span>
    </div>

  </div>

</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML written to {HTML_PATH}")

# Render to PDF using Microsoft Edge Headless
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
    print(f"SUCCESS! Professional PDF generated at: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes)")
else:
    print(f"Edge execution error: {res.stderr}")
