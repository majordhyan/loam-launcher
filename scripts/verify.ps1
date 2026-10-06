param([switch]$Release)
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    & ./scripts/forbidden-strings.ps1
    if ($LASTEXITCODE) { throw 'Product-copy scan failed.' }
    & npm.cmd test
    if ($LASTEXITCODE) { throw 'Frontend tests failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE) { throw 'Frontend build failed.' }
    & ./scripts/dev-shell.ps1 cargo test --manifest-path src-tauri/Cargo.toml
    if ($LASTEXITCODE) { throw 'Rust tests failed.' }
    & ./scripts/dev-shell.ps1 -CommandArgs @('cargo','clippy','--manifest-path','src-tauri/Cargo.toml','--all-targets','--','-D','warnings')
    if ($LASTEXITCODE) { throw 'Clippy failed.' }
    if ($Release) {
        & node scripts/release-check.mjs
        if ($LASTEXITCODE) { throw 'Public release configuration blocked.' }
        & ./scripts/verify-signatures.ps1
        if ($LASTEXITCODE) { throw 'Release signature verification failed.' }
    }
} finally { Pop-Location }
