//! Windows-specific performance optimizations: High Performance GPU preference,
//! process priority elevation (Above Normal), EcoQoS / power throttling opt-out,
//! game window visibility detection, and graceful WM_CLOSE shutdown.

#[cfg(windows)]
use std::{ffi::c_void, os::windows::ffi::OsStrExt, path::Path};

#[cfg(windows)]
fn wide(s: &std::ffi::OsStr) -> Vec<u16> {
    s.encode_wide().chain(Some(0)).collect()
}

/// Asks Windows to run this Java on the high-performance GPU: the same per-user value
/// Settings > Display > Graphics writes. Reversible, HKCU only, no child process.
#[cfg(windows)]
pub fn set_high_performance_gpu(java_exe: &Path) {
    let key = wide(std::ffi::OsStr::new(r"Software\Microsoft\DirectX\UserGpuPreferences"));
    let name = wide(java_exe.as_os_str());
    let value = wide(std::ffi::OsStr::new("GpuPreference=2;"));
    unsafe {
        let mut hkey: win32::HKEY = std::ptr::null_mut();
        if win32::RegCreateKeyExW(win32::HKEY_CURRENT_USER, key.as_ptr(), 0, std::ptr::null(), 0,
            win32::KEY_SET_VALUE, std::ptr::null(), &mut hkey, std::ptr::null_mut()) != 0 {
            return;
        }
        win32::RegSetValueExW(hkey, name.as_ptr(), 0, win32::REG_SZ, value.as_ptr() as *const u8,
            (value.len() * 2) as u32);
        win32::RegCloseKey(hkey);
    }
}

/// Ends the game process LOAM started. Minecraft's JVM starts no children of its own.
#[cfg(windows)]
pub fn terminate_process(pid: u32) -> bool {
    unsafe {
        let handle = win32::OpenProcess(win32::PROCESS_TERMINATE, 0, pid);
        if handle.is_null() {
            return false;
        }
        let ok = win32::TerminateProcess(handle, 1) != 0;
        win32::CloseHandle(handle);
        ok
    }
}

#[cfg(windows)]
pub fn optimize_game_process(pid: u32) {
    unsafe {
        let handle = win32::OpenProcess(
            win32::PROCESS_SET_INFORMATION | win32::PROCESS_QUERY_LIMITED_INFORMATION,
            0,
            pid,
        );
        if handle.is_null() {
            return;
        }

        // Set Above Normal priority (0x00008000)
        win32::SetPriorityClass(handle, win32::ABOVE_NORMAL_PRIORITY_CLASS);

        // Opt out of EcoQoS / power throttling on Windows 10/11
        #[repr(C)]
        struct ProcessPowerThrottlingState {
            version: u32,
            control_mask: u32,
            state_mask: u32,
        }
        let throttling = ProcessPowerThrottlingState {
            version: 1, // PROCESS_POWER_THROTTLING_CURRENT_VERSION
            control_mask: 0x1, // PROCESS_POWER_THROTTLING_EXECUTION_SPEED
            state_mask: 0, // 0 = disabled / opt-out
        };
        win32::SetProcessInformation(
            handle,
            win32::PROCESS_POWER_THROTTLING,
            &throttling as *const _ as *const c_void,
            std::mem::size_of::<ProcessPowerThrottlingState>() as u32,
        );

        win32::CloseHandle(handle);
    }
}

#[cfg(windows)]
pub fn find_game_window(pid: u32) -> Option<win32::HWND> {
    struct Search {
        target_pid: u32,
        found_hwnd: Option<win32::HWND>,
    }

    unsafe extern "system" fn enum_proc(hwnd: win32::HWND, lparam: win32::LPARAM) -> win32::BOOL {
        let search = &mut *(lparam as *mut Search);
        let mut window_pid = 0u32;
        win32::GetWindowThreadProcessId(hwnd, &mut window_pid);
        if window_pid == search.target_pid && win32::IsWindowVisible(hwnd) != 0 {
            let mut rect = win32::RECT { left: 0, top: 0, right: 0, bottom: 0 };
            if win32::GetWindowRect(hwnd, &mut rect) != 0 && (rect.right - rect.left > 100) && (rect.bottom - rect.top > 100) {
                search.found_hwnd = Some(hwnd);
                return 0; // stop enumeration
            }
        }
        1 // continue
    }

    let mut search = Search {
        target_pid: pid,
        found_hwnd: None,
    };

    unsafe {
        win32::EnumWindows(Some(enum_proc), &mut search as *mut _ as win32::LPARAM);
    }

    search.found_hwnd
}

#[cfg(windows)]
pub fn post_graceful_close(pid: u32) -> bool {
    if let Some(hwnd) = find_game_window(pid) {
        unsafe {
            win32::PostMessageW(hwnd, win32::WM_CLOSE, 0, 0);
            return true;
        }
    }
    false
}

#[cfg(not(windows))]
pub fn set_high_performance_gpu(_java_exe: &std::path::Path) {}
#[cfg(not(windows))]
pub fn terminate_process(_pid: u32) -> bool { false }
#[cfg(not(windows))]
pub fn optimize_game_process(_pid: u32) {}
#[cfg(not(windows))]
pub fn post_graceful_close(_pid: u32) -> bool { false }

#[cfg(windows)]
// Keep the official Win32 names at this FFI boundary.
#[allow(clippy::upper_case_acronyms)]
mod win32 {
    use std::ffi::c_void;

    pub type BOOL = i32;
    pub type DWORD = u32;
    pub type HANDLE = *mut c_void;
    pub type HWND = *mut c_void;
    pub type LPARAM = isize;
    pub type WNDENUMPROC = unsafe extern "system" fn(HWND, LPARAM) -> BOOL;
    pub type HKEY = *mut c_void;

