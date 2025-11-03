Param(
  [string]$LiveHtml = '.\tools\live_subbito.html',
  [string]$BaseUrl = 'https://subbito.base44.app'
)

if (!(Test-Path $LiveHtml)) {
  Write-Error "Live HTML not found at $LiveHtml. Run npm run compare:live first to fetch it."
  exit 1
}

$content = Get-Content $LiveHtml -Raw

$pattern = @'
(?:src|href)\s*=\s*["']([^"']+)["']
'@
$urls = @{}
[regex]::Matches($content, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase) | ForEach-Object {
  $u = $_.Groups[1].Value.Trim()
  if ($u) { $urls[$u] = $true }
}

if ($urls.Count -eq 0) {
  Write-Output "No asset URLs found in $LiveHtml"
  exit 0
}

$outDir = Join-Path -Path (Split-Path -Parent $LiveHtml) -ChildPath 'live_assets'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$report = @()

foreach ($u in $urls.Keys) {
  # normalize to absolute URL
  if ($u.StartsWith('//')) { $abs = 'https:' + $u }
  elseif ($u.StartsWith('http://') -or $u.StartsWith('https://')) { $abs = $u }
  elseif ($u.StartsWith('/')) { $abs = ($BaseUrl.TrimEnd('/') + $u) }
  else { $abs = ($BaseUrl.TrimEnd('/') + '/' + $u) }

  # create a safe local path preserving directories
  # If the URL is absolute, use host + path to avoid invalid characters like ':' in file/folder names
  try {
    $uri = [System.Uri]$abs
  $uriHost = $uri.Host
  $pathPart = $uri.AbsolutePath.TrimStart('/')
  if ([string]::IsNullOrEmpty($pathPart)) { $relativePath = $uriHost } else { $relativePath = Join-Path -Path $uriHost -ChildPath ($pathPart -replace '/','\\') }
  } catch {
    # not a full URI (relative path), fallback to original behavior
    $relativePath = $u.TrimStart('/').Replace('/','\\')
  }

  # sanitize path segments to remove invalid filename/path characters (e.g. ':')
  $invalidChars = [System.IO.Path]::GetInvalidFileNameChars()
  $cleanParts = @()
  foreach ($part in $relativePath -split '\\') {
    $p = $part
    foreach ($c in $invalidChars) { $p = $p.Replace($c, '_') }
    if ($p -ne '') { $cleanParts += $p }
  }
  $cleanRelative = ($cleanParts -join '\\')

  $localPath = Join-Path -Path $outDir -ChildPath $cleanRelative
  $localDir = Split-Path -Parent $localPath
  if (!(Test-Path $localDir)) { New-Item -ItemType Directory -Force -Path $localDir | Out-Null }

  Write-Output ("Downloading {0} -> {1}" -f $abs, $localPath)
  try {
    Invoke-WebRequest -Uri $abs -UseBasicParsing -OutFile $localPath -ErrorAction Stop
    $status = 'OK'
  } catch {
    $status = 'ERROR: ' + ($_.Exception.Message)
  }

  # compare with local project file if exists at same relative path
  # compare against the cleaned relative path (how we saved the asset locally)
  $projectLocal = Join-Path -Path (Get-Location) -ChildPath $cleanRelative
  $cmp = ''
  if (Test-Path $projectLocal) {
    try {
      $h1 = (Get-FileHash -Path $localPath -Algorithm SHA256).Hash
      $h2 = (Get-FileHash -Path $projectLocal -Algorithm SHA256).Hash
      if ($h1 -eq $h2) { $cmp = 'SAME' } else { $cmp = 'DIFFER' }
    } catch {
      $cmp = 'COMPARE_ERROR'
    }
  } else {
    $cmp = 'LOCAL_MISSING'
  }

  $report += [PSCustomObject]@{
    Url = $abs
    SavedTo = $localPath
    Status = $status
    LocalPath = $projectLocal
    Compare = $cmp
  }
}

$reportFile = Join-Path -Path $outDir -ChildPath 'assets_report.json'
$report | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportFile -Encoding utf8
Write-Output "Saved assets and report to $outDir (report: $reportFile)"
