param(
  [string]$Root = "$env:USERPROFILE\Documents\Nihongo-Tokkun-Next"
)

$ErrorActionPreference = 'Stop'
$patchRoot = $PSScriptRoot

if (-not (Test-Path (Join-Path $Root 'package.json'))) {
  throw "Target project tidak ditemukan: $Root"
}

$files = @(
  'src\components\TtsButton.tsx',
  'src\features\flashcards\ReviewExitDialog.tsx',
  'src\features\flashcards\FlashcardShell.tsx',
  'src\features\quiz\QuizShell.tsx',
  'src\features\quiz\PassageDisplay.tsx',
  'src\app\globals.css',
  'src\__tests__\uiParityV15.test.ts'
)

foreach ($relative in $files) {
  $source = Join-Path $patchRoot $relative
  $destination = Join-Path $Root $relative
  $destinationDir = Split-Path $destination -Parent
  New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
  Copy-Item -Force $source $destination
  Write-Host "Updated: $relative"
}

Write-Host ''
Write-Host 'v1.5 patch applied.' -ForegroundColor Green
Write-Host 'Next:'
Write-Host "  cd `"$Root`""
Write-Host '  npm.cmd test'
Write-Host '  npm.cmd run build'