    pub const HKEY_CURRENT_USER: HKEY = 0x8000_0001_usize as HKEY;
    pub const KEY_SET_VALUE: DWORD = 0x0002;
    pub const REG_SZ: DWORD = 1;
    pub const PROCESS_TERMINATE: DWORD = 0x0001;

    pub const PROCESS_SET_INFORMATION: DWORD = 0x0200;
    pub const PROCESS_QUERY_LIMITED_INFORMATION: DWORD = 0x1000;
    pub const ABOVE_NORMAL_PRIORITY_CLASS: DWORD = 0x00008000;
    pub const PROCESS_POWER_THROTTLING: u32 = 4;
    pub const WM_CLOSE: u32 = 0x0010;

    #[repr(C)]
    pub struct RECT {
        pub left: i32,
        pub top: i32,
        pub right: i32,
        pub bottom: i32,
    }

    #[link(name = "advapi32")]
    extern "system" {
        pub fn RegCreateKeyExW(hKey: HKEY, lpSubKey: *const u16, Reserved: DWORD, lpClass: *const u16, dwOptions: DWORD,
            samDesired: DWORD, lpSecurityAttributes: *const c_void, phkResult: *mut HKEY, lpdwDisposition: *mut DWORD) -> i32;
        pub fn RegSetValueExW(hKey: HKEY, lpValueName: *const u16, Reserved: DWORD, dwType: DWORD, lpData: *const u8, cbData: DWORD) -> i32;
        pub fn RegCloseKey(hKey: HKEY) -> i32;
    }

    extern "system" {
        pub fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        pub fn CloseHandle(hObject: HANDLE) -> BOOL;
        pub fn TerminateProcess(hProcess: HANDLE, uExitCode: u32) -> BOOL;
        pub fn SetPriorityClass(hProcess: HANDLE, dwPriorityClass: DWORD) -> BOOL;
        pub fn SetProcessInformation(
            hProcess: HANDLE,
            ProcessInformationClass: u32,
            ProcessInformation: *const c_void,
            ProcessInformationSize: DWORD,
        ) -> BOOL;
        pub fn EnumWindows(lpEnumFunc: Option<WNDENUMPROC>, lParam: LPARAM) -> BOOL;
        pub fn GetWindowThreadProcessId(hWnd: HWND, lpdwProcessId: *mut DWORD) -> DWORD;
        pub fn IsWindowVisible(hWnd: HWND) -> BOOL;
        pub fn GetWindowRect(hWnd: HWND, lpRect: *mut RECT) -> BOOL;
        pub fn PostMessageW(hWnd: HWND, Msg: u32, wParam: usize, lParam: isize) -> BOOL;
        pub fn DwmSetWindowAttribute(
            hWnd: HWND,
            dwAttribute: DWORD,
            pvAttribute: *const c_void,
            cbAttribute: DWORD,
        ) -> i32;
    }
}

#[cfg(windows)]
pub fn apply_dwm_window_theme(window: &tauri::WebviewWindow, is_dark: bool) {
    let Ok(handle) = window.hwnd() else { return; };
    let hwnd = handle.0;
    if hwnd.is_null() {
        return;
    }
    unsafe {
        let dark_mode = if is_dark { 1i32 } else { 0i32 };
        const DWMWA_USE_IMMERSIVE_DARK_MODE: u32 = 20;
        const DWMWA_BORDER_COLOR: u32 = 34;
        const DWMWA_CAPTION_COLOR: u32 = 35;
        const DWMWA_TEXT_COLOR: u32 = 36;

        let _ = win32::DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &dark_mode as *const _ as *const _,
            std::mem::size_of::<i32>() as u32,
        );

        let (caption, text, border) = if is_dark {
            (0x001B1818u32, 0x00EEF3F4u32, 0x002A2727u32) // #18181B, #F4F3EE, #27272A
        } else {
            (0x00EEF3F4u32, 0x001B1818u32, 0x00E7E4E4u32) // #F4F3EE, #18181B, #E4E4E7
        };

        let _ = win32::DwmSetWindowAttribute(
            hwnd,
            DWMWA_CAPTION_COLOR,
            &caption as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );
        let _ = win32::DwmSetWindowAttribute(
            hwnd,
            DWMWA_TEXT_COLOR,
            &text as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );
        let _ = win32::DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &border as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );
    }
}

#[cfg(not(windows))]
pub fn apply_dwm_window_theme(_window: &tauri::WebviewWindow, _is_dark: bool) {}

#[cfg(all(test, windows))]
mod tests {
    use std::process::Command;
    #[test]
    fn gpu_preference_is_written_to_hkcu() {
        let java = std::path::Path::new(r"C:\LOAM-test-does-not-exist\bin\java.exe");
        super::set_high_performance_gpu(java);
        let key = r"HKCU\Software\Microsoft\DirectX\UserGpuPreferences";
        let out = Command::new("reg").args(["query", key, "/v", &java.to_string_lossy()]).output().unwrap();
        let _ = Command::new("reg").args(["delete", key, "/v", &java.to_string_lossy(), "/f"]).output();
        let text = String::from_utf8_lossy(&out.stdout);
        assert!(out.status.success() && text.contains("REG_SZ") && text.contains("GpuPreference=2;"), "{text}");
    }
    #[test]
    fn terminate_process_ends_child() {
        let mut child = Command::new("ping").args(["-n", "30", "127.0.0.1"]).spawn().unwrap();
        assert!(super::terminate_process(child.id()));
        assert_eq!(child.wait().unwrap().code(), Some(1));
        assert!(!super::terminate_process(u32::MAX - 3));
    }
}
