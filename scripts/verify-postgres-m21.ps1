# ==============================================================================
# Script: scripts/verify-postgres-m21.ps1
# Mục đích: Kiểm chứng PostgreSQL trong môi trường cô lập cho Milestone M2.1.1
#
# Kiểm tra:
# 1. Trường hợp A (Schema chính thức): Chỉ nạp db/migration (V1-V3)
# 2. Trường hợp B (Schema local/staging): Nạp db/migration + db/migration-staging (V1-V4)
# 3. Hibernate ddl-auto=validate thực sự chạy trên PostgreSQL không dùng create/create-drop
# 4. Bài intro-greetings có đúng 10 từ pending, không gán nhầm; nội dung cũ không bị đổi trạng thái
# 5. Schema chính thức không nạp V4
# 6. Đồng bộ sequence BIGSERIAL: bản ghi tự sinh ID lớn hơn MAX(id) thực tế
# 7. Phân biệt rõ: Flyway migrate lại nạp 0 migration mới & SQL seed tự chống trùng khi tái chạy
# 8. Xác minh kết quả thực thi qua Surefire XML (không failures, không errors, không skipped)
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
$SurefireReportPath = "$RepoRoot/backend/target/surefire-reports/TEST-com.heyganba.PostgresSchemaStagingRehearsalTest.xml"

$initialLocation = Get-Location
$originalPgPassword = $env:PGPASSWORD

$StartedContainer = $false
$CreatedContainerName = $null

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  HeyGanba - M2.1.1 PostgreSQL Schema A & B Verification Script  " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Hàm xác minh kết quả test thực sự qua file XML của Surefire
function Assert-SurefireResults {
    param(
        [string]$ReportFile,
        [string[]]$ExpectedTests
    )

    if (-not (Test-Path -Path $ReportFile)) {
        throw "Không tìm thấy file kết quả Surefire XML mới tại: $ReportFile"
    }

    [xml]$xml = Get-Content -Path $ReportFile -Raw
    $suite = $xml.testsuite
    if (-not $suite) {
        throw "File Surefire XML không chứa thẻ <testsuite> hợp lệ: $ReportFile"
    }

    $testsCount = [int]$suite.tests
    $failuresCount = [int]$suite.failures
    $errorsCount = [int]$suite.errors
    $skippedCount = [int]$suite.skipped

    if ($failuresCount -gt 0 -or $errorsCount -gt 0) {
        throw "Surefire báo cáo có lỗi thực thi: failures=$failuresCount, errors=$errorsCount trong $ReportFile"
    }

    if ($skippedCount -gt 0) {
        throw "Surefire báo cáo có test bị bỏ qua: skipped=$skippedCount trong $ReportFile. Không chấp nhận test bị skip!"
    }

    $testCases = @($suite.testcase)
    if ($testCases.Count -ne $ExpectedTests.Count) {
        throw "Số lượng testcase thực tế ($($testCases.Count)) không khớp với số test kỳ vọng ($($ExpectedTests.Count)) trong $ReportFile."
    }

    foreach ($expected in $ExpectedTests) {
        $found = $testCases | Where-Object { $_.name -like "$expected*" }
        if (-not $found) {
            throw "Không tìm thấy test '$expected' trong kết quả Surefire XML ($ReportFile)."
        }
        if ($found.failure -or $found.error -or $found.skipped) {
            throw "Test '$expected' chứa trạng thái failure/error/skipped trong Surefire XML."
        }
    }
}

# Tạo Run ID duy nhất cho lượt chạy này
$RunId = [guid]::NewGuid().ToString("N").Substring(0, 8)
if ([string]::IsNullOrWhiteSpace($ContainerName)) {
    $ContainerName = "heyganba-rehearsal-$RunId"
}
$DbNameA = "heyganba_rehearsal_a_$RunId"
$DbNameB = "heyganba_rehearsal_b_$RunId"

