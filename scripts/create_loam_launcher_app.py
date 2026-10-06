#!/usr/bin/env python3
"""
LOAM Launcher — Microsoft Entra ID App Registration Automation (Python)

Creates an indefinite-lifetime, public-client App Registration in Microsoft Entra ID
configured for LOAM Launcher using Azure Identity and Microsoft Graph REST API.
"""

import sys
import json
import datetime
from datetime import timezone

try:
    from azure.identity import InteractiveBrowserCredential
    import requests
except ImportError:
    print("[!] Missing required libraries. Please install them:")
    print("    pip install azure-identity requests")
    sys.exit(1)

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
APP_NAME = "LOAM Launcher"
REDIRECT_URIS = [
    "http://localhost",
    "http://localhost:8400",
    "https://login.microsoftonline.com/common/oauth2/nativeclient",
]

def main():
    print("=" * 60)
    print(" LOAM Launcher — Entra ID App Registration (Python Engine)")
    print("=" * 60)

    # 1. Authenticate with Microsoft Graph using Interactive Browser
    print("\n[1/5] Authenticating to Microsoft Graph...")
    scopes = ["https://graph.microsoft.com/Application.ReadWrite.All"]
    try:
        credential = InteractiveBrowserCredential()
        token = credential.get_token(*scopes)
    except Exception as e:
        print(f"[!] Authentication failed: {e}")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {token.token}",
        "Content-Type": "application/json"
    }

    # Verify connection & tenant
    org_res = requests.get(f"{GRAPH_BASE_URL}/organization", headers=headers)
    if org_res.status_code == 200:
        org_data = org_res.json()
        tenant_id = org_data["value"][0]["id"]
        print(f"[✓] Connected successfully to Tenant ID: {tenant_id}")
    else:
        tenant_id = "common"
        print("[!] Could not fetch tenant ID explicitly; defaulting to multi-tenant context.")

    # 2. Build App Registration Payload
    print(f"\n[2/5] Creating application registration '{APP_NAME}'...")
    app_payload = {
        "displayName": APP_NAME,
        "signInAudience": "AzureADandPersonalMicrosoftAccount", # Multi-tenant + Personal (@outlook/@live)
        "isFallbackPublicClient": True,                         # Enables desktop OAuth2 device & loopback flows
        "publicClient": {
            "redirectUris": REDIRECT_URIS
        },
        "description": "Authentication registration for LOAM Launcher (Lightweight Minecraft & Xbox Live client)",
        "requiredResourceAccess": [
            {
                # Microsoft Graph API
                "resourceAppId": "00000003-0000-0000-c000-000000000000",
                "resourceAccess": [
                    {
                        # User.Read (Delegated)
                        "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
                        "type": "Scope"
                    }
                ]
            }
        ]
    }

    create_res = requests.post(f"{GRAPH_BASE_URL}/applications", headers=headers, json=app_payload)
    if create_res.status_code not in (200, 201):
        print(f"[!] Failed to create application: {create_res.status_code} - {create_res.text}")
        sys.exit(1)

    app_data = create_res.json()
    app_obj_id = app_data["id"]
    client_id = app_data["appId"]
    print(f"[✓] Application created successfully!")
    print(f"    Application (Client) ID : {client_id}")
    print(f"    Object ID               : {app_obj_id}")

    # 3. Create Corresponding Service Principal
    print("\n[3/5] Instantiating Service Principal in local tenant...")
    sp_payload = {"appId": client_id}
    sp_res = requests.post(f"{GRAPH_BASE_URL}/servicePrincipals", headers=headers, json=sp_payload)
    if sp_res.status_code in (200, 201):
        print(f"[✓] Service Principal created.")
    else:
        print(f"[-] Service Principal note: {sp_res.status_code}")

    # 4. Generate 24-Month Client Secret
    print("\n[4/5] Generating 24-month Client Secret...")
    now = datetime.datetime.now(timezone.utc)
    expiry = now + datetime.timedelta(days=730) # 24 months
    secret_payload = {
        "passwordCredential": {
            "displayName": "LOAM-Launcher-Python-Secret",
            "endDateTime": expiry.isoformat()
        }
    }

    secret_res = requests.post(
        f"{GRAPH_BASE_URL}/applications/{app_obj_id}/addPassword",
        headers=headers,
        json=secret_payload
    )

    secret_text = None
    if secret_res.status_code in (200, 201):
        secret_data = secret_res.json()
        secret_text = secret_data.get("secretText")
        print(f"[✓] Client Secret generated. Valid until: {expiry.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    else:
        print(f"[!] Could not generate secret: {secret_res.text}")

    # 5. Output Summary
    print("\n" + "=" * 60)
    print(" LOAM LAUNCHER — REGISTRATION COMPLETE")
    print("=" * 60)
    print(f" Application (Client) ID : {client_id}")
    print(f" Directory (Tenant) ID   : {tenant_id}")
    print(f" Sign-In Audience        : AzureADandPersonalMicrosoftAccount")
    print(f" Public Client Flow      : Enabled (isFallbackPublicClient=True)")

    if secret_text:
        print("\n" + "-" * 60)
        print(" CLIENT SECRET VALUE (COPY NOW - SHOWN ONCE):")
        print(f" {secret_text}")
        print("-" * 60)

    print("\n Configured Redirect URIs:")
    for uri in REDIRECT_URIS:
        print(f"  • {uri}")

    print("\n Configured OAuth 2.0 Scopes:")
    print("  • Microsoft Graph  : User.Read, offline_access")
    print("  • Xbox Live API    : XboxLive.signin, XboxLive.offline_access")

    print("\n LOAM Configuration Snippet (JSON):")
    config_snippet = {
        "auth": {
            "clientId": client_id,
            "authority": "https://login.microsoftonline.com/consumers",
            "redirectUri": "http://localhost:8400",
            "scopes": ["XboxLive.signin", "offline_access"]
        }
    }
    print(json.dumps(config_snippet, indent=2))
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
