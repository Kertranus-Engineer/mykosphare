# READ-ONLY: asks for the DB password (hidden) and prints what `supabase db push` WOULD apply. Applies nothing.
# The password is only in this process's PGPASSWORD; the URL below carries no secret.
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$secure = Read-Host -AsSecureString 'Contrasena de la base de datos (no se muestra al escribir)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$env:PGOPTIONS = '-c default_transaction_read_only=on'
$log = Join-Path $env:USERPROFILE ("mykosphare-backups\dryrun-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log")
try {
  $url = 'postgresql://postgres.ecvdcsgsiorisszotyew@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
  # The CLI writes its normal messages to stderr; do not let PowerShell treat that as a failure.
  $ErrorActionPreference = 'Continue'
  node (Join-Path $root 'node_modules\supabase\dist\supabase.js') db push --dry-run --skip-vault --db-url $url --workdir $root 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $log
  Write-Host "`nLog (sin secretos): $log"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
