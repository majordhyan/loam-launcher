$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$patterns = @('disable SmartScreen', 'turn off Defender', 'add an exclusion', 'premium bypass', 'free Minecraft', 'cracked')
$files = foreach ($folder in @('src', 'public', 'website', 'installer')) {
    $path = Join-Path $root $folder
    if (Test-Path -LiteralPath $path) {
        Get-ChildItem -LiteralPath $path -Recurse -File | Where-Object { $_.Extension -in '.ts','.tsx','.js','.html','.md','.txt','.json','.nsi','.nsh' }
    }
}
$hits = $files | Select-String -SimpleMatch -Pattern $patterns
if ($hits) {
    # Print locations, never matched contents, which might contain private information.
    $hits | ForEach-Object { Write-Error "$($_.Path):$($_.LineNumber): prohibited product wording" -ErrorAction Continue }
    exit 1
}
Write-Output 'Product-copy trust scan passed.'
exit 0
