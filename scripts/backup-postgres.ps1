param(
    [string]$Database = $env:PGDATABASE,
    [string]$DatabaseUser = $env:PGUSER,
    [string]$BackupDirectory = (Join-Path $PSScriptRoot '../backups/postgres'),
    [ValidateRange(1,365)][int]$RetentionDays = 14,
    [string]$ContainerName
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^[A-Za-z0-9_]+$' -or $DatabaseUser -notmatch '^[A-Za-z0-9_]+$') { throw 'Set valid PGDATABASE and PGUSER.' }
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$resolvedDirectory = (Resolve-Path -LiteralPath $BackupDirectory).Path
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$destination = Join-Path $resolvedDirectory ($Database + '_' + $stamp + '.dump')
if (Test-Path -LiteralPath $destination) { throw 'Backup already exists.' }
$partial = $destination + '.partial'
try {
    if ($ContainerName) {
        if ($ContainerName -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Invalid container name.' }
        $remoteFile = '/tmp/backup-' + [guid]::NewGuid().ToString('N') + '.dump'
        try {
            & docker exec $ContainerName pg_dump --no-password -U $DatabaseUser -d $Database --format=custom --file=$remoteFile
            if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
            & docker exec $ContainerName pg_restore --list $remoteFile | Out-Null
            if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed.' }
            & docker cp "${ContainerName}:$remoteFile" $partial
            if ($LASTEXITCODE -ne 0) { throw 'Backup copy failed.' }
        } finally { & docker exec $ContainerName rm -f -- $remoteFile | Out-Null }
    } else {
        & pg_dump --no-password -U $DatabaseUser -d $Database --format=custom --file=$partial
        if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
        & pg_restore --list $partial | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed.' }
    }
    Move-Item -LiteralPath $partial -Destination $destination
    $prefix = $resolvedDirectory.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
    $pattern = '^' + [regex]::Escape($Database) + '_[0-9]{8}T[0-9]{6}Z\.dump$'
    Get-ChildItem -LiteralPath $resolvedDirectory -File | Where-Object { $_.Name -match $pattern -and $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-$RetentionDays) } | ForEach-Object {
        $verifiedPath = [IO.Path]::GetFullPath($_.FullName)
        if (-not $verifiedPath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Retention path escaped backup directory.' }
        Remove-Item -LiteralPath $verifiedPath
    }
    Write-Host "Backup verified: $destination"
} finally {
    if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial }
}
