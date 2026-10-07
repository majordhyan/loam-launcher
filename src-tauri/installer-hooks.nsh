; LOAM native NSIS theme. Tauri's tested install/upgrade/uninstall logic remains intact.
; Only presentation is customized; NSIS reports actual extraction progress and disk space.
!define MUI_BGCOLOR "F4F3EE"
!define MUI_TEXTCOLOR "171715"
!define MUI_INSTFILESPAGE_COLORS "171715 F4F3EE"
!define MUI_WELCOMEPAGE_TITLE "Welcome to LOAM"
!define MUI_WELCOMEPAGE_TEXT "Your worlds, ready.$\r$\n$\r$\nLOAM installs and starts Minecraft: Java Edition. Vanilla, Fabric and Quilt, with mods, modpacks, shaders, servers and skins in one calm place.$\r$\n$\r$\nLOAM installs for your Windows account only, so no administrator prompt is needed. Games and settings are kept in AppData\Roaming\LoamLauncher and stay put when you update.$\r$\n$\r$\nThis build is unsigned, so Windows may show an unknown publisher warning."
!define MUI_FINISHPAGE_TITLE "LOAM is ready"
!define MUI_FINISHPAGE_TEXT "LOAM is installed.$\r$\n$\r$\nMinecraft and Java download only when you create a game. Existing worlds stay in their own game folders.$\r$\n$\r$\nLook for LOAM in the system tray, too: hover it for your game's status."
!define MUI_CUSTOMFUNCTION_GUIINIT LoamTheme
!define MUI_CUSTOMFUNCTION_UNGUIINIT un.LoamTheme
SetFont "Segoe UI" 10

!macro LOAM_THEME
  SetCtlColors $HWNDPARENT "171715" "F4F3EE"
  GetDlgItem $0 $HWNDPARENT 1
  System::Call 'uxtheme::SetWindowTheme(p r0, w "", w "")'
  SetCtlColors $0 "FFFFFF" "C15F3C"
  GetDlgItem $0 $HWNDPARENT 2
  SetCtlColors $0 "171715" "EEECE5"
  GetDlgItem $0 $HWNDPARENT 3
  SetCtlColors $0 "171715" "EEECE5"
!macroend

Function LoamTheme
  !insertmacro LOAM_THEME
FunctionEnd
Function un.LoamTheme
  !insertmacro LOAM_THEME
FunctionEnd

Function LoamPageTheme
  Push $0
  Push $1
  FindWindow $0 "#32770" "" $HWNDPARENT
  SetCtlColors $0 "171715" "F4F3EE"
  System::Call 'user32::GetWindow(p r0, i 5) p.r1'
  loam_next_control:
    StrCmp $1 0 loam_controls_done
    SetCtlColors $1 "171715" "F4F3EE"
    System::Call 'user32::GetWindow(p r1, i 2) p.r1'
    Goto loam_next_control
  loam_controls_done:
  System::Call 'user32::InvalidateRect(p r0, p 0, i 1)'
  Pop $1
  Pop $0
FunctionEnd

!macro NSIS_HOOK_PREINSTALL
  ; Color the native progress control; leave NSIS in charge of its measured value.
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1004
  System::Call 'uxtheme::SetWindowTheme(p r1, w "", w "")'
  SendMessage $1 0x0409 0 0x003C5FC1 ; PBM_SETBARCOLOR, terracotta in COLORREF
  SendMessage $1 0x2001 0 0x00E5ECEE ; PBM_SETBKCOLOR, warm neutral in COLORREF
!macroend

; Create per-user data folders without touching existing worlds or custom storage.
!macro NSIS_HOOK_POSTINSTALL
  CreateDirectory "$APPDATA\LoamLauncher\games"
  CreateDirectory "$APPDATA\LoamLauncher\cache\assets"
  CreateDirectory "$APPDATA\LoamLauncher\cache\libraries"
  CreateDirectory "$APPDATA\LoamLauncher\cache\versions"
  CreateDirectory "$APPDATA\LoamLauncher\cache\runtimes"
  CreateDirectory "$APPDATA\LoamLauncher\downloads"
  CreateDirectory "$APPDATA\LoamLauncher\backups"
  CreateDirectory "$APPDATA\LoamLauncher\logs"
  CreateDirectory "$APPDATA\LoamLauncher\reports"
!macroend
