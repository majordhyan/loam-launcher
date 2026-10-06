import os
import subprocess
import base64

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
os.makedirs(DIST_DIR, exist_ok=True)

ICON_PATH = os.path.join(PROJECT_ROOT, "src-tauri", "icons", "icon.png")
with open(ICON_PATH, "rb") as f:
    icon_b64 = base64.b64encode(f.read()).decode("utf-8")

HTML_PATH = os.path.join(DIST_DIR, "LOAM_Partnership_Invitation_Jayrajsinh_Rana.html")
PDF_PATH = os.path.join(DIST_DIR, "LOAM_Partnership_Invitation_Jayrajsinh_Rana.pdf")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LOAM Launcher — Official Partnership Invitation: Jayrajsinh Rana</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {{
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
      @bottom-right {{
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7.5pt;
        color: #8C8982;
      }}
      @bottom-left {{
        content: "LOAM · OFFICIAL PARTNERSHIP COVENANT · STRICTLY CONFIDENTIAL";
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 7.5pt;
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
      line-height: 1.5;
      font-size: 9.2pt;
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
      padding-bottom: 7px;
      margin-bottom: 12px;
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
      font-weight: 700;
    }}

    /* Hero Banner */
    .invitation-hero {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 16px 20px;
      background: var(--sandstone);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      margin-bottom: 14px;
      position: relative;
    }}

    .hero-text h1 {{
      font-size: 22pt;
      font-weight: 700;
      line-height: 1.1;
      color: var(--charcoal);
      letter-spacing: -0.02em;
    }}

    .hero-text .doc-subtitle {{
      font-size: 10.5pt;
      color: var(--terracotta);
      font-weight: 600;
      margin-top: 3px;
    }}

    .hero-invitee {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 4px 10px;
      background: var(--alabaster);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 8.5pt;
    }}

    .hero-invitee strong {{
      color: var(--charcoal);
      font-weight: 700;
    }}

    .hero-icon-box {{
      width: 70px;
      height: 70px;
      min-width: 70px;
      border-radius: 16px;
      background: var(--terracotta);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(193, 95, 60, 0.25);
      border: 1.5px solid rgba(255, 255, 255, 0.4);
    }}

    .hero-icon-box img {{
      width: 52px;
      height: 52px;
      object-fit: contain;
    }}

    /* Formal Letter Card */
    .letter-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left: 3.5px solid var(--terracotta);
      border-radius: 0 10px 10px 0;
      padding: 14px 16px;
      margin-bottom: 14px;
    }}

    .letter-greeting {{
      font-size: 11.5pt;
      font-weight: 700;
      color: var(--charcoal);
      margin-bottom: 8px;
    }}

    .letter-body p {{
      margin-bottom: 8px;
      color: #2F2E2A;
      font-size: 8.8pt;
      line-height: 1.55;
    }}

    .letter-body p:last-child {{
      margin-bottom: 0;
    }}

    /* Section Titles */
    h2.section-title {{
      font-size: 11.5pt;
      font-weight: 700;
      color: var(--charcoal);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      margin-bottom: 8px;
      padding-bottom: 3px;
      border-bottom: 1px solid var(--border);
      letter-spacing: -0.01em;
    }}

    h2.section-title .section-num {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      color: var(--terracotta);
      background: var(--terracotta-soft);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
    }}

    /* Grid Cards */
    .cards-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 9px;
      margin-bottom: 12px;
    }}

    .card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
    }}

    .card-title {{
      font-size: 8.8pt;
      font-weight: 700;
      color: var(--charcoal);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .card-desc {{
      font-size: 8pt;
      color: var(--muted);
      line-height: 1.45;
    }}

    /* Partnership Terms / Pillars */
    .role-banner {{
      background: #1C1C19;
      color: #FAF9F6;
      border-radius: 10px;
      padding: 12px 16px;
      margin: 10px 0 14px 0;
      border: 1px solid #33322D;
    }}

    .role-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #383832;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }}

    .role-title {{
      font-size: 11pt;
      font-weight: 700;
      color: #FAF9F6;
    }}

    .role-badge {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      background: var(--terracotta);
      color: #FAF9F6;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
    }}

    .role-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }}

    .role-box {{
      background: #252522;
      border: 1px solid #3A3A34;
      border-radius: 6px;
      padding: 8px 10px;
    }}

    .role-box-title {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.8pt;
      font-weight: 700;
      color: var(--terracotta);
      margin-bottom: 3px;
    }}

    .role-box-desc {{
      font-size: 7.8pt;
      color: #D6D3CC;
      line-height: 1.4;
    }}

    /* Signatures Section */
    .sign-container {{
      background: var(--sandstone);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 18px;
      margin-top: 14px;
    }}

    .sign-covenant {{
      font-size: 8.2pt;
      color: #383632;
      line-height: 1.5;
      font-style: italic;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
      text-align: center;
    }}

    .sign-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }}

    .sign-box {{
      display: flex;
      flex-direction: column;
    }}

    .sign-label {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.2pt;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 24px;
    }}

    .sign-line {{
      border-bottom: 1.5px solid var(--charcoal);
      margin-bottom: 6px;
    }}

    .sign-name {{
      font-size: 10pt;
      font-weight: 700;
      color: var(--charcoal);
    }}

    .sign-role {{
      font-size: 8pt;
      color: var(--terracotta);
      font-weight: 600;
    }}

    .sign-meta {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      color: var(--muted);
      margin-top: 2px;
    }}

    .seal-box {{
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 12px;
      gap: 12px;
    }}

    .stamp {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 6.8pt;
      font-weight: 700;
      border: 1.5px dashed var(--terracotta);
      color: var(--terracotta);
      padding: 4px 14px;
      border-radius: 6px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }}
  </style>
