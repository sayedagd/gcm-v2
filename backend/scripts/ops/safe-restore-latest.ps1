Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-DotEnvMap {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing .env file: $Path"
    }

    $map = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trim = $line.Trim()
        if (-not $trim) { continue }
        if ($trim.StartsWith("#")) { continue }
        $idx = $trim.IndexOf("=")
        if ($idx -lt 1) { continue }

        $key = $trim.Substring(0, $idx).Trim()
        $val = $trim.Substring($idx + 1).Trim()

        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        $map[$key] = $val
    }

    return $map
}

function Get-DbTargetFromEnv {
    param([hashtable]$EnvMap)

    $url = $EnvMap["DATABASE_URL"]
    if (-not $url) {
        throw "DATABASE_URL is missing in .env"
    }

    try {
        $uri = [System.Uri]$url
    }
    catch {
        throw "DATABASE_URL is not a valid URI"
    }

    if ($uri.Scheme -notin @("postgresql", "postgres")) {
        throw "DATABASE_URL must use postgresql/postgres scheme. Found: $($uri.Scheme)"
    }

    $userInfo = $uri.UserInfo
    if (-not $userInfo) {
        throw "DATABASE_URL does not include user/password info"
    }

    $parts = $userInfo.Split(":", 2)
    if ($parts.Count -lt 2) {
        throw "DATABASE_URL user/password format is invalid"
    }

    $dbName = $uri.AbsolutePath.TrimStart("/")
    if (-not $dbName) {
        throw "DATABASE_URL does not include database name"
    }

    return [pscustomobject]@{
        Engine   = "postgresql"
        Host     = $uri.Host
        Port     = $(if ($uri.Port -gt 0) { $uri.Port } else { 5432 })
        Database = $dbName
        User     = $parts[0]
        Password = $parts[1]
        RawUrl   = $url
    }
}

function Detect-BackupEngine {
    param([string]$BackupPath)

    if (-not (Test-Path -LiteralPath $BackupPath)) {
        throw "Backup file not found: $BackupPath"
    }

    $head = Get-Content -LiteralPath $BackupPath -TotalCount 200
    $txt = ($head -join "`n")

    $isPostgres =
        ($txt -match "(?im)^\s*SET\s+statement_timeout") -or
        ($txt -match "(?im)^\s*SET\s+client_encoding") -or
        ($txt -match "(?im)\bpg_catalog\b") -or
        ($txt -match "(?im)\bCOPY\s+.*\s+FROM\s+stdin\b")

    $isMysql =
        ($txt -match "(?im)^--\s*MySQL") -or
        ($txt -match "(?im)^/\*!\d+") -or
        ($txt -match "(?im)\bENGINE=InnoDB\b") -or
        ($txt -match "(?im)\bLOCK TABLES\b")

    if ($isPostgres -and -not $isMysql) { return "postgresql" }
    if ($isMysql -and -not $isPostgres) { return "mysql" }
    if ($isPostgres -and $isMysql) { return "ambiguous" }
    return "unknown"
}

function Require-Tool {
    param([string]$Name)

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "Required tool not found in PATH: $Name"
    }
}

function Invoke-Psql {
    param(
        [string]$DbHost,
        [int]$Port,
        [string]$Db,
        [string]$User,
        [string]$Sql
    )

    & psql -h $DbHost -p $Port -U $User -d $Db -v ON_ERROR_STOP=1 -X -t -A -c $Sql
}

function Get-BackupInsertCounts {
    param([string]$BackupPath)

    $counts = @{}
    foreach ($line in Get-Content -LiteralPath $BackupPath) {
        if ($line -match '^\s*INSERT\s+INTO\s+("?([A-Za-z0-9_]+)"?)') {
            $table = $matches[2]
            if (-not $counts.ContainsKey($table)) { $counts[$table] = 0 }
            $counts[$table]++
        }
    }

    return $counts
}

function Get-BackupInsertColumnMap {
    param([string]$BackupPath)

    $map = @{}
    foreach ($line in Get-Content -LiteralPath $BackupPath) {
        if ($line -match '^\s*INSERT\s+INTO\s+"?([A-Za-z0-9_]+)"?\s*\((.+)\)\s*VALUES\s*\(') {
            $table = $matches[1]
            $rawCols = $matches[2]

            if (-not $map.ContainsKey($table)) {
                $map[$table] = New-Object 'System.Collections.Generic.HashSet[string]'
            }

            foreach ($part in ($rawCols -split ',')) {
                $col = $part.Trim().Trim('"')
                if ($col) {
                    [void]$map[$table].Add($col)
                }
            }
        }
    }

    return $map
}

