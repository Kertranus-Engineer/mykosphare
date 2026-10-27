# PRODUCTION WRITE (authorized by the owner on 2026-10-27): applies exactly the two Grow migrations, then verifies.
# Order: pre-check (read-only) -> supabase db push (stops on any failure) -> post-verification (read-only).
# The password is only in this process's PGPASSWORD; nothing secret is written to disk.
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$backup = (Get-ChildItem (Join-Path $env:USERPROFILE 'mykosphare-backups\supabase-ecvdcsgsiorisszotyew') -Directory | Sort-Object Name | Select-Object -Last 1).FullName
$secure = Read-Host -AsSecureString 'Contrasena de la base de datos (no se muestra al escribir)'
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$log = Join-Path $env:USERPROFILE ("mykosphare-backups\push-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".log")
$verify = Join-Path $PSScriptRoot 'verify-remote-migration.mjs'
try {
  Write-Host "== 1/3 Pre-check (solo lectura), respaldo base: $backup"
  node $verify pre $backup 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $log
  if ($LASTEXITCODE -ne 0) { Write-Host "`nPRE-CHECK FALLO: no se aplica nada."; return }
  Write-Host "`n== 2/3 Aplicando las dos migraciones (supabase db push)"
  $env:PGOPTIONS = ''
  $url = 'postgresql://postgres.ecvdcsgsiorisszotyew@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
  $ErrorActionPreference = 'Continue'
  node (Join-Path $root 'node_modules\supabase\dist\supabase.js') db push --skip-vault --yes --db-url $url --workdir $root 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $log -Append
  $pushExit = $LASTEXITCODE
  Write-Host "`n== 3/3 Verificacion posterior (solo lectura) [db push exit=$pushExit]"
  node $verify post $backup 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $log -Append
  Write-Host "`nLog (sin secretos): $log"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
