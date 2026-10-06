//! On-demand evidence about the running binary; never infers signed status from config.
use crate::{model::Result, storage};
use serde_json::{json, Value};

pub fn verify_app() -> Result<Value> {
    let executable = std::env::current_exe().map_err(|_| "Cannot locate the running application.")?;
    let sha256 = storage::hash(&executable, "sha256")?;
    let status = authenticode_status(&executable);
    Ok(json!({"sha256":sha256,"signature":{"status":status,"publisher":null,"thumbprint":null},
        "version":env!("CARGO_PKG_VERSION"),
        "installSource":"Unknown — not recorded by this installer", "edition":"Lite", "seedVersion":null}))
}

/// Authenticode status from WinVerifyTrust, named like Get-AuthenticodeSignature reports it.
/// In-process, offline (cached revocation data only) and without UI: no child shell.
#[cfg(windows)]
fn authenticode_status(path: &std::path::Path) -> &'static str {
    use std::{ffi::c_void, os::windows::ffi::OsStrExt};
    #[repr(C)]
    struct Guid(u32, u16, u16, [u8; 8]);
    #[repr(C)]
    struct FileInfo { size: u32, path: *const u16, file: *mut c_void, subject: *const Guid }
    #[repr(C)]
    struct TrustData {
        size: u32, policy: *mut c_void, sip: *mut c_void, ui_choice: u32, revocation: u32,
        union_choice: u32, file: *mut FileInfo, state_action: u32, state: *mut c_void,
        url: *mut u16, prov_flags: u32, ui_context: u32, settings: *mut c_void,
    }
    #[link(name = "wintrust")]
    extern "system" {
        fn WinVerifyTrust(hwnd: *mut c_void, action: *const Guid, data: *mut c_void) -> i32;
    }
    const GENERIC_VERIFY_V2: Guid = Guid(0x00aa_c56b, 0xcd44, 0x11d0, [0x8c, 0xc2, 0x00, 0xc0, 0x4f, 0xc2, 0x95, 0xee]);
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let mut file = FileInfo { size: std::mem::size_of::<FileInfo>() as u32, path: wide.as_ptr(), file: std::ptr::null_mut(), subject: std::ptr::null() };
    let mut data = TrustData {
        size: std::mem::size_of::<TrustData>() as u32, policy: std::ptr::null_mut(), sip: std::ptr::null_mut(),
        ui_choice: 2 /* WTD_UI_NONE */, revocation: 0 /* WTD_REVOKE_NONE */, union_choice: 1 /* WTD_CHOICE_FILE */,
        file: &mut file, state_action: 1 /* WTD_STATEACTION_VERIFY */, state: std::ptr::null_mut(), url: std::ptr::null_mut(),
        prov_flags: 0x1000 /* WTD_CACHE_ONLY_URL_RETRIEVAL */, ui_context: 0, settings: std::ptr::null_mut(),
    };
    let result = unsafe { WinVerifyTrust(std::ptr::null_mut(), &GENERIC_VERIFY_V2, &mut data as *mut _ as *mut c_void) };
    data.state_action = 2; // WTD_STATEACTION_CLOSE releases the verifier's state.
    unsafe { WinVerifyTrust(std::ptr::null_mut(), &GENERIC_VERIFY_V2, &mut data as *mut _ as *mut c_void) };
    match result as u32 {
        0 => "Valid",
        0x800B_0100 => "NotSigned",       // TRUST_E_NOSIGNATURE
        0x8009_6010 => "HashMismatch",    // TRUST_E_BAD_DIGEST
        0x800B_0109 => "NotTrusted",      // CERT_E_UNTRUSTEDROOT
        _ => "UnknownError",
    }
}

#[cfg(not(windows))]
fn authenticode_status(_path: &std::path::Path) -> &'static str { "Unverified" }

#[cfg(all(test, windows))]
mod tests {
    #[test]
    fn unsigned_test_binary_reports_not_signed() {
        let exe = std::env::current_exe().unwrap();
        assert_eq!(super::authenticode_status(&exe), "NotSigned");
    }
    #[test]
    fn embedded_signature_reports_valid() {
        // Edge ships with an embedded Authenticode signature on every supported Windows install.
        let edge = std::path::PathBuf::from(std::env::var("ProgramFiles(x86)").unwrap()).join("Microsoft/Edge/Application/msedge.exe");
        if edge.exists() { assert_eq!(super::authenticode_status(&edge), "Valid"); }
    }
}
