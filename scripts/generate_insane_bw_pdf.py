import os
import subprocess
import base64

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
os.makedirs(DIST_DIR, exist_ok=True)

ARTIFACT_DIR = r"C:\Users\Dhyan\.gemini\antigravity\brain\e2a2d452-0001-448e-82f9-5f43a1967f24"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

HTML_PATH = os.path.join(DIST_DIR, "LOAM_Application_Brief_BW_Print.html")
PDF_PATH = os.path.join(DIST_DIR, "LOAM_Application_Brief_BW_Print.pdf")
ARTIFACT_PDF_PATH = os.path.join(ARTIFACT_DIR, "LOAM_Application_Brief_BW_Print.pdf")

# Read fonts
GEIST_PATH = os.path.join(PROJECT_ROOT, "node_modules", "@fontsource-variable", "geist", "files", "geist-latin-wght-normal.woff2")
GEIST_MONO_PATH = os.path.join(PROJECT_ROOT, "node_modules", "@fontsource-variable", "geist-mono", "files", "geist-mono-latin-wght-normal.woff2")

with open(GEIST_PATH, "rb") as f:
    geist_b64 = base64.b64encode(f.read()).decode("utf-8")

with open(GEIST_MONO_PATH, "rb") as f:
    geist_mono_b64 = base64.b64encode(f.read()).decode("utf-8")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LOAM Launcher — Master Application Brief</title>
  <style>
    @font-face {{
      font-family: 'Geist';
      src: url('data:font/woff2;base64,{geist_b64}') format('woff2');
      font-weight: 100 900;
      font-style: normal;
      font-display: block;
    }}

    @font-face {{
      font-family: 'Geist Mono';
      src: url('data:font/woff2;base64,{geist_mono_b64}') format('woff2');
      font-weight: 100 900;
      font-style: normal;
      font-display: block;
    }}

    @page {{
      size: A4 portrait;
      margin: 11mm 13mm 11mm 13mm;
      @bottom-right {{
        content: "PAGE " counter(page) " OF " counter(pages);
        font-family: 'Geist Mono', Consolas, monospace;
        font-size: 7pt;
        font-weight: 700;
        color: #000000;
      }}
      @bottom-left {{
        content: "LOAM LAUNCHER • OFFICIAL APPLICATION BRIEF • CONFIDENTIAL";
        font-family: 'Geist Mono', Consolas, monospace;
        font-size: 7pt;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: #000000;
      }}
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    body {{
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 8.4pt;
      line-height: 1.38;
      color: #000000;
      background-color: #FFFFFF;
      letter-spacing: -0.01em;
    }}

    .mono {{
      font-family: 'Geist Mono', Consolas, monospace;
    }}

    .page-break {{
      page-break-after: always;
      break-after: page;
    }}

    .avoid-break {{
      page-break-inside: avoid;
      break-inside: avoid;
    }}

    /* Header */
    .doc-header {{
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }}

    .header-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .brand-group {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .brand-mark {{
      width: 36px;
      height: 36px;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #000000;
    }}

    .brand-mark svg {{
      width: 26px;
      height: 26px;
    }}

    .brand-text h1 {{
      font-size: 19pt;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
      text-transform: uppercase;
    }}

    .brand-text p {{
      font-size: 7.2pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #333333;
      margin-top: 2px;
    }}

    .header-meta {{
      text-align: right;
      font-family: 'Geist Mono', monospace;
      font-size: 6.8pt;
      line-height: 1.35;
    }}

    .meta-pill {{
      display: inline-block;
      background: #000000;
      color: #FFFFFF;
      padding: 1.5px 6px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }}

    /* Leadership Strip */
    .founders-bar {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1.5px solid #000000;
      margin-bottom: 10px;
      background: #FAFAFA;
    }}

    .founder-box {{
      padding: 6px 10px;
    }}

    .founder-box:first-child {{
      border-right: 1.5px solid #000000;
    }}

    .founder-tag {{
      font-family: 'Geist Mono', monospace;
      font-size: 6.2pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #444444;
      margin-bottom: 2px;
    }}

    .founder-name {{
      font-size: 10.5pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }}

    .founder-detail {{
      font-size: 7.2pt;
      color: #333333;
      margin-top: 1px;
    }}

    .fill-line {{
      display: inline-block;
      min-width: 140px;
      border-bottom: 1.5px solid #000000;
      height: 12px;
      vertical-align: middle;
    }}

    /* Headings */
    h2 {{
      font-size: 10.2pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 3px;
      margin-top: 10px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }}

    h2 .sec-index {{
      font-family: 'Geist Mono', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      color: #333333;
    }}

    p {{
      margin-bottom: 5px;
      color: #000000;
      text-align: justify;
    }}

    /* Callouts */
    .callout {{
      border: 1.5px solid #000000;
      padding: 8px 10px;
      margin: 7px 0;
      background: #FFFFFF;
    }}

    .callout.dark-accent {{
      background: #F8F8F8;
      border-left: 5px solid #000000;
    }}

    .callout h4 {{
      font-family: 'Geist Mono', monospace;
      font-size: 7.8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 3px;
    }}

    /* Grids */
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin: 6px 0;
    }}

    .grid-3 {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 7px;
      margin: 6px 0;
    }}

    .card {{
      border: 1px solid #000000;
      padding: 6px 8px;
      background: #FFFFFF;
    }}

    .card .card-head {{
      font-family: 'Geist Mono', monospace;
      font-size: 6.8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid #000000;
      padding-bottom: 2px;
      margin-bottom: 3px;
    }}

    .card p {{
      font-size: 7.6pt;
      margin: 0;
      line-height: 1.32;
      text-align: left;
    }}

    /* Tables */
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 7.6pt;
    }}

    th, td {{
      border: 1px solid #000000;
      padding: 4px 6px;
      text-align: left;
      vertical-align: top;
      line-height: 1.3;
    }}

    th {{
      background: #000000;
      color: #FFFFFF;
      font-family: 'Geist Mono', monospace;
      font-weight: 700;
      font-size: 6.8pt;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }}

    tr:nth-child(even) td {{
      background: #FAFAFA;
    }}

    /* ASCII Box */
    .ascii-box {{
      border: 1.2px solid #000000;
      background: #FAFAFA;
      padding: 6px 8px;
      font-family: 'Geist Mono', Consolas, monospace;
      font-size: 6.6pt;
      line-height: 1.24;
      margin: 6px 0;
      white-space: pre;
    }}

    /* Bullet Lists */
    ul {{
      margin-left: 15px;
      margin-bottom: 5px;
    }}

    li {{
      margin-bottom: 2.5px;
      font-size: 8pt;
      line-height: 1.34;
    }}

    /* Sign-Off Block */
    .sign-container {{
      border: 1.5px solid #000000;
      margin-top: 10px;
      padding: 9px 12px;
      background: #FFFFFF;
    }}

    .sign-row {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 8px;
    }}

    .sign-card {{
      border: 1px solid #000000;
      padding: 7px 9px;
      background: #FAFAFA;
    }}

    .sign-space {{
      border-bottom: 1.5px solid #000000;
      height: 28px;
      margin: 6px 0 4px 0;
    }}

    .sign-sub {{
      font-family: 'Geist Mono', monospace;
      font-size: 6.5pt;
      color: #222222;
      text-transform: uppercase;
      line-height: 1.3;
    }}

    /* Disclaimer */
    .disclaimer-strip {{
      border: 1px dashed #000000;
      padding: 5px 8px;
      margin-top: 8px;
      font-size: 6.8pt;
      color: #222222;
      line-height: 1.25;
      text-align: center;
      background: #FAFAFA;
    }}
  </style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="doc-header">
    <div class="header-top">
      <div class="brand-group">
        <div class="brand-mark">
          <svg viewBox="0 0 256 256">
            <rect width="256" height="256" fill="#000000"/>
            <path d="M64 48h40v120h40v-24h48v64H64z" fill="#FFFFFF"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1>LOAM LAUNCHER</h1>
          <p>MASTER APPLICATION BRIEF & SYSTEM ARCHITECTURE</p>
        </div>
      </div>
      <div class="header-meta">
        <div class="meta-pill">OFFICIAL BRIEF</div><br>
        <strong>VERSION:</strong> 1.5.0-RC.4<br>
        <strong>TARGET:</strong> WINDOWS x64<br>
        <strong>STATUS:</strong> PRODUCTION READY
      </div>
    </div>
  </div>

  <!-- LEADERSHIP STRIP -->
  <div class="founders-bar">
    <div class="founder-box">
      <div class="founder-tag">PROJECT FOUNDER & LEAD ARCHITECT</div>
      <div class="founder-name">DHYAN PARMAR</div>
      <div class="founder-detail">Core Systems Architecture • Rust Engine • Vision & Strategy</div>
    </div>
    <div class="founder-box">
      <div class="founder-tag">CO-FOUNDER & EXECUTIVE PARTNER</div>
      <div class="founder-name">
        <span class="fill-line"></span>
      </div>
      <div class="founder-detail">Co-Architecture • Technical Co-Direction • Product Delivery</div>
    </div>
  </div>

  <!-- SECTION 1 -->
  <h2><span>1. EXECUTIVE OVERVIEW & CORE IDENTITY</span> <span class="sec-index">SEC. 01</span></h2>

  <div class="callout dark-accent">
    <h4>PRODUCT MISSION & VALUE PROPOSITION</h4>
    <p style="margin: 0; font-size: 8.2pt;">
      <strong>LOAM</strong> is an offline-first Minecraft Java launcher for Windows engineered for players and modders who demand absolute privacy, instant cold-start velocity, and total ownership over their game data. Built with a native <strong>Rust core</strong> and a <strong>Tauri v2</strong> framework, LOAM eliminates launcher bloat and high memory consumption in favor of a sovereign sandbox wrapped in a tactile Scandinavian aesthetic.
    </p>
  </div>

  <div class="grid-3">
    <div class="card">
      <div class="card-head">LIGHTWEIGHT FOOTPRINT</div>
      <p>Instant cold starts with sub-5 MB binary footprint. Uses ~25 MB idle RAM (replacing ~400 MB Electron bloat).</p>
    </div>
    <div class="card">
      <div class="card-head">ZERO TELEMETRY</div>
      <p>No user analytics, background tracking, or remote telemetry. Profiles and diagnostics remain strictly local.</p>
    </div>
    <div class="card">
      <div class="card-head">OFFLINE-FIRST ENGINE</div>
      <p>Full offline sovereignty. Instance launch, skin studio, and mod environments run without internet connection.</p>
    </div>
  </div>

  <!-- SECTION 2 -->
  <h2><span>2. TECHNICAL ARCHITECTURE & SOFTWARE STACK</span> <span class="sec-index">SEC. 02</span></h2>

  <p>
    LOAM isolates presentation from system orchestration using a strict boundary between an asynchronous Rust daemon and a reactive web interface connected via strongly-typed Tauri IPC channels.
  </p>

  <div class="ascii-box">
