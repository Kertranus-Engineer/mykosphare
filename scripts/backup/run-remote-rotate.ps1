# Replaces MYKO-001's lost credential. The new key goes to your clipboard only; before anything is written you must
# paste it back FROM YOUR PASSWORD MANAGER into a hidden prompt, and its hash must match. Nothing secret is printed or saved.
$ErrorActionPreference = 'Stop'
$oldHint = 'myk_CTh3oC'
function Get-KeyHash([string]$k) {
  $sha = [Security.Cryptography.SHA256]::Create()
  ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($k))) -replace '-', '').ToLower()
}
function Read-Hidden([string]$prompt) {
  $s = Read-Host -AsSecureString $prompt
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $rng.Dispose()
$key = 'myk_' + [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$hash = Get-KeyHash $key
$hint = $key.Substring(0, 10)
Set-Clipboard -Value $key
Write-Host ''
Write-Host 'La NUEVA clave de MYKO-001 esta en tu portapapeles (no se muestra aqui).'
Write-Host '1) En tu gestor, edita la entrada myko-001.local: pega la clave en Password, comprueba con el ojo que empieza con myk_, Save.'
Write-Host '2) Cuando este guardada, COPIALA DESDE EL GESTOR (boton copiar de la entrada) y pegala en el siguiente paso.'
$verified = $false
for ($i = 1; $i -le 5 -and -not $verified; $i++) {
  $typed = Read-Hidden "Pega aqui la clave copiada desde tu gestor (oculto) [intento $i/5]"
  if ((Get-KeyHash $typed.Trim()) -ceq $hash) { $verified = $true } else { Write-Host 'No coincide con la clave generada: revisa que guardaste la clave nueva (empieza con myk_).' }
  $typed = $null
}
$key = $null
Set-Clipboard -Value ' '
if (-not $verified) { Write-Host 'Cancelado: no se escribio nada en la base.'; return }
Write-Host 'Coincide: la clave guardada en tu gestor es la correcta. Portapapeles limpiado (Win+V > Borrar todo si hay historial).'
$pw = Read-Hidden 'Contrasena de la base de datos (no se muestra al escribir)'
try {
  $env:PGPASSWORD = $pw; $env:MYKO_KEY_HASH = $hash; $env:MYKO_KEY_HINT = $hint; $env:MYKO_OLD_HINT = $oldHint
  $ErrorActionPreference = 'Continue'
  node (Join-Path $PSScriptRoot 'rotate-myko-001.mjs') 2>&1 | ForEach-Object { "$_" }
} finally {
  $pw = $null
  Remove-Item Env:PGPASSWORD, Env:MYKO_KEY_HASH, Env:MYKO_KEY_HINT, Env:MYKO_OLD_HINT -ErrorAction SilentlyContinue
}
