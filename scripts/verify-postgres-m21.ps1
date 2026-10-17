# ==============================================================================
# Script: scripts/verify-postgres-m21.ps1
# Muc dich: Kiem chung PostgreSQL trong moi truong co lap cho Milestone M6 (V1-V10)
#
# Kiem tra:
# 1. Truong hop A (Schema chinh thuc): Chi nap db/migration (V1-V3)
# 2. Truong hop B (Schema local/staging): Nap db/migration + db/migration-staging (V1-V10)
# 3. Hibernate ddl-auto=validate thuc su chay tren PostgreSQL khong dung create/create-drop
# 4. Tu dong phe duyet toan bo (APPROVED, 0 pending), HSK 1-6 approved, V4-V10 twice idempotent, all sequences
# 5. Schema chinh thuc khong nap V4, V5, V6, V7, V8
# 6. Dong bo sequence BIGSERIAL: ban ghi tu sinh ID lon hon MAX(id) thuc te (lessons, vocabulary, hanzi)
# 7. Phan biet ro: Flyway migrate lai nap 0 migration moi va SQL seed tu chong trung khi tai chay
# 8. Xac minh ket qua thuc thi qua Surefire XML (khong failures, khong errors, khong skipped)
# ==============================================================================

param(
    [int]$Port = 15432,
    [string]$ContainerName,
    [string]$PostgresUser = "postgres",
    [string]$PostgresPassword = "postgres",
    [switch]$KeepContainer
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$BuildDirectory = "$RepoRoot/backups/rehearsal-target"
$SurefireReportPath = "$BuildDirectory/surefire-reports/TEST-com.heyganba.PostgresSchemaStagingRehearsalTest.xml"

$initialLocation = Get-Location
$originalPgPassword = $env:PGPASSWORD

$StartedContainer = $false
$CreatedContainerName = $null

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  HeyGanba - M6 PostgreSQL Schema A & B Verification Script    " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Ham xac minh ket qua test thuc su qua file XML cua Surefire
function Assert-SurefireResults {
    param(
        [string]$ReportFile,
        [string[]]$ExpectedTests
    )

    if (-not (Test-Path -Path $ReportFile)) {
        throw "Khong tim thay file ket qua Surefire XML moi tai: $ReportFile"
    }

    [xml]$xml = Get-Content -Path $ReportFile -Raw
    $suite = $xml.testsuite
    if (-not $suite) {
        throw "File Surefire XML khong chua the <testsuite> hop le: $ReportFile"
    }

    $testsCount = [int]$suite.tests
    $failuresCount = [int]$suite.failures
    $errorsCount = [int]$suite.errors
    $skippedCount = [int]$suite.skipped

    if ($failuresCount -gt 0 -or $errorsCount -gt 0) {
        throw "Surefire bao cao co loi thuc thi: failures=$failuresCount, errors=$errorsCount trong $ReportFile"
    }

    if ($skippedCount -gt 0) {
        throw "Surefire bao cao co test bi bo qua: skipped=$skippedCount trong $ReportFile. Khong chap nhan test bi skip!"
    }

    $testCases = @($suite.testcase)
    if ($testCases.Count -ne $ExpectedTests.Count) {
        throw "So luong testcase thuc te ($($testCases.Count)) khong khop voi so test ky vong ($($ExpectedTests.Count)) trong $ReportFile."
    }

    foreach ($expected in $ExpectedTests) {
        $found = $testCases | Where-Object { $_.name -like "$expected*" }
        if (-not $found) {
            throw "Khong tim thay test '$expected' trong ket qua Surefire XML ($ReportFile)."
        }
        if ($found.failure -or $found.error -or $found.skipped) {
            throw "Test '$expected' chua trang thai failure/error/skipped trong Surefire XML."
        }
    }
}

# Tao Run ID duy nhat cho luot chay nay
$RunId = [guid]::NewGuid().ToString("N").Substring(0, 8)
if ([string]::IsNullOrWhiteSpace($ContainerName)) {
    $ContainerName = "heyganba-rehearsal-$RunId"
}
$DbNameA = "heyganba_rehearsal_a_$RunId"
$DbNameB = "heyganba_rehearsal_b_$RunId"

try {
    Write-Host "`n[1/5] Kiem tra Docker daemon va khoi chay container rieng tren 127.0.0.1:$Port..." -ForegroundColor Yellow

    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "DOCKER KHONG CHAY HOAC KHONG THE KET NOI: $dockerInfo"
        Write-Host "`nHUONG DAN: Vui long mo Docker Desktop va dam bao Docker daemon da san sang ('docker ps' hoat dong binh thuong)." -ForegroundColor Red
        Write-Host "Script dung ngay lap tuc va KHONG tu fallback sang localhost:5432 de bao ve moi truong ca nhan.`n" -ForegroundColor Red
        exit 1
    }

    # Kiem tra neu container voi ten nay da ton tai
    $existingContainers = @(docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}")
    if ($existingContainers.Count -gt 0 -and (-not [string]::IsNullOrWhiteSpace($existingContainers[0]))) {
        Write-Error "Container ten '$ContainerName' da ton tai tren he thong. Script dung ngay de tranh ghi de."
        exit 1
    }

    # Kiem tra cong Port xem da co process khac chiem dung tren 127.0.0.1 chua
    $portOccupied = $false
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect("127.0.0.1", $Port, $null, $null)
        $waitSuccess = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        if ($waitSuccess -and $tcpClient.Connected) {
            $tcpClient.EndConnect($asyncResult)
            $portOccupied = $true
        }
        $tcpClient.Close()
    } catch {
        $portOccupied = $false
    }

    if ($portOccupied) {
        Write-Error "Cong 127.0.0.1:$Port da bi chiem dung boi mot tien trinh khac. Vui long chon Port khac qua tham so -Port."
        exit 1
    }

    Write-Host "Khoi dong container moi '$ContainerName' tren 127.0.0.1:$Port..." -ForegroundColor Gray
    docker run -d `
        --name $ContainerName `
        -p "127.0.0.1:${Port}:5432" `
        -e POSTGRES_USER=$PostgresUser `
        -e POSTGRES_PASSWORD=$PostgresPassword `
        -e POSTGRES_DB=postgres `
        postgres:16-alpine | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Khong the khoi dong container PostgreSQL (exit code $LASTEXITCODE)."
        exit 1
    }

    $StartedContainer = $true
    $CreatedContainerName = $ContainerName

    # Cho den khi PostgreSQL san sang nhan ket noi (pg_isready)
    Write-Host "Doi PostgreSQL trong container san sang..." -ForegroundColor Gray
    $ready = $false
    $timeoutSeconds = 30
    $elapsed = 0
    while (-not $ready -and $elapsed -lt $timeoutSeconds) {
        Start-Sleep -Seconds 1
        $elapsed++
        docker exec -i $ContainerName pg_isready -h 127.0.0.1 -U $PostgresUser -d postgres 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        }
    }

    if (-not $ready) {
        Write-Error "PostgreSQL trong container khong san sang sau $timeoutSeconds giay."
        exit 1
    }
    Write-Host "PostgreSQL da san sang sau $elapsed giay." -ForegroundColor Gray

    # Tao 2 database rong, moi hoan toan: khong DROP DATABASE, khong flyway.clean()
    Write-Host "`n[2/5] Tao 2 database rehearsal doc lap va rong ($DbNameA, $DbNameB)..." -ForegroundColor Yellow

    docker exec -i $ContainerName psql -U $PostgresUser -d postgres -c "CREATE DATABASE $DbNameA;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Khong the tao database '$DbNameA' (exit code $LASTEXITCODE)."
        exit 1
    }

    docker exec -i $ContainerName psql -U $PostgresUser -d postgres -c "CREATE DATABASE $DbNameB;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Khong the tao database '$DbNameB' (exit code $LASTEXITCODE)."
        exit 1
    }
    Write-Host "Da tao 2 database rong: $DbNameA va $DbNameB." -ForegroundColor Gray

    # Truyen URL chinh xac vao test rehearsal
    $UrlA = "jdbc:postgresql://127.0.0.1:$Port/$DbNameA"
    $UrlB = "jdbc:postgresql://127.0.0.1:$Port/$DbNameB"

    Set-Location -Path "$RepoRoot/backend"

    Write-Host "`n[3/5] Chay kiem chung Case A va Case B (PostgresSchemaStagingRehearsalTest)..." -ForegroundColor Yellow

    # Xoa report XML cu truoc khi chay de dam bao khong doc nham report cu
    Remove-Item -Path $SurefireReportPath -Force -ErrorAction SilentlyContinue

    mvn test `
        "-Dbuild.output.root=$BuildDirectory" `
        "-Dtest=PostgresSchemaStagingRehearsalTest#caseA_officialSchemaOnly,PostgresSchemaStagingRehearsalTest#caseB_stagingSchemaWithV4" `
        "-Dpostgres.rehearsal=true" `
        "-Dpostgres.rehearsal.urlA=$UrlA" `
        "-Dpostgres.rehearsal.urlB=$UrlB" `
        "-Dpostgres.rehearsal.user=$PostgresUser" `
        "-Dpostgres.rehearsal.password=$PostgresPassword" `
        "-DfailIfNoTests=true"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kiem chung Case A va Case B THAT BAI (Maven exit code $LASTEXITCODE)."
        exit 1
    }

    # Doc Surefire XML moi tao: xac nhan dung 2 case A va B, khong failure/error/skipped
    Assert-SurefireResults -ReportFile $SurefireReportPath -ExpectedTests @("caseA_officialSchemaOnly", "caseB_stagingSchemaWithV4")
    Write-Host "✓ Case A va Case B thuc su chay va hoan thanh xuat sac (xac nhan qua Surefire XML)." -ForegroundColor Green

    Write-Host "`n[4/5] Chay Hibernate ddl-auto=validate thuc su voi PostgreSQL Schema Staging..." -ForegroundColor Yellow

    # Xoa report XML cu truoc luot chay Case C
    Remove-Item -Path $SurefireReportPath -Force -ErrorAction SilentlyContinue

    mvn test `
        "-Dbuild.output.root=$BuildDirectory" `
        "-Dtest=PostgresSchemaStagingRehearsalTest#caseC_hibernateSchemaValidation" `
        "-Dpostgres.rehearsal=true" `
        "-Dpostgres.rehearsal.urlA=$UrlA" `
        "-Dpostgres.rehearsal.urlB=$UrlB" `
        "-Dpostgres.rehearsal.user=$PostgresUser" `
        "-Dpostgres.rehearsal.password=$PostgresPassword" `
        "-DfailIfNoTests=true"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kiem chung Hibernate ddl-auto=validate THAT BAI (Maven exit code $LASTEXITCODE)."
        exit 1
    }

    # Doc Surefire XML moi tao: xac nhan dung case C thuc thi va pass
    Assert-SurefireResults -ReportFile $SurefireReportPath -ExpectedTests @("caseC_hibernateSchemaValidation")
    Write-Host "✓ Hibernate ddl-auto=validate thuc su chay va thanh cong (xac nhan qua Surefire XML)." -ForegroundColor Green

    Write-Host "`n[5/5] TONG KET KET QUA KIEM CHUNG POSTGRESQL:" -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
    Write-Host " ✓ Case A (Schema chinh thuc): Chi co V1-V3, khong co V4-V10, khong co bai hoc staging: PASS" -ForegroundColor Green
    Write-Host " ✓ Case B (Schema local/staging): Co V1-V10, tu dong phe duyet toan bo (APPROVED, 0 pending), HSK 1-6, original records preserved: PASS" -ForegroundColor Green
    Write-Host " ✓ Toan bo tu vung deu dat APPROVED (expanded curriculum), sequences BIGSERIAL dong bo: PASS" -ForegroundColor Green
    Write-Host " ✓ Dong bo sequence BIGSERIAL (lessons, vocabulary, hanzi): ban ghi tu sinh ID lon hon MAX(id) thuc te: PASS" -ForegroundColor Green
    Write-Host " ✓ Flyway idempotency: chay lai migrate khi schema da du nap 0 migration moi: PASS" -ForegroundColor Green
    Write-Host " ✓ SQL seed idempotency: nap lai toan bo file SQL V4-V10 hai lan khong tao ban ghi trung: PASS" -ForegroundColor Green
    Write-Host " ✓ Hibernate/Spring ddl-auto=validate thuc su ket noi PostgreSQL va thanh cong: PASS" -ForegroundColor Green
    Write-Host " ✓ Surefire XML verification: ca 3 test cases deu thuc thi thanh cong (0 fail, 0 error, 0 skip): PASS" -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
}
catch {
    Write-Error "LOI KIEM CHUNG POSTGRESQL: $_"
    exit 1
}
finally {
    if ($originalPgPassword -ne $null) {
        $env:PGPASSWORD = $originalPgPassword
    } else {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
    Set-Location -Path $initialLocation

    if ($StartedContainer -and $CreatedContainerName) {
        if (-not $KeepContainer) {
            Write-Host "`nDon dep container co lap do luot chay nay tao ra ($CreatedContainerName)..." -ForegroundColor Gray
            docker rm -f $CreatedContainerName 2>$null | Out-Null
        } else {
            Write-Host "`nGiu lai container $CreatedContainerName theo co -KeepContainer." -ForegroundColor Yellow
        }
    }
}
