param([ValidateSet('check', 'setup', 'run')][string]$Action = 'check')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'src_BE'
$frontendRoot = Join-Path $repoRoot 'src_FE'
$composeFile = Join-Path $repoRoot 'docker-compose.live.yml'
$projectName = 'j-pilates-live-e2e'

function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable exited with $LASTEXITCODE" }
}
foreach ($command in @('node', 'npm', 'uv', 'docker')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Missing $command. See src_FE/docs/LIVE_E2E.md." }
}
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -ne 24) { throw 'Use Node 24 for the locked frontend dependencies.' }
& docker info --format '{{.ServerVersion}}' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is unavailable. Start Docker Desktop with WSL2; admin/reboot steps are in src_FE/docs/LIVE_E2E.md. CI can run independently.' }
Invoke-Checked docker @('compose', 'version')
if ($Action -eq 'check') {
    Write-Output 'Prerequisites available. Dev database 5433 and pytest database 5434 are not touched. Live database uses 5435.'
    return
}

$savedEnvironment = @{}
$liveEnvironment = @{
    PYTHONUTF8 = '1'
    DATABASE_URL = 'postgresql+psycopg://pilates:pilates@localhost:5435/pilates_fe_test'
    ENVIRONMENT = 'test'
    JWT_SECRET = "isolated-e2e-$([guid]::NewGuid())"
    SEED_ADMIN_EMAIL = 'admin@example.com'
    SEED_ADMIN_PASSWORD = "isolated-e2e-$([guid]::NewGuid())"
    CORS_ORIGINS = '["http://localhost:4173"]'
    LIVE_API_URL = 'http://127.0.0.1:8000'
    MAILPIT_URL = 'http://127.0.0.1:8026'
    SMTP_HOST = 'localhost'
    SMTP_PORT = '1026'
    EMAIL_FROM = 'studio@example.com'
    PASSWORD_RESET_URL_TEMPLATE = 'http://localhost:4173/dat-lai-mat-khau?token={token}'
    STORAGE_DIR = (Join-Path $frontendRoot 'visual-qa/live/storage')
    LIVE_PYTHON = (Join-Path $backendRoot '.venv/Scripts/python.exe')
}
$apiProcess = $null
Push-Location $repoRoot
try {
    foreach ($key in $liveEnvironment.Keys) {
        $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $liveEnvironment[$key], 'Process')
    }
    Invoke-Checked docker @('compose', '-p', $projectName, '-f', $composeFile, 'up', '-d', '--wait')
    # A reset is authorized only for this script's Compose-managed test service.
    $databaseContainer = & docker compose -p $projectName -f $composeFile ps -q db
    if ($LASTEXITCODE -ne 0 -or -not $databaseContainer) { throw 'Missing owned E2E database container.' }
    $owner = & docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' $databaseContainer
    if ($LASTEXITCODE -ne 0 -or $owner -ne $projectName) { throw 'Refusing database reset: container ownership mismatch.' }
    if ($Action -eq 'setup') {
        Set-Location $backendRoot
        Invoke-Checked uv @('sync', '--frozen', '--python', '3.12')
        Set-Location $frontendRoot
        Invoke-Checked npm @('ci')
        Invoke-Checked npm @('run', 'e2e:install')
        Write-Output 'Setup complete. Run: powershell -File scripts/live-e2e.ps1 run'
        return
    }
    if (-not (Test-Path -LiteralPath $liveEnvironment.LIVE_PYTHON)) { throw 'Run setup first.' }
    $outputRoot = Join-Path $frontendRoot "visual-qa/live/local-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
    Set-Location $backendRoot
    Invoke-Checked uv @('run', 'python', '-c', 'import sys; assert sys.version_info >= (3, 12), "Python 3.12 or newer is required"')
    for ($round = 1; $round -le 2; $round++) {
        if (Get-NetTCPConnection -LocalPort 8000,4173 -State Listen -ErrorAction SilentlyContinue) { throw 'Ports 8000 and 4173 must be free; stop the existing servers yourself.' }
        Set-Location $backendRoot
        Invoke-Checked uv @('run', 'python', '-m', 'scripts.live_e2e', 'reset')
        Invoke-Checked uv @('run', 'alembic', 'upgrade', 'head')
        Invoke-Checked uv @('run', 'alembic', 'check')
        Invoke-Checked uv @('run', 'python', '-m', 'scripts.seed_admin')
        $apiProcess = Start-Process -FilePath $liveEnvironment.LIVE_PYTHON -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $outputRoot "backend-$round.log") -RedirectStandardError (Join-Path $outputRoot "backend-$round-error.log")
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            try { Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 2 | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 1 }
        }
        if (-not $ready) { throw 'API readiness failed; inspect the backend log.' }
        # Live global setup also authenticates and queries students to prove DB readiness.
        Set-Location $frontendRoot
        & npm run e2e:live
        $testExit = $LASTEXITCODE
        $roundRoot = Join-Path $outputRoot "run-$round"
        New-Item -ItemType Directory -Path $roundRoot -Force | Out-Null
        foreach ($folder in @('playwright-report', 'test-results')) {
            if (Test-Path -LiteralPath $folder) { Copy-Item -LiteralPath $folder -Destination $roundRoot -Recurse -Force }
        }
        Set-Location $backendRoot
        Invoke-Checked uv @('run', 'python', '-m', 'scripts.live_e2e', 'reconcile')
        if (-not $apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id; $apiProcess.WaitForExit() }
        $apiProcess = $null
        if ($testExit -ne 0) { throw "Live round $round failed; evidence retained in src_FE/visual-qa/live." }
    }
    Write-Output "Both fresh-database live rounds and ledger reconciliation passed. Evidence: $outputRoot"
} finally {
    if ($apiProcess -and -not $apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id }
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
    Pop-Location
}