function Main {
    $repoRoot = Resolve-Path "."
    $envPath = Join-Path $repoRoot "backend\.env"
    $backupPath = Join-Path $repoRoot "latest_backup.sql"

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $opsDir = Join-Path $repoRoot "backend\backups\ops"
    $logDir = Join-Path $opsDir "logs"
    New-Item -ItemType Directory -Force -Path $opsDir | Out-Null
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    $rollbackDump = Join-Path $opsDir ("ROLLBACK_POINT_" + $timestamp + ".dump")
    $restoreLog = Join-Path $logDir ("restore_" + $timestamp + ".log")
    $verifyCsv = Join-Path $logDir ("verify_" + $timestamp + ".csv")
    $orderedRestoreSql = Join-Path $logDir ("ordered_restore_" + $timestamp + ".sql")

    Require-Tool "psql"
    Require-Tool "pg_dump"

    $envMap = Get-DotEnvMap -Path $envPath
    $target = Get-DbTargetFromEnv -EnvMap $envMap

    $backupEngine = Detect-BackupEngine -BackupPath $backupPath
    if ($backupEngine -eq "unknown") { throw "Unable to detect backup SQL engine from header/content." }
    if ($backupEngine -eq "ambiguous") { throw "Backup engine detection is ambiguous. Aborting." }
    if ($backupEngine -ne $target.Engine) {
        throw "Engine mismatch. .env=$($target.Engine), backup=$backupEngine"
    }

    $env:PGPASSWORD = $target.Password

    try {
        Write-Host "Precheck: engine aligned -> $backupEngine"
        Write-Host "Precheck: target host=$($target.Host) port=$($target.Port) db=$($target.Database) user=$($target.User)"

        $serverVersion = Invoke-Psql -DbHost $target.Host -Port $target.Port -Db $target.Database -User $target.User -Sql "SHOW server_version;"
        Write-Host "Precheck: server_version=$serverVersion"

        $head = Get-Content -LiteralPath $backupPath -TotalCount 500
        $hasInsert = ($head -match '(?im)^\s*INSERT\s+INTO').Count -gt 0
        $hasDelete = ($head -match '(?im)^\s*DELETE\s+FROM').Count -gt 0
        if (-not $hasInsert) { throw "Backup appears to have no INSERT statements in header sample." }
        if (-not $hasDelete) {
            Write-Warning "Backup header sample has no DELETE statements. Continue only if intended."
        }

        $tableCount = Invoke-Psql -DbHost $target.Host -Port $target.Port -Db $target.Database -User $target.User -Sql @"
SELECT count(*)
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE';
"@
        Write-Host "Precheck: public table count=$tableCount"

        $expected = Get-BackupInsertCounts -BackupPath $backupPath
        if ($expected.Count -eq 0) {
            throw "No INSERT targets found in backup. Aborting."
        }

        $insertColumnsByTable = Get-BackupInsertColumnMap -BackupPath $backupPath

        $missing = @()
        foreach ($t in $expected.Keys) {
            $exists = Invoke-Psql -DbHost $target.Host -Port $target.Port -Db $target.Database -User $target.User -Sql "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$t');"
            if ($exists -ne "t") { $missing += $t }
        }
        if ($missing.Count -gt 0) {
            throw ("Schema mismatch: backup references missing tables in target DB: " + ($missing -join ", "))
        }

        $missingColumns = @()
        foreach ($t in $insertColumnsByTable.Keys) {
            $dbColsRaw = Invoke-Psql -DbHost $target.Host -Port $target.Port -Db $target.Database -User $target.User -Sql "SELECT COALESCE(string_agg(column_name, '|'), '') FROM information_schema.columns WHERE table_schema='public' AND table_name='$t';"
            $dbCols = New-Object 'System.Collections.Generic.HashSet[string]'
            foreach ($c in ($dbColsRaw -split '\|')) {
                if ($c) { [void]$dbCols.Add($c) }
            }

            foreach ($col in $insertColumnsByTable[$t]) {
                if (-not $dbCols.Contains($col)) {
                    $missingColumns += "$t.$col"
                }
            }
        }

        if ($missingColumns.Count -gt 0) {
            throw ("Schema mismatch: backup references missing target columns: " + ($missingColumns -join ", "))
        }

        Write-Host "Creating rollback dump..."
        & pg_dump `
            -h $target.Host -p $target.Port -U $target.User -d $target.Database `
            -F c -Z 9 --no-owner --no-privileges `
            -f $rollbackDump
        if ($LASTEXITCODE -ne 0) { throw "pg_dump failed; restore aborted." }

        Write-Host "Cleaning target tables (truncate public schema tables)..."
        $truncateSql = @'
    DO $do$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT format('%I.%I', schemaname, tablename) AS fqtn
        FROM pg_tables
        WHERE schemaname='public'
    LOOP
        EXECUTE 'TRUNCATE TABLE ' || r.fqtn || ' RESTART IDENTITY CASCADE;';
    END LOOP;
END
$do$;
'@
        & psql -h $target.Host -p $target.Port -U $target.User -d $target.Database -v ON_ERROR_STOP=1 -X -c $truncateSql
        if ($LASTEXITCODE -ne 0) { throw "Truncate phase failed; rollback dump preserved at: $rollbackDump" }

        Write-Host "Preparing dependency-ordered restore plan..."
        $allLines = Get-Content -LiteralPath $backupPath
        $preamble = New-Object System.Collections.Generic.List[string]
        $tableSections = @{}
        $currentTable = $null

        foreach ($line in $allLines) {
            if ($line -match '^--\s*Table:\s*([A-Za-z0-9_]+)') {
                $currentTable = $matches[1]
                if (-not $tableSections.ContainsKey($currentTable)) {
                    $tableSections[$currentTable] = New-Object System.Collections.Generic.List[string]
                }
                continue
            }

            if ($null -eq $currentTable) {
                $preamble.Add($line)
            }
            else {
                $tableSections[$currentTable].Add($line)
            }
        }

        $tablesInBackup = @($expected.Keys)
        $fkRows = Invoke-Psql -DbHost $target.Host -Port $target.Port -Db $target.Database -User $target.User -Sql @"
SELECT tc.table_name || '|' || ccu.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.constraint_schema = ccu.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
"@

        $deps = @{}
        $children = @{}
        foreach ($t in $tablesInBackup) {
            $deps[$t] = New-Object 'System.Collections.Generic.HashSet[string]'
            $children[$t] = New-Object 'System.Collections.Generic.HashSet[string]'
        }

        foreach ($row in ($fkRows -split "`r?`n")) {
            if (-not $row) { continue }
            $parts = $row.Split('|', 2)
            if ($parts.Count -ne 2) { continue }
            $childTable = $parts[0]
            $parentTable = $parts[1]
            if ($childTable -eq $parentTable) { continue }
            if (-not $deps.ContainsKey($childTable)) { continue }
            if (-not $deps.ContainsKey($parentTable)) { continue }

            [void]$deps[$childTable].Add($parentTable)
            [void]$children[$parentTable].Add($childTable)
        }

        $ready = @($tablesInBackup | Where-Object { $deps[$_].Count -eq 0 } | Sort-Object)
        $orderedTables = @()

        while (@($ready).Length -gt 0) {
            $current = $ready[0]
            if (@($ready).Length -eq 1) {
                $ready = @()
            }
            else {
                $ready = @($ready[1..(@($ready).Length - 1)])
            }

            $orderedTables += $current

            foreach ($childTable in ($children[$current] | Sort-Object)) {
                [void]$deps[$childTable].Remove($current)
                if ($deps[$childTable].Count -eq 0 -and -not ($orderedTables -contains $childTable) -and -not ($ready -contains $childTable)) {
                    $ready += $childTable
                }
            }

            $ready = @($ready | Sort-Object -Unique)
        }

        if ($orderedTables.Count -lt $tablesInBackup.Count) {
            $remaining = @($tablesInBackup | Where-Object { -not ($orderedTables -contains $_) } | Sort-Object)
            Write-Warning "FK cycle or unresolved dependency detected for: $($remaining -join ', '). Appending remaining tables in lexical order."
            foreach ($t in $remaining) {
                $orderedTables += $t
            }
        }

        $sqlOut = New-Object System.Collections.Generic.List[string]
        foreach ($line in $preamble) {
            $sqlOut.Add($line)
        }
        foreach ($table in $orderedTables) {
            if ($tableSections.ContainsKey($table)) {
                $sqlOut.Add("")
                $sqlOut.Add("-- Table: $table")
                foreach ($line in $tableSections[$table]) {
                    $sqlOut.Add($line)
                }
            }
        }

        Set-Content -LiteralPath $orderedRestoreSql -Value $sqlOut -Encoding UTF8

        Write-Host "Restoring backup file in dependency order..."
        & psql `
            -h $target.Host -p $target.Port -U $target.User -d $target.Database `
            -v ON_ERROR_STOP=1 -X --single-transaction `
            --set=client_encoding=UTF8 `
            -f $orderedRestoreSql -L $restoreLog
        if ($LASTEXITCODE -ne 0) {
            throw "Restore failed. Use rollback dump: $rollbackDump"
        }

        Write-Host "Validating foreign key integrity..."
        $fkValidationSql = @'
DO $do$
DECLARE
    c RECORD;
    rel RECORD;
    joinExpr TEXT;
    anyNotNullExpr TEXT;
    violationCount BIGINT;
BEGIN
    FOR c IN
        SELECT con.oid,
               con.conname,
               con.conrelid,
               con.confrelid,
               con.conkey,
               con.confkey
        FROM pg_constraint con
        JOIN pg_class child_tbl ON child_tbl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = child_tbl.relnamespace
        WHERE con.contype = 'f'
          AND ns.nspname = 'public'
    LOOP
        SELECT
            string_agg(format('c.%I = p.%I', child_att.attname, parent_att.attname), ' AND ' ORDER BY keys.ord),
            string_agg(format('c.%I IS NOT NULL', child_att.attname), ' OR ' ORDER BY keys.ord)
        INTO joinExpr, anyNotNullExpr
        FROM (
            SELECT ck.attnum AS child_attnum, pk.attnum AS parent_attnum, ck.ord
            FROM unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord)
            JOIN unnest(c.confkey) WITH ORDINALITY AS pk(attnum, ord)
              ON ck.ord = pk.ord
        ) AS keys
        JOIN pg_attribute child_att
          ON child_att.attrelid = c.conrelid
         AND child_att.attnum = keys.child_attnum
        JOIN pg_attribute parent_att
          ON parent_att.attrelid = c.confrelid
         AND parent_att.attnum = keys.parent_attnum;

        IF joinExpr IS NULL OR anyNotNullExpr IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'SELECT count(*) FROM %s c WHERE (%s) AND NOT EXISTS (SELECT 1 FROM %s p WHERE %s)',
            c.conrelid::regclass,
            anyNotNullExpr,
            c.confrelid::regclass,
            joinExpr
        ) INTO violationCount;

        IF violationCount > 0 THEN
            RAISE EXCEPTION 'Foreign key violation after restore on constraint %, orphan rows=%', c.conname, violationCount;
        END IF;
    END LOOP;
END
$do$;
'@
        & psql -h $target.Host -p $target.Port -U $target.User -d $target.Database -v ON_ERROR_STOP=1 -X -c $fkValidationSql
        if ($LASTEXITCODE -ne 0) {
            throw "Foreign key integrity validation failed after restore. Use rollback dump: $rollbackDump"
        }

        Write-Host "Running post-restore integrity verification..."
        "table,expected_rows,actual_rows,status" | Out-File -LiteralPath $verifyCsv -Encoding utf8

        $failed = 0
        foreach ($table in ($expected.Keys | Sort-Object)) {
            $expectedRows = [int]$expected[$table]
            $countSql = 'SELECT count(*) FROM public."' + $table + '";'
            $actualRaw = Invoke-Psql -DbHost $target.Host -Port $target.Port -Db $target.Database -User $target.User -Sql $countSql
            $actualRows = [int]$actualRaw
            $status = if ($expectedRows -eq $actualRows) { "OK" } else { "MISMATCH" }
            if ($status -ne "OK") { $failed++ }
            "$table,$expectedRows,$actualRows,$status" | Out-File -LiteralPath $verifyCsv -Append -Encoding utf8
        }

        if ($failed -gt 0) {
            throw "Verification failed: $failed table(s) mismatch. See: $verifyCsv"
        }

        Write-Host "SUCCESS: Restore completed and verification passed."
        Write-Host "Rollback dump: $rollbackDump"
        Write-Host "Restore log:   $restoreLog"
        Write-Host "Verify report: $verifyCsv"
    }
    finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

Main