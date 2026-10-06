<#
.SYNOPSIS
    Rotates the Microsoft Entra ID Client Secret for LOAM Launcher.
.DESCRIPTION
    Searches for the existing LOAM Launcher application registration in Microsoft Entra ID,
    generates a new 24-month client secret, outputs the secret securely, and lists existing
    older credentials marked for manual verification and decommission.
.PARAMETER AppId
    The Application (client) ID or App Object ID. If not provided, searches by AppName.
.PARAMETER AppName
    The Display Name of the app in Entra ID. Defaults to 'LOAM Launcher'.
.PARAMETER NewSecretDescription
    Description tag for the rotated secret. Defaults to 'LOAM-Secret-Rotated-<Date>'.
#>

[CmdletBinding()]
param (
    [string]$AppId = "",
    [string]$AppName = "LOAM Launcher",
    [string]$NewSecretDescription = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor DarkYellow
Write-Host " LOAM Launcher — Client Secret Rotation Engine" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor DarkYellow

# Connect to Graph if not connected
Import-Module Microsoft.Graph.Authentication, Microsoft.Graph.Applications -ErrorAction SilentlyContinue
$context = Get-MgContext
if (-not $context) {
    Connect-MgGraph -Scopes "Application.ReadWrite.All" -NoWelcome
}

# 1. Locate Application
$app = $null
if ($AppId) {
    Write-Host "Locating LOAM registration with Client ID: $AppId..." -ForegroundColor Cyan
    $app = Get-MgApplication -Filter "appId eq '$AppId'" -ErrorAction SilentlyContinue
    if (-not $app) {
        $app = Get-MgApplication -ApplicationId $AppId -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Locating LOAM registration with DisplayName '$AppName'..." -ForegroundColor Cyan
    $apps = Get-MgApplication -Filter "displayName eq '$AppName'"
    if ($apps.Count -eq 1) {
        $app = $apps[0]
    } elseif ($apps.Count -gt 1) {
        Write-Error "Multiple applications found matching '$AppName'. Please pass -AppId explicitly."
        exit 1
    }
}

if (-not $app) {
    Write-Error "Could not find LOAM Launcher application registration in this tenant."
    exit 1
}

Write-Host "Found Application: $($app.DisplayName) (ObjectId: $($app.Id), AppId: $($app.AppId))" -ForegroundColor Green

# 2. Inspect Existing Secrets
Write-Host "`nExisting Password Credentials:" -ForegroundColor Cyan
if ($app.PasswordCredentials.Count -eq 0) {
    Write-Host "  (No active secrets found on this registration)" -ForegroundColor Gray
} else {
    foreach ($cred in $app.PasswordCredentials) {
        $status = if ($cred.EndDateTime -lt (Get-Date)) { "[EXPIRED]" } else { "[ACTIVE]" }
        Write-Host "  • KeyId: $($cred.KeyId) | Name: $($cred.DisplayName) | Expires: $($cred.EndDateTime) $status" -ForegroundColor Gray
    }
}

# 3. Create New Rotated Secret
if (-not $NewSecretDescription) {
    $NewSecretDescription = "LOAM-Secret-Rotated-$((Get-Date).ToString('yyyyMMdd'))"
}

$newExpiry = (Get-Date).AddMonths(24)
$credentialParams = @{
    DisplayName = $NewSecretDescription
    EndDateTime = $newExpiry
}

Write-Host "`nGenerating new 24-month rotated client secret ('$NewSecretDescription')..." -ForegroundColor Cyan
$newSecret = New-MgApplicationPasswordCredential -ApplicationId $app.Id -PasswordCredential $credentialParams

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " NEW ROTATED CLIENT SECRET GENERATED" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " New Secret KeyId     : $($newSecret.KeyId)" -ForegroundColor Cyan
Write-Host " New Secret Expiry    : $($newExpiry.ToString('yyyy-MM-dd HH:mm:ss UTC'))" -ForegroundColor Yellow
Write-Host "`n NEW SECRET VALUE (COPY NOW - WILL NEVER BE SHOWN AGAIN):" -ForegroundColor Red
Write-Host " $($newSecret.SecretText)" -ForegroundColor White -BackgroundColor DarkRed
Write-Host "==========================================================" -ForegroundColor Green

# 4. Safe Decommission Guidance
Write-Host "`n[SAFE ROTATION BEST PRACTICES]:" -ForegroundColor DarkYellow
Write-Host " 1. Update LOAM's secure configuration with the new secret value." -ForegroundColor White
Write-Host " 2. Verify that authentication succeeds with the new secret." -ForegroundColor White
Write-Host " 3. Once verified, delete the old secret using:" -ForegroundColor White
if ($app.PasswordCredentials.Count -gt 0) {
    $oldKeyId = $app.PasswordCredentials[0].KeyId
    Write-Host "    Remove-MgApplicationPasswordCredential -ApplicationId $($app.Id) -KeyId $oldKeyId" -ForegroundColor Cyan
} else {
    Write-Host "    Remove-MgApplicationPasswordCredential -ApplicationId $($app.Id) -KeyId <OldKeyId>" -ForegroundColor Cyan
}
Write-Host "==========================================================`n" -ForegroundColor DarkYellow
