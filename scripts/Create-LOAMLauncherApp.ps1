<#
.SYNOPSIS
    Automated Microsoft Entra ID (Azure AD) App Registration script for LOAM Launcher.
.DESCRIPTION
    Creates an indefinite-lifetime, public-client App Registration in Microsoft Entra ID
    configured for LOAM Launcher (desktop Minecraft & Xbox Live authentication).
    Sets up multitenant + personal Microsoft account sign-in, public client flows,
    desktop redirect URIs, delegated Graph permissions, and an optional 24-month client secret.
.PARAMETER AppName
    The display name of the application in Entra ID. Defaults to 'LOAM Launcher'.
.PARAMETER RedirectUris
    Array of redirect URIs. Defaults to 'http://localhost' and Microsoft native client.
.PARAMETER CreateSecret
    Switch to generate a 24-month client secret.
.PARAMETER SecretDescription
    Label for the client secret. Defaults to 'LOAM-Launcher-Secret-1'.
#>

[CmdletBinding()]
param (
    [string]$AppName = "LOAM Launcher",
    [string[]]$RedirectUris = @(
        "http://localhost",
        "http://localhost:8400",
        "https://login.microsoftonline.com/common/oauth2/nativeclient"
    ),
    [switch]$CreateSecret = $true,
    [string]$SecretDescription = "LOAM-Launcher-Secret-1",
    [switch]$IncludeCertificate = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor DarkYellow
Write-Host " LOAM Launcher — Microsoft Entra ID App Registration" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor DarkYellow

# -------------------------------------------------------------------------
# STEP 1: VERIFY & IMPORT REQUIRED MICROSOFT GRAPH MODULES
# -------------------------------------------------------------------------
Write-Host "`n[1/6] Checking required Microsoft Graph PowerShell modules..." -ForegroundColor Cyan

$requiredModules = @("Microsoft.Graph.Authentication", "Microsoft.Graph.Applications")
foreach ($module in $requiredModules) {
    if (-not (Get-Module -ListAvailable -Name $module)) {
        Write-Host "Module '$module' not found. Installing for CurrentUser..." -ForegroundColor Yellow
        Install-Module -Name $module -Scope CurrentUser -Force -AllowClobber -Repository PSGallery
    }
    Write-Host "Importing module '$module'..." -ForegroundColor Gray
    Import-Module $module -ErrorAction SilentlyContinue
}

# -------------------------------------------------------------------------
# STEP 2: CONNECT TO MICROSOFT GRAPH WITH REQUIRED SCOPES
# -------------------------------------------------------------------------
Write-Host "`n[2/6] Connecting to Microsoft Graph..." -ForegroundColor Cyan

$requiredScopes = @(
    "Application.ReadWrite.All",
    "Directory.ReadWrite.All"
)

try {
    # Check if an existing valid session exists
    $context = Get-MgContext
    if (-not $context -or ($context.Scopes -notcontains "Application.ReadWrite.All")) {
        Write-Host "Initiating interactive sign-in with Application.ReadWrite.All..." -ForegroundColor Yellow
        Connect-MgGraph -Scopes $requiredScopes -NoWelcome
        $context = Get-MgContext
    }
    Write-Host "Successfully connected to tenant: $($context.TenantId) as $($context.Account)" -ForegroundColor Green
} catch {
    Write-Error "Failed to connect to Microsoft Graph. Error: $_"
    exit 1
}

# -------------------------------------------------------------------------
# STEP 3: CONFIGURE PERMISSIONS & CREATE APP REGISTRATION
# -------------------------------------------------------------------------
Write-Host "`n[3/6] Defining API permissions (Microsoft Graph User.Read)..." -ForegroundColor Cyan

# Resource ID for Microsoft Graph API
$graphAppId = "00000003-0000-0000-c000-000000000000"
# Delegated User.Read Permission ID
$userReadId = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"

$requiredResourceAccess = @(
    @{
        ResourceAppId = $graphAppId
        ResourceAccess = @(
            @{
                Id   = $userReadId
                Type = "Scope" # Delegated permission
            }
        )
    }
)

Write-Host "Registering '$AppName' with audience 'AzureADandPersonalMicrosoftAccount'..." -ForegroundColor Cyan

# Public client redirect configuration for desktop Minecraft launcher
$publicClientConfig = @{
    RedirectUris = $RedirectUris
}

try {
    # Create the Entra ID application
    $appParams = @{
        DisplayName            = $AppName
        SignInAudience         = "AzureADandPersonalMicrosoftAccount" # Allows Xbox / personal @outlook/@live & organizational
        IsFallbackPublicClient = $true                               # Enables OAuth2 Device Code & Public Client flows
        PublicClient           = $publicClientConfig
        RequiredResourceAccess = $requiredResourceAccess
        Description            = "Authentication registration for LOAM Launcher (Lightweight Minecraft & Xbox Live client)"
    }

    $app = New-MgApplication @appParams
    Write-Host "Application successfully created! App ObjectId: $($app.Id)" -ForegroundColor Green

    # Corresponding Service Principal in current tenant
    $sp = Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'" -ErrorAction SilentlyContinue
    if (-not $sp) {
        Write-Host "Creating local Service Principal for the application..." -ForegroundColor Gray
        $sp = New-MgServicePrincipal -AppId $app.AppId
    }
} catch {
    Write-Error "Failed to create Application in Microsoft Entra ID: $_"
    exit 1
}

# -------------------------------------------------------------------------
# STEP 4: CREATE CLIENT CREDENTIALS (SECRET / OPTIONAL CERTIFICATE)
# -------------------------------------------------------------------------
$secretValue = $null
$secretExpiry = $null

if ($CreateSecret) {
    Write-Host "`n[4/6] Generating 24-month Client Secret..." -ForegroundColor Cyan
    try {
        $expiryDate = (Get-Date).AddMonths(24)
        $passwordCredential = @{
            DisplayName = $SecretDescription
            EndDateTime = $expiryDate
        }

        $secretObj = New-MgApplicationPasswordCredential -ApplicationId $app.Id -PasswordCredential $passwordCredential
        $secretValue = $secretObj.SecretText
        $secretExpiry = $expiryDate.ToString("yyyy-MM-dd HH:mm:ss UTC")
        Write-Host "Client secret generated successfully (Valid until: $secretExpiry)" -ForegroundColor Green
    } catch {
        Write-Warning "Could not create client secret automatically: $_"
    }
}

# Optional Self-Signed Certificate
if ($IncludeCertificate) {
    Write-Host "`n[Optional] Generating self-signed certificate for LOAM Launcher..." -ForegroundColor Cyan
    $cert = New-SelfSignedCertificate -Subject "CN=$AppName" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA -HashAlgorithm SHA256
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $keyCredential = @{
        Type  = "AsymmetricX509Cert"
        Usage = "Verify"
        Key   = $certBytes
        DisplayName = "LOAM-SelfSigned-Cert"
        EndDateTime = (Get-Date).AddMonths(24)
    }
    Add-MgApplicationKey -ApplicationId $app.Id -KeyCredential $keyCredential | Out-Null
    Write-Host "Certificate added to Entra ID (Thumbprint: $($cert.Thumbprint))" -ForegroundColor Green
}

# -------------------------------------------------------------------------
# STEP 5: OUTPUT CONFIGURATION DETAILS FOR LOAM LAUNCHER
# -------------------------------------------------------------------------
Write-Host "`n==========================================================" -ForegroundColor DarkYellow
Write-Host " LOAM LAUNCHER — ENTRA ID REGISTRATION SUCCESS" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor DarkYellow

$tenantId = $context.TenantId
$appId = $app.AppId
$objectId = $app.Id

Write-Host " Application (Client) ID : " -NoNewline; Write-Host "$appId" -ForegroundColor Yellow
Write-Host " Directory (Tenant) ID   : " -NoNewline; Write-Host "$tenantId" -ForegroundColor Yellow
Write-Host " Object ID               : " -NoNewline; Write-Host "$objectId" -ForegroundColor Gray
Write-Host " Sign-In Audience        : " -NoNewline; Write-Host "$($app.SignInAudience)" -ForegroundColor White
Write-Host " Public Client Flow      : " -NoNewline; Write-Host "Enabled (IsFallbackPublicClient = true)" -ForegroundColor Green

if ($secretValue) {
    Write-Host "`n ----------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " CLIENT SECRET VALUE (COPY NOW - SHOWN ONCE):" -ForegroundColor Red
    Write-Host " $secretValue" -ForegroundColor White -BackgroundColor DarkRed
    Write-Host " Secret Expiration Date  : $secretExpiry" -ForegroundColor Yellow
    Write-Host " ----------------------------------------------------------" -ForegroundColor DarkGray
}

Write-Host "`n Configured Redirect URIs:" -ForegroundColor White
foreach ($uri in $RedirectUris) {
    Write-Host "  • $uri" -ForegroundColor Cyan
}

Write-Host "`n Configured Scopes (OAuth 2.0):" -ForegroundColor White
Write-Host "  • Microsoft Graph  : User.Read (offline_access)" -ForegroundColor Cyan
Write-Host "  • Xbox Live Scope  : XboxLive.signin, XboxLive.offline_access" -ForegroundColor Cyan

# -------------------------------------------------------------------------
# STEP 6: LOAM INTEGRATION SNIPPET (RUST / JSON)
# -------------------------------------------------------------------------
Write-Host "`n[6/6] Configuration snippet for LOAM Launcher:" -ForegroundColor Cyan

$loamAuthConfig = @"
{{
  "auth": {{
    "clientId": "$appId",
    "authority": "https://login.microsoftonline.com/consumers",
    "redirectUri": "http://localhost:8400",
    "scopes": [
      "XboxLive.signin",
      "offline_access"
    ]
  }}
}}
"@

Write-Host $loamAuthConfig -ForegroundColor Gray

Write-Host "`n[NOTE: LIFETIME & SECURITY CONSIDERATIONS]" -ForegroundColor DarkYellow
Write-Host " 1. Application (Client) ID never expires and remains active for the lifetime of your tenant." -ForegroundColor White
Write-Host " 2. In LOAM Launcher (desktop public client), Client Secret is OPTIONAL when using PKCE." -ForegroundColor White
Write-Host " 3. If using client secrets, Entra ID caps them at 24 months. Use 'Rotate-LOAMSecret.ps1' before expiry." -ForegroundColor White
Write-Host " 4. Never commit client secrets to git. Store securely in local OS credential storage (Keyring)." -ForegroundColor White
Write-Host "==========================================================`n" -ForegroundColor DarkYellow
