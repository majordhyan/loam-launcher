# Compatibility

What LOAM 1.6.1 supports. LOAM reads Mojang's official version list live, so new releases appear without a LOAM update.

## Minecraft and loaders

| Loader | Minecraft versions | Status |
| :--- | :--- | :--- |
| **Vanilla** | 1.16.1 → latest release (26.x) | ✅ Supported |
| **Fabric** | Every version from 1.16.1 that Fabric publishes a loader for | ✅ Supported |
| **Quilt** | Every version from 1.16.1 that Quilt publishes a loader for | ✅ Supported |
| **Snapshots** | Optional (Settings → Preview versions) | ⚠️ Available, not tested |
| **Forge / NeoForge** | — | ❌ Not supported. The Migration Hub can bring a Forge or NeoForge instance's worlds, packs and settings into a vanilla game. |
| **OptiFine** | — | ❌ Not a loader in LOAM. The crash decoder recognises OptiFine conflicts with Sodium and Iris. |
| **Before 1.16.1** | — | ❌ Not supported |
| **Bedrock Edition** | — | ❌ Not supported |

## Java

LOAM reads the Java version each Minecraft version requires from Mojang's metadata and installs that Eclipse Temurin runtime. You never install Java yourself.

| Minecraft | Java LOAM installs |
| :--- | :--- |
| 1.16.1 – 1.16.5 | Java 8 |
| 1.17 – 1.17.1 | Java 16 (Temurin JDK, since no Java 16 JRE exists) |
| 1.18 – 1.20.4 | Java 17 |
| 1.20.5 – 1.21.x | Java 21 |
| 26.x | Java 25 |

### Tested in 1.6.1

Launched to the game window on Windows 11: Vanilla 1.20.1 (Java 17), Fabric 1.21.4 with loader 0.16.9 (Java 21). Earlier releases were tested with Vanilla 1.16.1, Vanilla 26.3 and Fabric 26.3. Other versions are expected to work but were not each launched for this release.

## Imports

| Item | Notes |
| :--- | :--- |
| Fabric mod `.jar` | Needs a Fabric or Quilt game for a matching Minecraft version |
| Quilt mod `.jar` | Needs a Quilt game |
| Resource pack `.zip` | Format checked against the game's version when possible |
| Shader pack `.zip` | Needs a shader mod (such as Iris) in the game |
| World `.zip` | One world per archive; imported as a copy |
| Modrinth `.mrpack` | Vanilla or Fabric packs; files from Modrinth's CDN only |
| Modrinth links | Project or version pages for mods, packs, resource packs and shaders |
| Prism Launcher / MultiMC instance | Vanilla, Fabric, Quilt; Forge/NeoForge as worlds and packs only |
| CurseForge instance | Vanilla, Fabric, Quilt; Forge/NeoForge as worlds and packs only |
| `.minecraft` folder | Saves, mods, packs, options and server list |

## Windows

| | Status |
| :--- | :--- |
| Windows 11 x64 | ✅ Supported, tested |
| Windows 10 x64 | ✅ Supported |
| Windows on ARM, 32-bit Windows, macOS, Linux | ❌ Not supported |

*Back to [README](../README.md) · [Importing](importing.md) · [FAQ](faq.md)*
