# LOAM Launcher — Official Minecraft News & Patch Notes Sources

This document details the upstream endpoints used to supply news, release announcements, and version metadata in LOAM.

---

## 1. News & Patch Notes Feed

### Primary Mojang Content API
- **Endpoint**: `https://launchercontent.mojang.com/v2/news.json`
- **Purpose**: Supplies official Minecraft Java Edition news articles, changelogs, and release summaries.
- **Payload Schema**:
  ```json
  {
    "entries": [
      {
        "title": "Minecraft: Java Edition 1.21.4",
        "tag": "Java Edition",
        "category": "News and Patch Notes",
        "date": "2024-12-03T10:00:00.000Z",
        "text": "A new release of Minecraft: Java Edition is now available...",
        "readMoreLink": "https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-4",
        "cardBorder": false,
        "newsPageImage": {
          "url": "https://launchercontent.mojang.com/..."
        }
      }
    ]
  }
  ```

---

## 2. Version Manifests & Catalog Sources

### Mojang Version Manifest v2
- **Endpoint**: `https://piston-meta.mojang.com/mc/game/version_manifest_v2.json`
- **Purpose**: Authoritative catalog of all Minecraft Java Edition versions, release metadata, and per-version asset manifests.

### Fabric Meta API
- **Endpoint**: `https://meta.fabricmc.net/v2/versions/loader`
- **Purpose**: Compatible Fabric loader builds per Minecraft version.

### Quilt Meta API
- **Endpoint**: `https://meta.quiltmc.org/v3/versions/loader`
- **Purpose**: Compatible Quilt loader builds per Minecraft version.

---

## 3. Strict Network Security & Domain Allowlist

In accordance with LOAM's zero-telemetry and security model, all network communication is strictly restricted to verified first-party upstream domains in `network.rs`:

| Domain | Scope |
| :--- | :--- |
| `piston-meta.mojang.com` | Mojang version manifests and game definitions |
| `launchermeta.mojang.com` | Legacy Mojang metadata services |
| `launchercontent.mojang.com` | Official Mojang launcher news, images, and patch notes |
| `piston-data.mojang.com` | Official game client, server, and asset downloads |
| `libraries.minecraft.net` | Mojang signed game libraries |
| `resources.download.minecraft.net` | Minecraft sound assets, textures, and languages |
| `meta.fabricmc.net` | Fabric loader versions and intermediary mappings |
| `maven.fabricmc.net` | Fabric libraries and artifacts |
| `meta.quiltmc.org` | Quilt loader versions |
| `maven.quiltmc.org` | Quilt libraries and artifacts |
| `maven.neoforged.net` | NeoForge installer and library artifacts |
| `maven.minecraftforge.net` | Forge installer and library artifacts |
| `files.minecraftforge.net` | Forge mirror dependencies |
| `api.adoptium.net` | Eclipse Temurin OpenJDK runtime builds |
| `login.live.com` | Microsoft authentication oauth endpoints |
| `api.minecraftservices.com` | Official Microsoft-entitled Minecraft profile API |

Implementation in 1.5.0 selects the newest dated entry tagged Java, preserves its actual title and validates its HTTPS minecraft.net article link. Fetches are cached for 15 minutes; failed refreshes use validated cached data. The older v1 endpoint was observed to contain stale entries and is not used.
