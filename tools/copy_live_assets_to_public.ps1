Param(
  [string]$SourceDir = '.\tools\live_assets',
  [string]$TargetDir = '.\public'
)

if (!(Test-Path $SourceDir)) {
  Write-Error "Source dir $SourceDir not found. Run npm run fetch:assets first."
  exit 1
}

# Ensure public exists
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

# Strategy:
# - If a host folder contains a 'static' subfolder, copy its contents into public/static
# - If a host folder contains a manifest.json at its root, copy it to public/manifest.json
# - Otherwise, copy host files into public/vendor/<host>/...

$sourceRoot = (Get-Item $SourceDir).FullName

Get-ChildItem -Path $SourceDir -Directory | ForEach-Object {
  $hostFolder = $_.FullName
  $hostName = $_.Name

  # 1) copy static/* -> public/static/* if exists
  $staticSrc = Join-Path -Path $hostFolder -ChildPath 'static'
  if (Test-Path $staticSrc) {
    Write-Output "Mapping $staticSrc -> $TargetDir/static"
    Get-ChildItem -Path $staticSrc -Recurse | ForEach-Object {
      if ($_.PSIsContainer) { return }
      $rel = $_.FullName.Substring((Get-Item $staticSrc).FullName.Length).TrimStart('\','/')
      $dest = Join-Path $TargetDir (Join-Path 'static' $rel)
      $destDir = Split-Path -Parent $dest
      if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
      Copy-Item -Path $_.FullName -Destination $dest -Force
      Write-Output ("Copied {0} -> {1}" -f $_.FullName, $dest)
    }
  }

  # 2) manifest or root-level icons -> copy to public/
  $manifestSrc = Join-Path -Path $hostFolder -ChildPath 'manifest.json'
  if (Test-Path $manifestSrc) {
    $dest = Join-Path $TargetDir 'manifest.json'
    Copy-Item -Path $manifestSrc -Destination $dest -Force
    Write-Output ("Copied manifest {0} -> {1}" -f $manifestSrc, $dest)
  }

  # copy common root images (like logos) into public/
  Get-ChildItem -Path $hostFolder -File | ForEach-Object {
    $fname = $_.Name
    if ($fname -match '\.(png|jpg|jpeg|svg|ico)$') {
      $dest = Join-Path $TargetDir $fname
      Copy-Item -Path $_.FullName -Destination $dest -Force
      Write-Output ("Copied root asset {0} -> {1}" -f $_.FullName, $dest)
    }
  }

  # 3) everything else -> public/vendor/<host>/...
  $otherFiles = Get-ChildItem -Path $hostFolder -Recurse | Where-Object { -not $_.PSIsContainer } | Where-Object { $_.FullName -notlike (Join-Path $hostFolder 'static*') }
  foreach ($f in $otherFiles) {
    $rel = $f.FullName.Substring($sourceRoot.Length).TrimStart('\','/')
    $dest = Join-Path $TargetDir (Join-Path 'vendor' $rel)
    $destDir = Split-Path -Parent $dest
    if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
    Copy-Item -Path $f.FullName -Destination $dest -Force
    Write-Output ("Copied vendor asset {0} -> {1}" -f $f.FullName, $dest)
  }
}

Write-Output "All assets copied to $TargetDir. Please check public/static, public/manifest.json and public/vendor/ for extra assets."