try {
    Write-Host "`n[1/5] Kiểm tra Docker daemon và khởi chạy container riêng trên 127.0.0.1:$Port..." -ForegroundColor Yellow

    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "DOCKER KHÔNG CHẠY HOẶC KHÔNG THỂ KẾT NỐI: $dockerInfo"
        Write-Host "`nHƯỚNG DẪN: Vui lòng mở Docker Desktop và đảm bảo Docker daemon đã sẵn sàng ('docker ps' hoạt động bình thường)." -ForegroundColor Red
        Write-Host "Script dừng ngay lập tức và KHÔNG tự fallback sang localhost:5432 để bảo vệ môi trường cá nhân.`n" -ForegroundColor Red
        exit 1
    }

    # Kiểm tra container đã tồn tại hay chưa: thu output vào mảng và kiểm tra LASTEXITCODE ngay
    $existingContainers = @(docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}" 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Lệnh 'docker ps' kiểm tra container thất bại (exit code $LASTEXITCODE): $($existingContainers -join ' ')"
        exit 1
    }

    # Xử lý danh sách an toàn, không gọi phương thức trên $null
    $matchedContainer = $existingContainers | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Where-Object { $_.Trim() -eq $ContainerName }
    if ($matchedContainer) {
        Write-Error "Container '$ContainerName' đã tồn tại. Script dừng lại để tránh can thiệp container có sẵn, không xoá hay tái sử dụng. Vui lòng xoá thủ công nếu là container cũ hoặc chạy lại để script tự sinh tên ngẫu nhiên."
        exit 1
    }

    Write-Host "Khởi động container cô lập '$ContainerName' bind vào 127.0.0.1:$Port..." -ForegroundColor Gray
    docker run --name $ContainerName `
        -e POSTGRES_PASSWORD=$PostgresPassword `
        -e POSTGRES_USER=$PostgresUser `
        -p "127.0.0.1:${Port}:5432" `
        -d postgres:16-alpine 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Lệnh 'docker run' thất bại (exit code $LASTEXITCODE)."
        exit 1
    }

    $StartedContainer = $true
    $CreatedContainerName = $ContainerName

    Write-Host "Chờ PostgreSQL sẵn sàng qua pg_isready (timeout 30s)..." -ForegroundColor Gray
    $timeoutSeconds = 30
    $elapsed = 0
    $isReady = $false

    while ($elapsed -lt $timeoutSeconds) {
        docker exec $ContainerName pg_isready -U $PostgresUser -h 127.0.0.1 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $isReady = $true
            break
        }
        Start-Sleep -Seconds 1
        $elapsed += 1
    }

    if (-not $isReady) {
        Write-Error "PostgreSQL trong container '$ContainerName' không sẵn sàng sau $timeoutSeconds giây."
        exit 1
    }
    Write-Host "PostgreSQL đã sẵn sàng sau $elapsed giây." -ForegroundColor Gray

    # Tạo 2 database rỗng, mới hoàn toàn: không DROP DATABASE, không flyway.clean()
    Write-Host "`n[2/5] Tạo 2 database rehearsal độc lập và rỗng ($DbNameA, $DbNameB)..." -ForegroundColor Yellow

    docker exec -i $ContainerName psql -U $PostgresUser -d postgres -c "CREATE DATABASE $DbNameA;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Không thể tạo database '$DbNameA' (exit code $LASTEXITCODE)."
        exit 1
    }

    docker exec -i $ContainerName psql -U $PostgresUser -d postgres -c "CREATE DATABASE $DbNameB;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Không thể tạo database '$DbNameB' (exit code $LASTEXITCODE)."
        exit 1
    }
    Write-Host "Đã tạo 2 database rỗng: $DbNameA và $DbNameB." -ForegroundColor Gray

    # Truyền URL chính xác vào test rehearsal
    $UrlA = "jdbc:postgresql://127.0.0.1:$Port/$DbNameA"
    $UrlB = "jdbc:postgresql://127.0.0.1:$Port/$DbNameB"

    Set-Location -Path "$RepoRoot/backend"

    Write-Host "`n[3/5] Chạy kiểm chứng Case A và Case B (PostgresSchemaStagingRehearsalTest)..." -ForegroundColor Yellow

    # Xoá report XML cũ trước khi chạy để đảm bảo không đọc nhầm report cũ
    Remove-Item -Path $SurefireReportPath -Force -ErrorAction SilentlyContinue

    mvn test `
        "-Dtest=PostgresSchemaStagingRehearsalTest#caseA_officialSchemaOnly,PostgresSchemaStagingRehearsalTest#caseB_stagingSchemaWithV4" `
        "-Dpostgres.rehearsal=true" `
        "-Dpostgres.rehearsal.urlA=$UrlA" `
        "-Dpostgres.rehearsal.urlB=$UrlB" `
        "-Dpostgres.rehearsal.user=$PostgresUser" `
        "-Dpostgres.rehearsal.password=$PostgresPassword" `
        "-DfailIfNoTests=true"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kiểm chứng Case A & Case B THẤT BẠI (Maven exit code $LASTEXITCODE)."
        exit 1
    }

    # Đọc Surefire XML mới tạo: xác nhận đúng 2 case A và B, không failure/error/skipped
    Assert-SurefireResults -ReportFile $SurefireReportPath -ExpectedTests @("caseA_officialSchemaOnly", "caseB_stagingSchemaWithV4")
    Write-Host "✓ Case A & Case B thực sự chạy và hoàn thành xuất sắc (xác nhận qua Surefire XML)." -ForegroundColor Green

    Write-Host "`n[4/5] Chạy Hibernate ddl-auto=validate thực sự với PostgreSQL Schema Staging..." -ForegroundColor Yellow

    # Xoá report XML cũ trước lượt chạy Case C
    Remove-Item -Path $SurefireReportPath -Force -ErrorAction SilentlyContinue

    mvn test `
        "-Dtest=PostgresSchemaStagingRehearsalTest#caseC_hibernateSchemaValidation" `
        "-Dpostgres.rehearsal=true" `
        "-Dpostgres.rehearsal.urlA=$UrlA" `
        "-Dpostgres.rehearsal.urlB=$UrlB" `
        "-Dpostgres.rehearsal.user=$PostgresUser" `
        "-Dpostgres.rehearsal.password=$PostgresPassword" `
        "-DfailIfNoTests=true"

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kiểm chứng Hibernate ddl-auto=validate THẤT BẠI (Maven exit code $LASTEXITCODE)."
        exit 1
    }

    # Đọc Surefire XML mới tạo: xác nhận đúng case C thực thi và pass
    Assert-SurefireResults -ReportFile $SurefireReportPath -ExpectedTests @("caseC_hibernateSchemaValidation")
    Write-Host "✓ Hibernate ddl-auto=validate thực sự chạy và thành công (xác nhận qua Surefire XML)." -ForegroundColor Green

    Write-Host "`n[5/5] TỔNG KẾT KẾT QUẢ KIỂM CHỨNG POSTGRESQL:" -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
    Write-Host " ✓ Case A (Schema chính thức): Chỉ có V1-V3, không có V4, không có bài intro-greetings: PASS" -ForegroundColor Green
    Write-Host " ✓ Case B (Schema local/staging): Có V1-V4, đúng 10 từ pending cho bài intro-greetings: PASS" -ForegroundColor Green
    Write-Host " ✓ Từ vựng HSK1 bài 1-3 trước đó không bị đổi trạng thái (38 từ vẫn APPROVED): PASS" -ForegroundColor Green
    Write-Host " ✓ Đồng bộ sequence BIGSERIAL: bản ghi tự sinh ID lớn hơn MAX(id) thực tế: PASS" -ForegroundColor Green
    Write-Host " ✓ Flyway idempotency: chạy lại migrate khi schema đã đủ nạp 0 migration mới: PASS" -ForegroundColor Green
    Write-Host " ✓ SQL seed idempotency: nạp lại toàn bộ file SQL V4 không tạo bản ghi trùng: PASS" -ForegroundColor Green
    Write-Host " ✓ Hibernate/Spring ddl-auto=validate thực sự kết nối PostgreSQL và thành công: PASS" -ForegroundColor Green
    Write-Host " ✓ Surefire XML verification: cả 3 test cases đều thực thi thành công (0 fail, 0 error, 0 skip): PASS" -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
}
catch {
    Write-Error "LỖI KIỂM CHỨNG POSTGRESQL: $_"
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
            Write-Host "`nDọn dẹp container cô lập do lượt chạy này tạo ra ($CreatedContainerName)..." -ForegroundColor Gray
            docker rm -f $CreatedContainerName 2>$null | Out-Null
        } else {
            Write-Host "`nGiữ lại container $CreatedContainerName theo cờ -KeepContainer." -ForegroundColor Yellow
        }
    }
}
