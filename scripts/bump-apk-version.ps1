# ===================================================================
#  Naikkan nomor versi APK (versionCode) secara otomatis.
#  Android menolak memasang APK dengan versionCode <= yang terpasang,
#  sehingga tanpa menaikkan nomor ini, update TIDAK bisa masuk tanpa uninstall.
# ===================================================================
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'twa-manifest.json'
$versionPath = Join-Path $root 'public\apk\version.json'
$gradlePath = Join-Path $root 'android-twa\app\build.gradle'

if (-not (Test-Path $manifestPath)) {
    Write-Error "twa-manifest.json tidak ditemukan di $manifestPath"
    exit 1
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

$currentCode = 1
if ($manifest.PSObject.Properties.Name -contains 'appVersionCode' -and $manifest.appVersionCode) {
    $currentCode = [int]$manifest.appVersionCode
}

# Kalau pernah build sebelumnya, pakai nomor terbesar yang pernah dipakai.
if (Test-Path $versionPath) {
    try {
        $old = Get-Content -LiteralPath $versionPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($old.versionCode -and [int]$old.versionCode -ge $currentCode) {
            $currentCode = [int]$old.versionCode
        }
    } catch { }
}

$newCode = $currentCode + 1
$parts = ($manifest.appVersion -split '\.')
while ($parts.Count -lt 3) { $parts += '0' }
$parts[2] = ([int]$parts[2] + 1).ToString()
$newVersion = ($parts[0..2] -join '.')

$manifest.appVersionCode = $newCode
$manifest.appVersion = $newVersion

$json = $manifest | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($manifestPath, $json, (New-Object System.Text.UTF8Encoding($false)))

# ⚠️ PENTING: Bubblewrap TIDAK selalu me-regenerasi project Android.
#    Kalau tidak di-regenerate, build.gradle tetap memakai versionCode LAMA
#    => Android menolak memasang APK => pengguna harus uninstall.
#    Karena itu build.gradle WAJIB ikut diperbarui.
if (Test-Path $gradlePath) {
    $gradle = Get-Content -LiteralPath $gradlePath -Raw -Encoding UTF8
    $gradle = [regex]::Replace($gradle, '(?m)^(\s*versionCode\s+)\d+\s*$', "`${1}$newCode")
    $gradle = [regex]::Replace($gradle, '(?m)^(\s*versionName\s+")[^"]*("\s*)$', "`${1}$newVersion`${2}")
    [System.IO.File]::WriteAllText($gradlePath, $gradle, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  build.gradle  : versionCode $newCode / versionName $newVersion"
}

Write-Host "  APK versionCode : $currentCode -> $newCode"
Write-Host "  APK version     : $newVersion"

exit 0