# Asks for the DB password with PowerShell's hidden prompt, then runs the read-only backup.
# The password lives only in this process's environment; it is never written to disk.
$ErrorActionPreference = 'Stop'
$env:MYKO_DB_HOST = 'aws-1-us-east-1.pooler.supabase.com'
$env:MYKO_DB_USER = 'postgres.ecvdcsgsiorisszotyew'
$secure = Read-Host -AsSecureString 'Contrasena de la base de datos (no se muestra al escribir)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:MYKO_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
try {
  node (Join-Path $PSScriptRoot 'supabase-backup.mjs') dump --source remote
} finally {
  Remove-Item Env:MYKO_DB_PASSWORD -ErrorAction SilentlyContinue
}
