Param(
  [string]$Url = 'https://subbito.base44.app',
  [string]$LocalPath = '.\index.html'
)

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$remoteFile = Join-Path -Path $scriptDir -ChildPath 'live_subbito.html'

Write-Output ("Fetching {0} ..." -f $Url)
try {
  Invoke-WebRequest -Uri $Url -UseBasicParsing -OutFile $remoteFile -ErrorAction Stop
  Write-Output ("Saved remote HTML to {0}" -f $remoteFile)
} catch {
  # Use formatted output to avoid interpolation parsing issues
  $errMsg = if ($_.Exception) { $_.Exception.Message } else { $_.ToString() }
  Write-Error ("Failed to fetch {0}: {1}" -f $Url, $errMsg)
  exit 1
}

if (!(Test-Path $LocalPath)) {
  Write-Warning "Local file $LocalPath not found. Please build or provide local file to compare."
  exit 1
}

Write-Output "Comparing $LocalPath and $remoteFile ..."
$localLines = Get-Content $LocalPath -ErrorAction Stop
$remoteLines = Get-Content $remoteFile -ErrorAction Stop

# Compare-Object returns differences; use SyncWindow 0 for exact line alignment
$differences = Compare-Object -ReferenceObject $localLines -DifferenceObject $remoteLines -SyncWindow 0

if ($differences) {
  Write-Output "Found differences (showing side and line):"
  $differences | ForEach-Object {
    $side = if ($_.SideIndicator -eq '=>') { 'REMOTE' } elseif ($_.SideIndicator -eq '<=' ) { 'LOCAL' } else { $_.SideIndicator }
    Write-Output ("{0}: {1}" -f $side, $_.InputObject)
  }
} else {
  Write-Output "No differences found (line-by-line)"
}

$diffOut = Join-Path -Path $scriptDir -ChildPath 'live_diff.txt'
$differences | Out-File -FilePath $diffOut -Encoding utf8
Write-Output "Saved diff to $diffOut"
