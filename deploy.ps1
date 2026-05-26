# PeLoot — Subir cambios a Git y (opcional) desplegar reglas de Firestore.
# Uso:
#   .\deploy.ps1 -Message "feat: descripción"
#   .\deploy.ps1                    # mensaje por defecto chore: sync

param(
  [string]$Message = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not $Message) { $Message = "chore: sync" }

git add -A
$dirty = git status --porcelain
if (-not $dirty) {
  Write-Host "Sin cambios para commitear." -ForegroundColor Yellow
} else {
  git commit -m $Message
  git push
  Write-Host "`nOK: cambios subidos al remoto." -ForegroundColor Green
}

if (Get-Command firebase -ErrorAction SilentlyContinue) {
  Write-Host "`nDesplegando Firestore rules e índices..." -ForegroundColor Cyan
  firebase deploy --only firestore --non-interactive
  Write-Host "OK: Firestore rules e índices desplegados." -ForegroundColor Green
} else {
  Write-Host "`nDesplegando Firestore rules e índices (firebase-tools vía npx)..." -ForegroundColor Cyan
  npx --yes firebase-tools@13 deploy --only firestore --non-interactive
  Write-Host "OK: Firestore rules e índices desplegados." -ForegroundColor Green
}
