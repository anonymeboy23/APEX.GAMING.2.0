param(
  [int]$DelaySeconds = 8
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Liste volontairement limitée : aucun secret ou fichier système ne sera ajouté.
$trackedFiles = @(
  "app.js", "data.js", "index.html", "style.css", "_headers", "robots.txt", "wrangler.toml", "auto-publish.ps1", "manifest.webmanifest", "icon.svg", "sw.js",
  ".github/workflows/deploy-cloudflare.yml", "schema.sql", "docs/backend-architecture.md",
  "functions/api/health.js", "functions/api/orders.js", "functions/api/orders/[id].js", "functions/api/catalog.js", "functions/api/admin/orders.js", "functions/api/admin/summary.js", "seed.sql", "scripts/smoke-check.mjs", "docs/production-checklist.md"
)

function Get-Snapshot {
  $parts = foreach ($file in $trackedFiles) {
    $path = Join-Path $root $file
    if (Test-Path -LiteralPath $path) {
      $item = Get-Item -LiteralPath $path
      "$file|$($item.Length)|$($item.LastWriteTimeUtc.Ticks)"
    } else {
      "$file|missing"
    }
  }
  return ($parts -join "`n")
}

$lastSnapshot = Get-Snapshot
Write-Host "Publication automatique active. Ctrl+C pour arrêter."
Write-Host "Un commit sera créé après $DelaySeconds secondes sans nouvelle sauvegarde."

while ($true) {
  Start-Sleep -Seconds 3
  $currentSnapshot = Get-Snapshot
  if ($currentSnapshot -eq $lastSnapshot) { continue }

  $lastSnapshot = $currentSnapshot
  Write-Host "Modification détectée. Attente de $DelaySeconds secondes..."
  Start-Sleep -Seconds $DelaySeconds

  if ((Get-Snapshot) -ne $lastSnapshot) { continue }

  git add -- $trackedFiles
  $pending = git status --short -- $trackedFiles
  if (-not $pending) { continue }

  $message = "Mise à jour automatique du site - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  git commit -m $message
  git push origin main
  Write-Host "Site envoyé sur GitHub. Cloudflare peut maintenant le redéployer."
}
