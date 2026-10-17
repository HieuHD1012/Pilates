<#
Provision GCP resources for the manual Cloud Run GitHub Actions workflow.
Run from an authenticated gcloud session after billing is enabled on j-pilate.
Secret values are loaded separately with sync-secrets.py.
#>
param()

$ErrorActionPreference = 'Stop'
$project = 'j-pilate'
$region = 'asia-southeast1'
$projectNumber = '449252724960'
$runtimeSa = "cloud-run-api@$project.iam.gserviceaccount.com"
$deploySa = "github-deploy@$project.iam.gserviceaccount.com"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw 'gcloud CLI is required.'
}

function Invoke-Gcloud {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & gcloud @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed: $($Arguments -join ' ')"
    }
}

function Test-GcloudResource {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & gcloud @Arguments --format='value(name)' 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
}

$account = & gcloud auth list --filter='status:ACTIVE' --format='value(account)'
if ($LASTEXITCODE -ne 0 -or -not $account) {
    throw 'No active gcloud account. Run gcloud auth login in your own browser first.'
}
Invoke-Gcloud @('projects', 'describe', $project, '--format=value(projectId)')
$billing = & gcloud billing projects describe $project '--format=value(billingEnabled)'
if ($LASTEXITCODE -ne 0 -or $billing -ne 'True') {
    throw 'Billing is not enabled for j-pilate. Enable it in Google Cloud Console, then rerun.'
}

Invoke-Gcloud @(
    'services', 'enable', 'run.googleapis.com', 'artifactregistry.googleapis.com',
    'secretmanager.googleapis.com', 'iam.googleapis.com',
    'iamcredentials.googleapis.com', 'sts.googleapis.com',
    "--project=$project", '--quiet'
)

if (-not (Test-GcloudResource @('artifacts', 'repositories', 'describe', 'j-pilate-api', "--location=$region", "--project=$project"))) {
    Invoke-Gcloud @('artifacts', 'repositories', 'create', 'j-pilate-api',
        '--repository-format=docker', "--location=$region", "--project=$project", '--quiet')
}

foreach ($sa in @('cloud-run-api', 'github-deploy')) {
    $email = "$sa@$project.iam.gserviceaccount.com"
    if (-not (Test-GcloudResource @('iam', 'service-accounts', 'describe', $email, "--project=$project"))) {
        Invoke-Gcloud @('iam', 'service-accounts', 'create', $sa, "--project=$project", '--quiet')
    }
}

if (-not (Test-GcloudResource @('iam', 'workload-identity-pools', 'describe', 'github', '--location=global', "--project=$project"))) {
    Invoke-Gcloud @('iam', 'workload-identity-pools', 'create', 'github',
        '--location=global', "--project=$project", '--display-name=GitHub Actions', '--quiet')
}
if (-not (Test-GcloudResource @('iam', 'workload-identity-pools', 'providers', 'describe',
    'pilates', '--location=global', '--workload-identity-pool=github', "--project=$project"))) {
    Invoke-Gcloud @('iam', 'workload-identity-pools', 'providers', 'create-oidc', 'pilates',
        '--location=global', '--workload-identity-pool=github', "--project=$project",
        '--issuer-uri=https://token.actions.githubusercontent.com/',
        '--attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository',
        "--attribute-condition=assertion.repository_owner=='HieuHD1012' && assertion.repository=='HieuHD1012/Pilates' && assertion.ref=='refs/heads/main'",
        '--quiet')
}

$repositoryMember = "principalSet://iam.googleapis.com/projects/$projectNumber/locations/global/workloadIdentityPools/github/attribute.repository/HieuHD1012/Pilates"
Invoke-Gcloud @('iam', 'service-accounts', 'add-iam-policy-binding', $deploySa,
    "--project=$project", '--role=roles/iam.workloadIdentityUser', "--member=$repositoryMember", '--quiet')
Invoke-Gcloud @('artifacts', 'repositories', 'add-iam-policy-binding', 'j-pilate-api',
    "--location=$region", "--project=$project", '--role=roles/artifactregistry.writer',
    "--member=serviceAccount:$deploySa", '--quiet')
Invoke-Gcloud @('projects', 'add-iam-policy-binding', $project,
    '--role=roles/run.admin', "--member=serviceAccount:$deploySa", '--quiet')
Invoke-Gcloud @('iam', 'service-accounts', 'add-iam-policy-binding', $runtimeSa,
    "--project=$project", '--role=roles/iam.serviceAccountUser',
    "--member=serviceAccount:$deploySa", '--quiet')

$secretNames = @(
    'j-pilate-db-url', 'j-pilate-db-url-unpooled', 'j-pilate-jwt-secret',
    'j-pilate-neon-s3-endpoint', 'j-pilate-neon-s3-key', 'j-pilate-neon-s3-secret',
    'j-pilate-smtp-password'
)
foreach ($name in $secretNames) {
    if (-not (Test-GcloudResource @('secrets', 'describe', $name, "--project=$project"))) {
        Invoke-Gcloud @('secrets', 'create', $name, '--replication-policy=automatic',
            "--project=$project", '--quiet')
    }
    Invoke-Gcloud @('secrets', 'add-iam-policy-binding', $name, "--project=$project",
        '--role=roles/secretmanager.secretAccessor', "--member=serviceAccount:$runtimeSa", '--quiet')
}

Write-Host 'GCP resources ready. Run sync-secrets.py before the first deployment.'
