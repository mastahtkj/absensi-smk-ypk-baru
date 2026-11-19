# ===================================================================
#  Tulis public/apk/version.json (dipakai API /api/app-version untuk
#  menampilkan & memeriksa versi APK terbaru).
# ===================================================================
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'twa-manifest.json'
$apkPath = Join-Path $root 'public\apk\SMK_YPK_SUPER_APP.apk'
$outPath = Join-Path $root 'public\apk\version.json'

$code = 1
$name = '1.0.0'
if (Test-Path $manifestPath) {
    try {
        $m = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($m.appVersionCode) { $code = [int]$m.appVersionCode }
        if ($m.appVersion) { $name = [string]$m.appVersion }
    } catch { }
}

$size = 0
$builtAt = (Get-Date).ToUniversalTime().ToString('o')
if (Test-Path $apkPath) {
    $size = (Get-Item -LiteralPath $apkPath).Length
    $builtAt = (Get-Item -LiteralPath $apkPath).LastWriteTimeUtc.ToString('o')
}

$payload = [ordered]@{
    versionCode = $code
    versionName = $name
    patchTitle  = "Patch v$($name): Pembaruan Sistem & Fitur SMK YPK"
    sizeBytes   = $size
    sizeMb      = [math]::Round($size / 1MB, 2)
    builtAt     = $builtAt
    downloadUrl = '/apk/SMK_YPK_SUPER_APP.apk'
}

$json = $payload | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outPath, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "  version.json ditulis: v$name (code $code)"
exit 0