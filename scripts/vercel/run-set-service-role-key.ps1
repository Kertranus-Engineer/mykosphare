# Asks for the Supabase privileged key (hidden), validates it, and stores it in Vercel Production as a sensitive variable.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)
$s = Read-Host -AsSecureString 'Clave service_role / secret de Supabase (no se muestra al escribir)'
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
try {
  $env:SERVICE_ROLE_VALUE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b).Trim()
  $ErrorActionPreference = 'Continue'
  node (Join-Path $PSScriptRoot 'set-service-role-key.mjs') 2>&1 | ForEach-Object { "$_" }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
  Remove-Item Env:SERVICE_ROLE_VALUE -ErrorAction SilentlyContinue
}
