$csPath = Join-Path $PSScriptRoot "server_fast.cs"

if (-not ([System.Management.Automation.PSTypeName]'SimpleDevServer').Type) {
    Add-Type -Path $csPath -Language CSharp
}

$port = 8082
$root = $PSScriptRoot
[SimpleDevServer]::Start($port, $root)

Write-Host "Multi-threaded server active. Press Ctrl+C to exit..."
while ($true) {
    Start-Sleep -Seconds 1
}
