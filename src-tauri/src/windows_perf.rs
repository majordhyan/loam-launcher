//! Windows-specific performance optimizations: High Performance GPU preference,
//! process priority elevation (Above Normal), EcoQoS / power throttling opt-out,
//! game window visibility detection, and graceful WM_CLOSE shutdown.

#[cfg(windows)]
use std::{
    ffi::c_void,
    path::Path,
    process::Command,
};

#[cfg(windows)]
pub fn set_high_performance_gpu(java_exe: &Path) {
    let path_str = java_exe.to_string_lossy();
    // Reversible, user-level Windows setting via reg.exe into HKCU:
    let _ = Command::new("reg")
        .args([
            "add",
            r"HKCU\Software\Microsoft\DirectX\UserGpuPreferences",
            "/v",
            &path_str,
            "/t",
            "REG_SZ",
            "/d",
            "GpuPreference=2;",
            "/f",
        ])
        .output();
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

    extern "system" {
        pub fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        pub fn CloseHandle(hObject: HANDLE) -> BOOL;
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
