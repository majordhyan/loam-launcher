param([Parameter(ValueFromRemainingArguments=$true)][string[]]$CommandArgs)
$ErrorActionPreference = 'Stop'
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vsInstall = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsInstall) { throw 'Visual Studio C++ tools are required.' }
& "$vsInstall\Common7\Tools\Launch-VsDevShell.ps1" -Arch amd64 -HostArch amd64 -SkipAutomaticLocation | Out-Null
$kitRoot = "${env:ProgramFiles(x86)}\Windows Kits\10"
$kitVersion = Get-ChildItem "$kitRoot\Lib" -Directory | Where-Object { Test-Path "$($_.FullName)\um\x64\kernel32.lib" } | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty Name
if (-not $kitVersion) { throw 'Windows SDK x64 libraries are required.' }
$env:LIB = "$kitRoot\Lib\$kitVersion\um\x64;$kitRoot\Lib\$kitVersion\ucrt\x64;$env:LIB"
$env:INCLUDE = "$kitRoot\Include\$kitVersion\um;$kitRoot\Include\$kitVersion\ucrt;$kitRoot\Include\$kitVersion\shared;$env:INCLUDE"
$env:PATH = "$kitRoot\bin\$kitVersion\x64;$env:PATH"
if ($CommandArgs.Count -eq 0) { & npm.cmd run desktop } else { $exe=$CommandArgs[0]; $rest=$CommandArgs | Select-Object -Skip 1; & $exe @rest }
exit $LASTEXITCODE
