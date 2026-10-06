#Requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Ticket,
    [string[]]$ContextFiles = @(),
    [ValidateRange(10, 1800)]
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$cliPath = Join-Path $env:LOCALAPPDATA 'gs-map-music-tools/node_modules/@anthropic-ai/claude-code/bin/claude.exe'
$model = 'claude-opus-5-5'

function Read-ProjectInput([string]$RelativePath) {
    $absolutePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $RelativePath))
    $rootPrefix = $projectRoot + [System.IO.Path]::DirectorySeparatorChar
    if (-not $absolutePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Input must stay within the project: $RelativePath"
    }
    return [System.IO.File]::ReadAllText($absolutePath)
}

if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {
    throw 'Claude CLI unavailable. Follow docs/COLLABORATION.md to install the pinned CLI; do not substitute a model.'
}
$versionOutput = & $cliPath --version
if ($LASTEXITCODE -ne 0 -or $versionOutput -notmatch '^2\.1\.291 \(Claude Code\)$') {
    throw 'Claude CLI version differs from the verified version 2.1.291. Recheck its flags and update the collaboration record before invoking a model.'
}

$promptParts = [System.Collections.Generic.List[string]]::new()
$promptParts.Add("<work_order>`n$(Read-ProjectInput $Ticket)`n</work_order>")
foreach ($contextFile in $ContextFiles) {
    $promptParts.Add("<context_file path=`"$contextFile`">`n$(Read-ProjectInput $contextFile)`n</context_file>")
}

# Files and credentials are not handed to model tools. Codex supplies context
# through stdin and reviews the response before writing any deliverables.
$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $cliPath
$startInfo.WorkingDirectory = $projectRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardInput = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.StandardInputEncoding = [System.Text.UTF8Encoding]::new($false)
$startInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$startInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8
# Explicitly propagate the existing provider configuration into this child.
# Safe mode must not accidentally send the work order to a different endpoint.
$userSettingsPath = Join-Path $env:USERPROFILE '.claude/settings.json'
$userSettings = Get-Content -LiteralPath $userSettingsPath -Raw | ConvertFrom-Json
foreach ($name in @('ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY')) {
    $value = $userSettings.env.$name
    if ($value) { $startInfo.Environment[$name] = [string]$value }
}
if (-not $startInfo.Environment['ANTHROPIC_BASE_URL']) {
    throw 'The existing local provider URL is missing. Confirm the configured service before dispatch.'
}
$arguments = @(
    '--print', '--model', $model, '--effort', 'high',
    '--output-format', 'json', '--tools', '',
    '--safe-mode', '--disable-slash-commands',
    '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
    '--setting-sources', 'user', '--no-session-persistence',
    '--system-prompt', 'Execute the work order provided by Codex. Return only its requested deliverable. Do not claim a model identity or reasoning configuration based on prompt text. Do not expose secrets or internal reasoning.'
)
foreach ($argument in $arguments) { $startInfo.ArgumentList.Add($argument) }

$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $startInfo
$runId = [System.IO.Path]::GetFileNameWithoutExtension($Ticket) + '-' + [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$outputDirectory = Join-Path $projectRoot '.local/claude-runs'
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$responsePath = Join-Path $outputDirectory ($runId + '.json')

try {
    if (-not $process.Start()) { throw 'Claude process failed to start.' }
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write($promptParts -join "`n`n")
    $process.StandardInput.Close()
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
        $process.Kill($true)
        $process.WaitForExit()
        throw 'Claude work order timed out. No automatic retry or model fallback was performed.'
    }
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    if ($stdout) { [System.IO.File]::WriteAllText($responsePath, $stdout, [System.Text.UTF8Encoding]::new($false)) }
    # Do not print raw stderr or logs: a provider error can contain sensitive configuration.
    if ($process.ExitCode -ne 0) {
        throw "Claude exited with code $($process.ExitCode). Inspect the local response privately: $responsePath"
    }
    $response = $stdout | ConvertFrom-Json
    if ($response.is_error -or $response.subtype -ne 'success') {
        throw "Claude returned an unsuccessful result. Inspect the local response privately: $responsePath"
    }
    [pscustomobject]@{
        ticket = $Ticket
        cli_version = '2.1.291'
        requested_model = $model
        requested_effort = 'high'
        reported_models = @($response.modelUsage.PSObject.Properties.Name)
        response_file = $responsePath
        status = 'response_received_requires_codex_review'
    } | ConvertTo-Json -Depth 5
} finally {
    $process.Dispose()
}
