# Publish clean copy to 'C:\Users\LUCA\Desktop\SUBBITO PUBBLICATA'
param(
    [string]$Source = "$PSScriptRoot\..",
    [string]$Destination = "C:\Users\LUCA\Desktop\SUBBITO PUBBLICATA"
)

Write-Host "Source: $Source" -ForegroundColor Cyan
Write-Host "Destination: $Destination" -ForegroundColor Cyan

if (!(Test-Path $Destination)) {
  New-Item -ItemType Directory -Path $Destination | Out-Null
}

function Test-Command($name){ Get-Command $name -ErrorAction SilentlyContinue }

# Copy all project files excluding heavy/dev folders
${robopath} = Join-Path $env:WINDIR 'System32\\robocopy.exe'
if (Test-Path $robopath) {
  try {
    $args = @(
      '"' + $Source + '"',
      '"' + $Destination + '"',
      '/E',
      '/XD','node_modules','.git','.vscode','.next','.svelte-kit','.parcel-cache','.turbo','.pnpm-store','.cache','coverage',
      '/XF','*.log'
    )
    Start-Process -FilePath $robopath -ArgumentList $args -Wait -NoNewWindow
  } catch {
    Write-Warning "robocopy fallito, uso Copy-Item: $_"
    $useFallback = $true
  }
}
else {
  $useFallback = $true
}

if ($useFallback) {
  Write-Warning "robocopy non trovato: uso Copy-Item (potrebbe essere più lento)."
  $excludeDirs = @('node_modules', '.git', '.vscode', '.next', '.svelte-kit', '.parcel-cache', '.turbo', '.pnpm-store', '.cache', 'coverage')
  $excludeFiles = @('*.log')
  $items = Get-ChildItem -Path $Source -Recurse -Force | Where-Object {
    $rel = $_.FullName.Substring($Source.Length)
    -not ($excludeDirs | ForEach-Object { $rel -like "*\$_*" }) -and -not ($excludeFiles | ForEach-Object { $_ -like $_ })
  }
  foreach($i in $items){
    $destPath = Join-Path $Destination ($i.FullName.Substring($Source.Length).TrimStart('\\','/'))
    if ($i.PSIsContainer) { if (!(Test-Path $destPath)) { New-Item -ItemType Directory -Path $destPath | Out-Null } }
    else { $dir = Split-Path $destPath -Parent; if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }; Copy-Item -Path $i.FullName -Destination $destPath -Force }
  }
}

# Suppress debug logs in copied JS/JSX (comment out console.log/debug/info)
$targets = Get-ChildItem -Path $Destination -Include *.js,*.jsx -Recurse -ErrorAction SilentlyContinue
foreach ($f in $targets) {
  try {
    $text = Get-Content -Raw -Path $f.FullName
    $text = $text -replace '(?m)(^|\s)console\.(log|debug|info)\(', '$1// console.$2('
    Set-Content -Path $f.FullName -Value $text -Encoding UTF8
  } catch { Write-Warning "Skip $($f.FullName): $_" }
}

Write-Host "Copy complete. Clean version ready at: $Destination" -ForegroundColor Green