+---------------------------------------------------------------------------------+
|                        LOAM FRONTEND USER INTERFACE                             |
|       React 18  *  TypeScript  *  Tailwind CSS  *  Web Audio Procedural SFX     |
+----------------------------------------+----------------------------------------+
                                         | Tauri v2 IPC Bridge (`invoke`)
+----------------------------------------v----------------------------------------+
|                               LOAM RUST CORE ENGINE                             |
|  * commands.rs     : Validated IPC Command Router & Input Sanitization          |
|  * catalog.rs      : Version Manifest Resolver (Vanilla, Fabric, Quilt)         |
|  * network.rs      : Concurrent Downloader with SHA-1 Truncation Healing        |
|  * engine.rs       : Classpath Assembly, Isolated JDK & Child Process Monitor   |
|  * accounts.rs     : Microsoft OAuth2 PKCE Flow & Deterministic Offline UUID    |
|  * skins.rs        : Dynamic `pack.mcmeta` Offline Skin Resource Pack Engine    |
|  * windows_perf.rs : Priority Tuning, Thread Affinity & Working-Set Memory Trim  |
|  * doctor.rs       : Pre-Flight Environment Triage & Sanitized Diagnostic Export|
+-------------------+--------------------+-------------------+--------------------+
                    |                    |                   |
            +-------v-------+    +-------v-------+   +-------v-------+
            |  LOCAL DISK   |    |  WINDOWS API  |   | MOJANG / ADOP |
            |  %LOCALAPPDATA|    |  Win32 Handle |   | Official APIs |
            +---------------+    +---------------+   +---------------+
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">LAYER</th>
        <th style="width: 28%;">STACK</th>
        <th style="width: 50%;">CORE RESPONSIBILITIES & ADVANTAGES</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>User Interface</strong></td>
        <td>React 18, TypeScript, Tailwind</td>
        <td>Zero game-orchestration logic; tactile Scandinavian aesthetic; real-time procedural Web Audio sound synthesis.</td>
      </tr>
      <tr>
        <td><strong>Application Core</strong></td>
        <td>Rust, Tauri v2, Tokio, Reqwest</td>
        <td>Native execution speed; zero GC pauses; memory safety; concurrent chunk downloads and robust child process supervision.</td>
      </tr>
      <tr>
        <td><strong>OS Engine</strong></td>
        <td>Win32 API (`windows` crate)</td>
        <td>Priority boosting (`ABOVE_NORMAL_PRIORITY_CLASS`), CPU thread affinity, and memory trimming (`EmptyWorkingSet`).</td>
      </tr>
      <tr>
        <td><strong>Credential Store</strong></td>
        <td>Windows Credential Manager</td>
        <td>Hardware-backed DPAPI storage for tokens via `keyring` crate; zero plaintext credential files.</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- ==================== PAGE 2 ==================== -->
  <div class="doc-header">
    <div class="header-top">
      <div class="brand-group">
        <div class="brand-text">
          <h1 style="font-size: 13pt;">LOAM LAUNCHER — SUBSYSTEM SPECIFICATIONS</h1>
          <p>FOUNDER: DHYAN PARMAR • CO-FOUNDER: ____________________</p>
        </div>
      </div>
      <div class="header-meta">
        <strong>SECTION:</strong> ENGINE CAPABILITIES<br>
        <strong>PAGE:</strong> 02 OF 03
      </div>
    </div>
  </div>

  <!-- SECTION 3 -->
  <h2><span>3. CORE ENGINE SUBSYSTEMS</span> <span class="sec-index">SEC. 03</span></h2>

  <div class="grid-2">
    <div class="card">
      <div class="card-head">PARALLEL DOWNLOADER WITH SHA-1 VALIDATION</div>
      <p>
        Multi-threaded worker pool built on `tokio` and `reqwest`. Cryptographically validates SHA-1 hashes against official Mojang manifests for every client JAR, native, and asset. Incomplete files are dropped and re-fetched with exponential backoff.
      </p>
    </div>
    <div class="card">
      <div class="card-head">ISOLATED JAVA RUNTIME VIRTUALIZATION</div>
      <p>
        Maps Minecraft versions to Eclipse Adoptium Temurin runtimes (Java 8, 17, 21). Unpacks into private cache <code>%LOCALAPPDATA%\app.loam.launcher\cache\runtimes</code> without mutating system <code>PATH</code>, <code>JAVA_HOME</code>, or Windows registry entries.
      </p>
    </div>
    <div class="card">
      <div class="card-head">OFFLINE PROFILE ENGINE</div>
      <p>
        Computes standard deterministic UUIDs using name-based MD5 hashing (<code>OfflinePlayer:&lt;name&gt;</code>). Player inventories, achievements, and world saves persist across sessions. Runs with <code>--accessToken 0</code> without online-mode server bypass.
      </p>
    </div>
    <div class="card">
      <div class="card-head">SKIN STUDIO & DYNAMIC PACK INJECTION</div>
      <p>
        Injects custom player skins offline by generating an in-memory Minecraft resource pack with version-compliant `pack.mcmeta` and placing textures at entity model paths. Players render custom skins in singleplayer/LAN without Mojang skin servers.
      </p>
    </div>
  </div>

  <!-- SECTION 4 -->
  <h2><span>4. PERFORMANCE TUNING & LOAM DOCTOR</span> <span class="sec-index">SEC. 04</span></h2>

  <div class="callout">
    <h4>WINDOWS PERFORMANCE ENGINE (`windows_perf.rs`)</h4>
    <p style="margin-bottom: 3px;">
      Upon process launch, LOAM interacts directly with Win32 APIs with strict non-elevated permissions:
    </p>
    <ul>
      <li><strong>Priority Class Tuning:</strong> Assigns the child Minecraft process `ABOVE_NORMAL_PRIORITY_CLASS` to eliminate frame pacing jitter under heavy background CPU load.</li>
      <li><strong>EcoQoS Power Throttling Opt-Out:</strong> Disables Windows EcoQoS execution speed throttling on active game threads.</li>
      <li><strong>Post-Launch Memory Trim:</strong> Executes `EmptyWorkingSet()` on the launcher process after the game window appears, releasing unused RAM back to Windows during active gameplay.</li>
    </ul>
  </div>

  <table style="margin-top: 4px;">
    <thead>
      <tr>
        <th style="width: 28%;">DIAGNOSTIC MODULE</th>
        <th style="width: 72%;">RESPONSIBILITY & USER PRIVACY PROTECTION</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Pre-Flight Triage</strong></td>
        <td>Detects broken Java installations, corrupted native binaries, memory over-allocation, and known-incompatible JVM flags before launching.</td>
      </tr>
      <tr>
        <td><strong>Crash Dump Analyzer</strong></td>
        <td>Parses game exit codes and `hs_err_pid.log` files to extract the exact failing mod, driver, or memory limit stack trace.</td>
      </tr>
      <tr>
        <td><strong>Sanitized Export (.zip)</strong></td>
        <td>Generates a diagnostic zip archive. Automatically scrubs access tokens, player usernames, hardware serial numbers, and local file paths.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5 -->
  <h2><span>5. AUTHENTICATION & SECURITY GOVERNANCE</span> <span class="sec-index">SEC. 05</span></h2>

  <p>
    LOAM implements a pure <strong>OAuth 2.0 PKCE (RFC 7636)</strong> flow for Microsoft identity accounts:
  </p>
  <ul>
    <li><strong>Zero Embedded Secrets:</strong> As a public desktop client, LOAM embeds no client secrets. Authorization uses public client ID `fef7a470-7d7e-4c33-92aa-33d13270c3e9` with SHA-256 cryptographic `code_verifier` challenges.</li>
    <li><strong>Loopback Redirect:</strong> Binds strictly to `http://localhost:8400/` on local interface `127.0.0.1` and terminates immediately upon receiving authorization codes.</li>
    <li><strong>Live Verification Status:</strong> The OAuth2 exchange and Xbox Live/XSTS authorization succeed. The final call to `api.minecraftservices.com` currently returns <strong>HTTP 403 Forbidden</strong> pending formal third-party developer onboarding with Microsoft/Mojang. Offline profiles remain fully operational.</li>
    <li><strong>Token Isolation:</strong> User refresh credentials are encrypted and stored in Windows Credential Manager under `loam_ms_refresh_token`; access tokens remain in memory only.</li>
  </ul>

  <!-- PAGE BREAK -->
  <div class="page-break"></div>

  <!-- ==================== PAGE 3 ==================== -->
  <div class="doc-header">
    <div class="header-top">
      <div class="brand-group">
        <div class="brand-text">
          <h1 style="font-size: 13pt;">LOAM LAUNCHER — GOVERNANCE & RATIFICATION</h1>
          <p>FOUNDING TEAM CHARTER • RELEASE ROADMAP v1.5 → v3.5</p>
        </div>
      </div>
      <div class="header-meta">
        <strong>SECTION:</strong> RATIFICATION CHARTER<br>
        <strong>PAGE:</strong> 03 OF 03
      </div>
    </div>
  </div>

  <!-- SECTION 6 -->
  <h2><span>6. ROADMAP & FOUNDING PRINCIPLES</span> <span class="sec-index">SEC. 06</span></h2>

  <div class="grid-2">
    <div class="card">
      <div class="card-head">THE SLIP RULE</div>
      <p>If a monthly milestone does not pass all quality, test, and security gates, the release slips. Never compress the hardening period to meet a marketing deadline.</p>
    </div>
    <div class="card">
      <div class="card-head">CODE WINS OVER SPEC</div>
      <p>Documentation must strictly reflect verified code reality. Never claim unverified features, active signing, or server bypass in public releases.</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 14%;">RELEASE</th>
        <th style="width: 22%;">CODENAME</th>
        <th style="width: 64%;">THEME & ARCHITECTURAL GATES</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>v1.5</strong></td>
        <td>Humus</td>
        <td>Trust & Smoothness: Verifiable builds, doctor health checks, working-set memory trim, skin studio.</td>
      </tr>
      <tr>
        <td><strong>v1.6</strong></td>
        <td>Topsoil</td>
        <td>Accounts & Safety: Mod Guard, World Time Machine automated backups, local account sync.</td>
      </tr>
      <tr>
        <td><strong>v1.8</strong></td>
        <td>Subsoil</td>
        <td>Instances 2.0: Shared content store, instance overrides, cloning, safe data folder move.</td>
      </tr>
      <tr>
        <td><strong>v2.0</strong></td>
        <td>Tilth</td>
        <td>The Mods Hub: Modrinth/CurseForge integration, dependency solver, one-click update engine.</td>
      </tr>
      <tr>
        <td><strong>v2.2</strong></td>
        <td>Terrace</td>
        <td>Multiplayer & Servers: Local server orchestrator, LAN discovery helper, Server Hub.</td>
      </tr>
      <tr>
        <td><strong>v3.0</strong></td>
        <td>Alluvium</td>
        <td>Cross-Platform Core: Headless daemon split, Linux/macOS support, headless server management.</td>
      </tr>
    </tbody>
  </table>

  <!-- RATIFICATION & SIGN-OFF BLOCK -->
  <div class="sign-container avoid-break">
    <div style="font-family: 'Geist Mono', monospace; font-size: 7.2pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1.5px solid #000000; padding-bottom: 3px;">
      FOUNDING TEAM RATIFICATION & COMMITMENT CHARTER
    </div>
    <p style="font-size: 7.8pt; margin-top: 5px; margin-bottom: 0;">
      By signing below, the Founder and Co-Founder formalize and ratify this Master Application Brief as the authoritative technical specification, security standard, and release roadmap for the LOAM Launcher project.
    </p>

    <div class="sign-row">
      <!-- FOUNDER SIGNATURE -->
      <div class="sign-card">
        <div class="founder-tag">PROJECT FOUNDER & LEAD ARCHITECT</div>
        <div style="font-size: 10pt; font-weight: 800; margin-top: 2px;">DHYAN PARMAR</div>
        <div class="sign-space"></div>
        <div class="sign-sub">
          SIGNATURE: DHYAN PARMAR<br>
          DATE: ______ / ______ / 2026
        </div>
      </div>

      <!-- CO-FOUNDER SIGNATURE -->
      <div class="sign-card">
        <div class="founder-tag">CO-FOUNDER & EXECUTIVE PARTNER</div>
        <div style="font-size: 10pt; font-weight: 800; margin-top: 2px;">
          NAME: <span class="fill-line" style="min-width: 140px;"></span>
        </div>
        <div class="sign-space"></div>
        <div class="sign-sub">
          SIGNATURE: ___________________________<br>
          DATE: ______ / ______ / 2026
        </div>
      </div>
    </div>
  </div>

  <div class="disclaimer-strip avoid-break">
    <strong>LEGAL & TRADEMARK DISCLAIMER:</strong> LOAM Launcher is an independent, community-driven desktop project.<br>
    Not an official Minecraft product. Not approved by or associated with Mojang Studios or Microsoft Corporation.
  </div>

</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML written to {HTML_PATH}")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

print(f"Rendering PDF with Headless Edge: {edge_path}...")
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
    size = os.path.getsize(PDF_PATH)
    print(f"SUCCESS: Rendered {PDF_PATH} ({size} bytes)")
    import shutil
    shutil.copy2(PDF_PATH, ARTIFACT_PDF_PATH)
    print(f"COPIED to artifact location: {ARTIFACT_PDF_PATH}")
else:
    print(f"Edge error: {res.stderr}")
