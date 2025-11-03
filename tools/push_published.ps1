param(
  [string]$RepoPath = "C:\Users\LUCA\Desktop\SUBBITO PUBBLICATA",
  [string]$Message = "chore: publish copy update"
)

Write-Host "Publishing repo at: $RepoPath" -ForegroundColor Cyan
if (!(Test-Path $RepoPath)) {
  Write-Error "Path not found: $RepoPath"
  exit 1
}

# Stage changes
& git -C "$RepoPath" add -A | Out-Null

# Check if there is anything to commit
$changes = & git -C "$RepoPath" status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Host "No changes to commit." -ForegroundColor Yellow
} else {
  & git -C "$RepoPath" commit -m $Message | Write-Output
}

# Ensure main exists
try {
  & git -C "$RepoPath" rev-parse --abbrev-ref main | Out-Null
} catch {
  & git -C "$RepoPath" branch -M main | Out-Null
}

# Push
& git -C "$RepoPath" push -u origin main | Write-Output

# Show remote info
Write-Host "Remote:" -ForegroundColor Green
& git -C "$RepoPath" remote -v | Write-Output

Write-Host "Done." -ForegroundColor Green
