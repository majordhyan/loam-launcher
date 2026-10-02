# Versions, sources and licensing decisions

Locked package versions are in `package-lock.json` and `src-tauri/Cargo.lock`. `dependency-inventory.json` records locally installed package licenses; the app bundles their available notice texts in `public/third-party-notices.txt`. Regenerate with `python scripts/notices.py` after changing dependencies. This inventory includes build-only dependencies; it is not a declaration that all listed code is shipped.

Core choices: Tauri 2.12, React 19.3, TypeScript 7.0.2, Vite 8.3.1; Tauri updater 2.13, dialog 2.8, opener 2.6 and single-instance 2.5. Development toolchain: Rust 1.98.1 MSVC, Node 24.18, Visual Studio 2026 C++ tools and Windows SDK 10.0.26100. Lockfiles are the exact dependency record.

Geist and Geist Mono 5.3 are locally bundled through Fontsource under SIL OFL. React is MIT; Tauri/Rust libraries use their stated MIT/Apache/permissive licenses; Lucide icons are ISC. The wordmark and installer graphics are original geometric vector work. No Minecraft art is bundled. LOAM's own distribution license has not been chosen by the owner; no third-party license grants rights to Minecraft itself.

Game binaries and libraries are downloaded from Mojang's official manifests, never mirrored or redistributed in LOAM's installer. Minecraft ownership and use remain subject to [Minecraft's terms and usage guidelines](https://www.minecraft.net/en-us/usage-guidelines).

Managed Java uses Eclipse Temurin Windows x64 JRE ZIPs from the [Adoptium API](https://api.adoptium.net/q/swagger-ui/), verified with the provided SHA-256. Java is not bundled in the installer. Its archive license/notice files remain in the extracted runtime. Temurin is provided under GPLv2 with the applicable Classpath/Assembly exceptions; see [Adoptium licensing](https://adoptium.net/about/) and the particular downloaded runtime's license files. No claim is made that a permissive application license replaces runtime obligations.

Primary sources consulted on 2026-09-30:

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Windows packaging](https://v2.tauri.app/distribute/windows-installer/), [updater](https://v2.tauri.app/plugin/updater/).
- [Microsoft authorization code and PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow). Full approved Minecraft/Xbox app access remains blocked.
- [Mojang live manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json): latest release 26.3 was observed; 1.16.1 and 26.3 metadata require Java 8 and Java 25 respectively.
- [Fabric metadata endpoints](https://wiki.fabricmc.net/documentation:modpack_related_endpoints), [live metadata](https://meta.fabricmc.net/v2/versions/loader/26.3), [Fabric version predicate semantics](https://github.com/FabricMC/fabric-loader/blob/master/src/main/java/net/fabricmc/loader/api/metadata/version/VersionComparisonOperator.java). Fabric 0.19.5 was available for 26.3. LOAM's compatibility checker was independently implemented to handle Fabric's empty prerelease floor and caret behavior, which differ from Cargo semver requirements.
- [Modrinth version API](https://docs.modrinth.com/api/operations/getprojectversions/), [mrpack format](https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack). LOAM restricts pack downloads to Modrinth's CDN and applies client overrides last; other format-permitted hosts are currently rejected explicitly.
- [authlib-injector](https://github.com/yushijinhun/authlib-injector) was reviewed for scope only. It is not a dependency and third-party authentication is not implemented in v1.

Test downloads, runtime archives and game/mod files under ignored `artifacts/` are evidence inputs, not distributable launcher assets.
