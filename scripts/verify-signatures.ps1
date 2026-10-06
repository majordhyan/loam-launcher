param([string]$Config = 'release.config.json')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$release = Get-Content -LiteralPath (Join-Path $root $Config) -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($release.publisher)) { throw 'LOAM-SGN-CONFIG: release publisher is not configured.' }
if (-not $release.artifacts.Count) { throw 'LOAM-SGN-CONFIG: no release artifacts declared.' }
$signTool = Get-Command signtool.exe -ErrorAction Stop
foreach ($relative in $release.artifacts) {
    $path = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "LOAM-SGN-MISSING: $relative" }
    $signature = Get-AuthenticodeSignature -LiteralPath $path
    if ($signature.Status -ne 'Valid') { throw "LOAM-SGN-INVALID: $relative ($($signature.Status))" }
    if (-not $signature.TimeStamperCertificate) { throw "LOAM-SGN-TIMESTAMP: $relative" }
    $publisher = $signature.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
    if ($publisher -cne $release.publisher) { throw "LOAM-SGN-PUBLISHER: $relative" }
    & $signTool.Source verify /pa /all /v /tw $path
    if ($LASTEXITCODE) { throw "LOAM-SGN-VERIFY: $relative" }
    [pscustomobject]@{ Artifact=$relative; Publisher=$publisher; Status='Valid'; SHA256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
}
