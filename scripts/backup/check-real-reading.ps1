# READ-ONLY: shows the latest readings/state of MYKO-001 in production (no UUIDs, no secrets).
$ErrorActionPreference = 'Stop'
$s = Read-Host -AsSecureString 'Contrasena de la base de datos (no se muestra al escribir)'
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
  $env:PGHOST = 'aws-1-us-east-1.pooler.supabase.com'; $env:PGPORT = '5432'; $env:PGUSER = 'postgres.ecvdcsgsiorisszotyew'
  $env:PGDATABASE = 'postgres'; $env:PGSSLMODE = 'require'; $env:PGOPTIONS = '-c default_transaction_read_only=on'
  $env:Path = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin;$env:Path"
  $sql = @"
select r.observed_at, r.origin, r.temperature, r.humidity, r.received_at, now() - r.observed_at as age
from public.grow_readings r join public.grow_devices d on d.id = r.device_id
where d.hardware_identifier = 'MYKO-001' order by r.observed_at desc limit 5;
select s.status, s.last_seen_at, now() - s.last_seen_at as since_seen
from public.grow_device_state s join public.grow_devices d on d.id = s.device_id where d.hardware_identifier = 'MYKO-001';
select count(*) as real_readings, count(*) filter (where origin <> 'real') as non_real from public.grow_readings;
"@
  $ErrorActionPreference = 'Continue'
  docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGSSLMODE -e PGOPTIONS -e PGPASSWORD --entrypoint psql public.ecr.aws/supabase/postgres:17.11.0.006 -c $sql 2>&1 | ForEach-Object { "$_" }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
  Remove-Item Env:PGPASSWORD, Env:PGHOST, Env:PGPORT, Env:PGUSER, Env:PGDATABASE, Env:PGSSLMODE, Env:PGOPTIONS -ErrorAction SilentlyContinue
}
