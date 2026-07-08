$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = if (Test-Path $bundledNode) { $bundledNode } else { "node" }
$vite = Join-Path $repoRoot "node_modules\vite\bin\vite.js"

& $node $vite --host 127.0.0.1 --port 5173

