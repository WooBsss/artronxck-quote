# Auto-backup to GitHub: commit every change in this folder and push it.
# Run by the Claude Code "Stop" hook after each prompt; safe to run by hand any time.
# Prints one JSON line ({"systemMessage": ...}) so Claude Code can show the result.
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

function Say($msg) { [Console]::Out.WriteLine((@{ systemMessage = $msg } | ConvertTo-Json -Compress)); exit 0 }

$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) { $git = 'C:\Program Files\Git\cmd\git.exe' }
if (-not (Test-Path $git)) { Say 'GitHub backup skipped: Git is not installed.' }
if (-not (Test-Path (Join-Path $PSScriptRoot '.git'))) { Say 'GitHub backup skipped: this folder is not a git repository.' }

$remote = & $git remote get-url origin 2>$null
if (-not $remote) { Say 'GitHub backup skipped: no GitHub remote (origin) set yet.' }

& $git add -A 2>&1 | Out-Null
& $git diff --cached --quiet
$hasChanges = $LASTEXITCODE -ne 0

if ($hasChanges) {
  $count = (& $git diff --cached --name-only | Measure-Object -Line).Lines
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
  $msg = "Auto backup $stamp ($count file(s) changed)`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  $out = & $git commit -q -m $msg 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { Say "GitHub backup failed at commit: $($out.Trim())" }
}

# push if the local branch is ahead of GitHub (also retries pushes that failed earlier)
$branch = (& $git rev-parse --abbrev-ref HEAD).Trim()
& $git fetch -q origin 2>&1 | Out-Null
$ahead = & $git rev-list --count "origin/$branch..HEAD" 2>$null
if ($LASTEXITCODE -ne 0) { $ahead = 1 }  # branch not on GitHub yet
if ([int]$ahead -eq 0) {
  if ($hasChanges) { Say 'GitHub backup: committed, already up to date.' }
  exit 0  # nothing new: stay quiet
}

$out = & $git push -q -u origin $branch 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Say "GitHub backup failed at push: $($out.Trim())" }
$sha = (& $git rev-parse --short HEAD).Trim()
Say "Backed up to GitHub ($branch @ $sha)"