</head>
<body>

  <div class="container">

    <!-- PAGE 1 -->
    <!-- Confidentiality Header -->
    <div class="confidential-bar">
      <span>LOAM FOUNDATION · PROJECT PARTNERSHIP COVENANT</span>
      <span class="confidential-tag">● STRICTLY CONFIDENTIAL & PRIVILEGED</span>
      <span>REF: LOAM-PARTNER-2026-JR</span>
    </div>

    <!-- Hero Header -->
    <div class="invitation-hero">
      <div class="hero-text">
        <h1 class="font-serif">Official Invitation of Partnership</h1>
        <div class="doc-subtitle">LOAM Launcher Core Development Team & Project Co-Leadership</div>
        <div class="hero-invitee font-mono">
          <span>INVITEE:</span>
          <strong>JAYRAJSINH RANA</strong>
          <span style="color: var(--terracotta); margin: 0 4px;">·</span>
          <span>ROLE: CO-CODER & PROJECT PARTNER</span>
        </div>
      </div>
      <div class="hero-icon-box">
        <img src="data:image/png;base64,{icon_b64}" alt="LOAM Emblem" />
      </div>
    </div>

    <!-- Formal Letter -->
    <div class="letter-card avoid-break">
      <div class="letter-greeting font-serif">Dear Jayrajsinh Rana,</div>
      <div class="letter-body">
        <p>
          It is with tremendous enthusiasm, mutual respect, and a shared passion for high-performance software engineering that I formally invite you to join the <strong>LOAM Production Team</strong> as an official <strong>Project Partner and Co-Coder</strong>.
        </p>
        <p>
          LOAM began with an uncompromising mission: to dismantle the slow, bloated, telemetry-ridden Minecraft launcher ecosystem and rebuild it from the ground up as a lightning-fast, offline-first sovereign platform engineered in pure <strong>Rust</strong> and <strong>Tauri v2</strong>. Today, LOAM stands as a sub-5 MB architectural triumph with sandboxed multi-Java runtime provisioning, native Fabric/Quilt meta orchestration, universal dynamic resource bridging, and a handcrafted Scandinavian editorial aesthetic.
        </p>
        <p>
          Achieving our vision requires exceptional talent and shared dedication. Having witnessed your technical acumen, problem-solving mindset, and dedication to craftsmanship, there is no one I would rather build, architect, and scale LOAM alongside. As Co-Coder and Project Partner, you will hold equal technical authority, steering our codebase, shaping our architectural roadmap, and co-owning the future of sovereign Minecraft gaming.
        </p>
      </div>
    </div>

    <!-- 01: Core Philosophy Alignment -->
    <h2 class="section-title font-serif">
      <span class="section-num">01</span> Our Shared Engineering Ethos
    </h2>
    <div class="cards-grid">
      <div class="card">
        <div class="card-title">
          <span style="color: var(--terracotta);">⚡</span> Zero Bloat, Pure Rust
        </div>
        <div class="card-desc">
          We reject Electron and Chromium overhead. LOAM launches in 1.2 seconds, uses under 15 MB background memory, and compiles into a single compact native binary.
        </div>
      </div>
      <div class="card">
        <div class="card-title">
          <span style="color: var(--green);">🛡️</span> 100% Offline-First Sovereignty
        </div>
        <div class="card-desc">
          Total user privacy: zero remote telemetry, zero analytics tracking, local sandboxed JDK management, and full gameplay capabilities without internet tethers.
        </div>
      </div>
      <div class="card">
        <div class="card-title">
          <span style="color: var(--charcoal);">🏺</span> Scandinavian Craft Aesthetic
        </div>
        <div class="card-desc">
          Tactile brutalism: warm sandstone backgrounds, terracotta clay buttons, editorial serif typography, and procedural Web Audio acoustic clicks and thuds.
        </div>
      </div>
      <div class="card">
        <div class="card-title">
          <span style="color: var(--terracotta);">🔧</span> Bulletproof Resilience
        </div>
        <div class="card-desc">
          Automated multi-threaded parallel downloads with SHA-1 integrity checks, auto-healing corrupted caches, and the LOAM Doctor diagnostic triage engine.
        </div>
      </div>
    </div>

    <!-- PAGE BREAK TO PAGE 2 -->
    <div class="page-break"></div>

    <!-- Confidential Header on Page 2 -->
    <div class="confidential-bar">
      <span>LOAM FOUNDATION · CO-LEADERSHIP SCOPE & COVENANT</span>
      <span class="confidential-tag">● STRICTLY CONFIDENTIAL & PRIVILEGED</span>
      <span>PAGE 2</span>
    </div>

    <!-- 02: Co-Leadership Scope & Responsibilities -->
    <h2 class="section-title font-serif">
      <span class="section-num">02</span> Co-Leadership & Technical Ownership
    </h2>

    <div class="role-banner avoid-break">
      <div class="role-header">
        <div class="role-title font-serif">Project Partner & Co-Code Lead</div>
        <div class="role-badge">EQUITY & ARCHITECTURAL CO-OWNERSHIP</div>
      </div>
      <div class="role-grid">
        <div class="role-box">
          <div class="role-box-title">RUST CORE & SUBSYSTEMS (src-tauri)</div>
          <div class="role-box-desc">
            Directly architect and optimize the game launch engine, process prioritization, native classpath composition, and Windows API optimizations.
          </div>
        </div>
        <div class="role-box">
          <div class="role-box-title">CLIENT UI & AUDIO ENGINE (src)</div>
          <div class="role-box-desc">
            Co-design React/TypeScript interfaces, sliding drawer architectures, procedural Web Audio sound synthesis, and the integrated SkinStudio.
          </div>
        </div>
        <div class="role-box">
          <div class="role-box-title">ECOSYSTEM & MOD LOADER EXPANSION</div>
          <div class="role-box-desc">
            Pioneer upcoming Modrinth/CurseForge headless modpack resolution, NeoForge integration, and instant dependency resolving.
          </div>
        </div>
        <div class="role-box">
          <div class="role-box-title">STRATEGIC ROADMAP & RELEASES</div>
          <div class="role-box-desc">
            Full co-ownership of version tagging, release candidate builds, open-source community governance, and global deployment strategy.
          </div>
        </div>
      </div>
    </div>

    <!-- 03: Collaborative Roadmap -->
    <h2 class="section-title font-serif">
      <span class="section-num">03</span> Upcoming Collaborative Milestones
    </h2>

    <div class="cards-grid">
      <div class="card">
        <div class="card-title font-mono" style="font-size: 8.2pt; color: var(--terracotta);">
          MILESTONE 01: MODPACK ENGINE
        </div>
        <div class="card-desc">
          Building a native Modrinth / CurseForge headless package installer with instant peer-to-peer mod synchronization and dependency hashing.
        </div>
      </div>
      <div class="card">
        <div class="card-title font-mono" style="font-size: 8.2pt; color: var(--green);">
          MILESTONE 02: CROSS-PLATFORM KERNEL
        </div>
        <div class="card-desc">
          Extending LOAM's low-level performance scheduler to macOS Apple Silicon (ARM64) and native Linux systems with Wayland support.
        </div>
      </div>
      <div class="card">
        <div class="card-title font-mono" style="font-size: 8.2pt; color: var(--charcoal);">
          MILESTONE 03: P2P LAN TUNNELING
        </div>
        <div class="card-desc">
          Integrated encrypted peer-to-peer multiplayer tunneling allowing instant offline-account co-op gameplay across local and virtual networks.
        </div>
      </div>
      <div class="card">
        <div class="card-title font-mono" style="font-size: 8.2pt; color: var(--terracotta);">
          MILESTONE 04: COMMUNITY LAUNCH
        </div>
        <div class="card-desc">
          Orchestrating our official public launch, verified binary releases, and establishing LOAM as the gold standard of minimalist launchers.
        </div>
      </div>
    </div>

    <!-- 04: Partnership Covenant & Signatures -->
    <h2 class="section-title font-serif">
      <span class="section-num">04</span> Partnership Covenant & Endorsement
    </h2>

    <div class="sign-container avoid-break">
      <div class="sign-covenant">
        "By accepting this covenant, both partners pledge their mutual commitment to architectural excellence, transparency, absolute respect for user privacy, and the joint advancement of LOAM as an independent, sovereign software project."
      </div>

      <div class="sign-grid">
        <!-- Founder Signature -->
        <div class="sign-box">
          <div class="sign-label">Founder & Lead Architect</div>
          <div class="sign-line"></div>
          <div class="sign-name">Dhyan</div>
          <div class="sign-role">Lead Architect & Project Founder</div>
          <div class="sign-meta">LOAM CORE FOUNDATION · OCTOBER 2026</div>
        </div>

        <!-- Invitee Signature -->
        <div class="sign-box">
          <div class="sign-label">Invited Co-Coder & Project Partner</div>
          <div class="sign-line"></div>
          <div class="sign-name">Jayrajsinh Rana</div>
          <div class="sign-role">Co-Lead Engineer & Technical Partner</div>
          <div class="sign-meta">LOAM PRODUCTION TEAM · CONFIRMED</div>
        </div>
      </div>

      <div class="seal-box">
        <div class="stamp">✦ OFFICIAL LOAM SEAL OF INTEGRITY · 2026 ✦</div>
      </div>
    </div>

  </div>

</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at {HTML_PATH}")

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
    print(f"SUCCESS! Partnership PDF created at: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes)")
else:
    print(f"Edge execution error: {res.stderr}")
