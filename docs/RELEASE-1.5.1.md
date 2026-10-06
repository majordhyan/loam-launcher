# LOAM 1.5.1 — UI hotfix

## Changes and source locations
- `src/VerificationTools.tsx`: removed Verify this app UI and signature request entirely; retained game diagnostics with its own Checking game label.
- `src/App.tsx`: update button is rendered only when `snap.configuration.updates` is true. The unconfigured developer banner is replaced by a plain manual-update explanation.
- `src/lib/confirmation.ts`: removal confirmation requires the full game name, ignoring case and surrounding whitespace. The native command still receives the canonical name and retains its exact-name validation. No real user game was deleted during verification.
- `src/motion/index.ts`: explain the effective motion mode; reset the performance safeguard when a preference is chosen. Windows reduced motion remains respected. Full no longer silently downgrades due to performance sampling.
- `src/motion/navigation.ts`: clear obsolete snapshot names between interrupted transitions; track actual transition activity for the WAAPI fallback.
- `src/motion/tokens.css`: Compact/Large scale the app controls, including pixel-sized elements.

## Clean conditional rendering
The Updates section in App.tsx uses the existing configuration capability:

```tsx
{snap.configuration.updates ? (
  <button disabled={busy} onClick={() => void checkUpdates()}>
    CHECK FOR UPDATES
  </button>
) : (
  <p>Automatic update checks are unavailable in this version.</p>
)}
```

No runtime CSS injection or DOM removal is required. The Verify this app markup is removed from VerificationTools.tsx rather than hidden behind CSS.

## Verification
- 17 frontend automated tests passed, including confirmation validation and mocked transition interruption tests.
- TypeScript and production frontend build passed.
- Browser preview: size and motion controls respond, preference survives reload, Verify this app absent, unavailable update button absent, no captured console errors.
- Browser environment reports Windows reduced motion. Full-motion visual playback was not verified; enable Windows Settings > Accessibility > Visual effects > Animation effects, then select Full in LOAM.
- This pass changes presentation and confirmation handling, not authentication or the native removal implementation.
- The installer is unsigned. Hiding the verification panel does not change Windows publisher/signature status.
- Existing large Skin Studio bundle warning remains. Fresh installed-app, clean-machine, game launch, and full performance testing were not repeated in this hotfix.


## Minecraft data layout (1.5.1)
The installer creates `%APPDATA%\LoamLauncher` with games, cache/assets, cache/libraries, cache/versions, cache/runtimes, downloads, backups, logs and reports. Fresh app installations use this root. Existing state and explicit custom storage pointers take precedence, so an upgrade cannot hide existing worlds.

Each game under `games/<profile - version>` gets mods, resourcepacks, shaderpacks, saves, screenshots, logs, config, defaultconfigs, datapacks and server-resource-packs on creation/startup. Minecraft itself generates options.txt, servers.dat, and other runtime files when needed. World datapacks belong inside the individual world's datapacks folder.

Use Settings > Storage & Java > Change data folder to select an empty destination. The existing migration workflow verifies file copies and retains the original; restart LOAM to activate the selected folder. Installer application destination and Minecraft data destination are separate settings.

Storage verification: 25 Rust unit tests and 17 integration tests passed (the new default-root case also ran separately). Coverage includes preservation of existing/custom roots and repeated folder preparation without overwriting a world. Frontend checks passed; NSIS build result and artifact checksum are recorded alongside the exported installer.
