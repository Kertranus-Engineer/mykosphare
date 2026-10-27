# Creates firmware/esp32-cloud-v1/CloudConfig.local.h (ignored by Git and by Vercel) from values you type here.
# Wi-Fi password and the MYKO-001 device key are read hidden; neither is printed, logged or sent anywhere.
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$target = Join-Path $root 'firmware\esp32-cloud-v1\CloudConfig.local.h'
function Read-Hidden([string]$prompt) {
  $s = Read-Host -AsSecureString $prompt
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
function Esc([string]$v) { $v.Replace('\', '\\').Replace('"', '\"') }

$ssid = (Read-Host 'Nombre de tu Wi-Fi (SSID; debe ser de 2.4 GHz)').Trim()
if (-not $ssid) { throw 'SSID vacio' }
$wifiPass = Read-Hidden 'Contrasena del Wi-Fi (oculta)'
$key = (Read-Hidden 'Clave MYKO-001 (copiala desde tu gestor; oculta)').Trim()
if (-not $key.StartsWith('myk_XaQhpb') -or $key.Length -lt 40) {
  throw 'Esa no es la clave activa de MYKO-001 (debe empezar con myk_XaQhpb). No se escribio nada.'
}
$roots = ((Get-Content (Join-Path $PSScriptRoot 'roots.pem')) | Where-Object { $_ -notmatch '^#' }) -join "`n"

$text = @"
#pragma once
// Local only: ignored by Git and Vercel. Contains secrets; never share or commit.
#define CLOUD_ENABLED true
#define CLOUD_WIFI_SSID "$(Esc $ssid)"
#define CLOUD_WIFI_PASSWORD "$(Esc $wifiPass)"
#define CLOUD_DEVICE_ID "MYKO-001"
#define CLOUD_DEVICE_KEY "$(Esc $key)"
#define CLOUD_ENDPOINT "https://mykosphare.vercel.app/api/v2/device/readings"

// GlobalSign Root CA (cross-sign of GTS Root R1, current chain of *.vercel.app) + ISRG Root X1 (fallback CA).
static const char CLOUD_ROOT_CA[] = R"MYKO(
$roots
)MYKO";
"@
[IO.File]::WriteAllText($target, $text, [Text.UTF8Encoding]::new($false))
icacls $target /inheritance:r /grant:r "$($env:USERNAME):F" | Out-Null
$wifiPass = $null; $key = $null; $text = $null
Write-Host "Listo: $target (permisos solo para tu usuario). CLOUD_ENABLED=true, MYKO_SENSOR_ONLY sigue true en el .ino."
