# LOAM Launcher — Support Matrix & Version Coverage

This matrix documents the version, mod loader, Java runtime, and skin rendering capabilities across all supported Minecraft releases in LOAM.

---

## 1. Supported Release Eras & Minecraft Versions

| Era | Minecraft Versions | Java Requirement | Loader Support | In-Game Skin Sync |
| :--- | :--- | :--- | :--- | :--- |
| **Active Modern (2024–2026)** | `26.3`, `1.21.4`, `1.21.0`–`1.21.3` | OpenJDK 21 x64 | Vanilla, Fabric, Quilt, NeoForge | Wide & Slim (`player/wide/*`, `player/slim/*`) |
| **Recent Standards (2022–2024)** | `1.20.5`–`1.20.6`<br>`1.20.1`–`1.20.4`<br>`1.19.4`<br>`1.18.2` | OpenJDK 21 x64<br>OpenJDK 17 x64<br>OpenJDK 17 x64<br>OpenJDK 17 x64 | Vanilla, Fabric, Quilt, NeoForge<br>Vanilla, Fabric, Quilt, Forge<br>Vanilla, Fabric, Quilt, Forge<br>Vanilla, Fabric, Quilt, Forge | Wide & Slim (1.19.3+ modern path)<br>Wide & Slim (1.19.3+ modern path)<br>Wide & Slim (1.19.3+ modern path)<br>Legacy entity fallback (`steve.png`/`alex.png`) |
| **Caves & Cliffs (2021)** | `1.17.1` | OpenJDK 16/17 x64 | Vanilla, Fabric, Quilt, Forge | Legacy entity fallback |
| **Nether Update (2020)** | `1.16.5` | OpenJDK 8 x64 | Vanilla, Fabric, Forge | Legacy entity fallback |
| **Village & Pillage (2019)** | `1.14.4` | OpenJDK 8 x64 | Vanilla, Fabric, Forge | Legacy entity fallback |
| **Color & Aquatic (2017–2018)**| `1.13.2`, `1.12.2` | OpenJDK 8 x64 | Vanilla, Forge | Legacy entity fallback (`options.txt` format 3) |
| **Combat & Frost (2016)** | `1.11.2`, `1.10.2`, `1.9.4` | OpenJDK 8 x64 | Vanilla, Forge | Legacy entity fallback (`options.txt` format 2) |
| **The Bountiful Era (2015)** | `1.8.9` | OpenJDK 8 x64 | Vanilla, Forge | Legacy entity fallback (`options.txt` format 1) |

---

## 2. Mod Loader Architecture

### Vanilla · Clean
- Zero modifications to game JARs.
- Pure vanilla assets and libraries directly verified against Mojang signatures.
- Supported from 1.8.9 to 26.3.

### Fabric
- Lightweight, fast-loading modular modding framework.
- Fully supported from 1.14 through 26.3.
- LOAM merges Fabric loader manifests with Mojang base game manifests, auto-downloading Fabric intermediary mappings and libraries.

### Quilt
- Community-driven modular modding framework with Fabric mod compatibility.
- Fully supported from 1.14 through 26.3.
- LOAM pulls Quilt loader profiles from `meta.quiltmc.org`.

### NeoForge
- Next-generation Forge fork for modern Minecraft versions.
- Supported on 1.20.2+.

### Forge
- Legacy modding framework.
- Supported on 1.8.9 through 1.20.1.

---

## 3. In-Game Skin & Appearance Mechanism

LOAM delivers 100% offline and singleplayer skin customization without modding or binary alteration:
1. **Dynamic Resource Pack Generation**:
   LOAM generates `<game_dir>/resourcepacks/LOAM_Skin/` populated with:
   - `pack.mcmeta` with `supported_formats: {"min_inclusive": 1, "max_inclusive": 999}`.
   - `textures/entity/player/wide/` (covering `steve.png`, `ari.png`, `efe.png`, `kai.png`, `makena.png`, `noor.png`, `sunny.png`, `zuri.png`).
   - `textures/entity/player/slim/` (covering `alex.png` and modern slim models).
   - `textures/entity/steve.png` and `textures/entity/alex.png` for legacy 1.8–1.19.2 versions.
2. **Auto-Configuration (`options.txt`)**:
   LOAM ensures `options.txt` has `file/LOAM_Skin` in `resourcePacks: [...]` so the skin is applied immediately upon first launch.
3. **UUID Parity Invariance**:
   LOAM guarantees arm model fidelity by aligning the offline player UUID hash bit 0 with the chosen arm model (Classic 4px vs Slim 3px).
