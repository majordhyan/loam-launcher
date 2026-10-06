//! On-demand evidence about the running binary; never infers signed status from config.
use crate::{model::Result, storage};
use serde_json::{json, Value};

pub fn verify_app() -> Result<Value> {
    let executable = std::env::current_exe().map_err(|_| "Cannot locate the running application.")?;
    let sha256 = storage::hash(&executable, "sha256")?;
    let mut signature = json!({"status":"Unverified","publisher":null,"thumbprint":null});
    #[cfg(windows)]
    {
        use std::{process::{Command, Stdio}, os::windows::process::CommandExt};
        // Constant script; the executable path travels only in the child environment.
        // No shell interpolation, profile scripts, policy changes, or user-supplied script.
        let script = "$s=Get-AuthenticodeSignature -LiteralPath $env:LOAM_VERIFY_EXE; @{status=$s.Status.ToString();publisher=if($s.SignerCertificate){$s.SignerCertificate.GetNameInfo('SimpleName',$false)}else{$null};thumbprint=if($s.SignerCertificate){$s.SignerCertificate.Thumbprint}else{$null}} | ConvertTo-Json -Compress";
        let shell = std::env::var_os("SystemRoot").map(std::path::PathBuf::from)
            .ok_or("Windows directory is unavailable.")?.join("System32/WindowsPowerShell/v1.0/powershell.exe");
        let mut child = Command::new(shell).args(["-NoProfile", "-NonInteractive", "-Command", script])
            .env("LOAM_VERIFY_EXE", &executable).creation_flags(0x08000000)
            .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null())
            .spawn().map_err(|_| "Signature checker could not start.")?;
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(10);
        loop {
            if child.try_wait().map_err(|_| "Signature checker failed.")?.is_some() { break; }
            if std::time::Instant::now() >= deadline {
                let _ = child.kill(); let _ = child.wait();
                return Err("LOAM-SGN-TIMEOUT: Signature check timed out. Try again.".into());
            }
            std::thread::sleep(std::time::Duration::from_millis(25));
        }
        if let Ok(output) = child.wait_with_output() {
            if output.status.success() {
                if let Ok(parsed) = serde_json::from_slice::<Value>(&output.stdout) { signature = parsed; }
            }
        }
    }
    Ok(json!({"sha256":sha256,"signature":signature,"version":env!("CARGO_PKG_VERSION"),
        "installSource":"Unknown — not recorded by this installer", "edition":"Lite", "seedVersion":null}))
}
