param(
  [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
$buildScript = Join-Path $PSScriptRoot "build-public.mjs"
$nodeArgs = @($buildScript)

if (-not [string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $nodeArgs += "--output"
  $nodeArgs += $OutputDirectory
}

& node @nodeArgs
exit $LASTEXITCODE
