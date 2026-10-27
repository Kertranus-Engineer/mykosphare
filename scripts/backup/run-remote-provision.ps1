# Registers MYKO-001 in production (authorized by the owner on 2026-10-27) and issues its individual key.
# The key is generated here, copied ONLY to your clipboard (never printed, logged or written to disk),
# and only its SHA-256 hash + 10-char hint go to the database after you confirm you stored it.
$ErrorActionPreference = 'Stop'
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes); $rng.Dispose()
$key = 'myk_' + [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$sha = [Security.Cryptography.SHA256]::Create()
$hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key))) -replace '-', '').ToLower()
$hint = $key.Substring(0, 10)
Set-Clipboard -Value $key
Write-Host ''
Write-Host 'La clave individual de MYKO-001 esta en tu PORTAPAPELES (no se muestra aqui).'
Write-Host '1) Abre tu gestor de contrasenas y pegala en una entrada nueva: "MYKO-001 device key".'
Write-Host '2) Comprueba que quedo guardada. Sin ella no se puede cargar el firmware.'
$ok = Read-Host 'Escribe GUARDADA (en mayusculas) cuando la hayas guardado'
if ($ok -cne 'GUARDADA') { Set-Clipboard -Value ' '; Write-Host 'Cancelado: no se registro nada.'; return }
Set-Clipboard -Value ' '
$key = $null
Write-Host 'Portapapeles limpiado. Si Windows guarda historial del portapapeles (Win+V), usa "Borrar todo".'
$secure = Read-Host -AsSecureString 'Contrasena de la base de datos (no se muestra al escribir)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:MYKO_KEY_HASH = $hash
  $env:MYKO_KEY_HINT = $hint
  $ErrorActionPreference = 'Continue'
  node (Join-Path $PSScriptRoot 'provision-myko-001.mjs') 2>&1 | ForEach-Object { "$_" }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Item Env:PGPASSWORD, Env:MYKO_KEY_HASH, Env:MYKO_KEY_HINT -ErrorAction SilentlyContinue
}
