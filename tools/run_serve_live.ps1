Param(
  [int]$Port = 5178
)

# move to tools folder and set public root
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$root = Join-Path -Path (Resolve-Path ..) -ChildPath 'public'

Write-Output "Serving $root on port $Port (will try node -> npm -> python -> PowerShell listener)"

# Try Node first
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  Write-Output "Starting Node static server (tools/serve_live.js) using: $($nodeCmd.Source)"
  $serverScript = Join-Path -Path (Resolve-Path ..) -ChildPath 'tools\serve_live.js'
  Start-Process -FilePath $nodeCmd.Source -ArgumentList $serverScript -NoNewWindow
  Write-Output "Node server started. Open http://localhost:$Port/index.live.html"
  exit 0
}

# Try npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
  Write-Output "Starting npm run serve:live using: $($npmCmd.Source)"
  Set-Location -Path (Resolve-Path ..)
  Start-Process -FilePath $npmCmd.Source -ArgumentList "run","serve:live" -NoNewWindow
  Write-Output "npm script started. Open http://localhost:$Port/index.live.html"
  exit 0
}

# Try Python
$py = Get-Command python -ErrorAction SilentlyContinue
if ($py) {
  Write-Output "Starting Python http.server on port $Port"
  Start-Process -FilePath $py.Source -ArgumentList "-m","http.server","$Port","--directory","$root" -NoNewWindow
  Write-Output "Python http.server started. Open http://localhost:$Port/index.live.html"
  exit 0
}

# Fallback: PowerShell HttpListener
Write-Output "No node/npm/python found in PATH. Starting PowerShell HttpListener fallback on port $Port"

Add-Type -AssemblyName System.Net
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
  Write-Output "Listening at $prefix - press Ctrl+C to stop"
  Write-Output "Open http://localhost:$Port/index.live.html in your browser"
  
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    
    try {
      $urlPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = 'index.live.html' }
      
      $file = Join-Path -Path $root -ChildPath $urlPath
      
      if (-not (Test-Path $file -PathType Leaf)) {
        $file = Join-Path -Path $root -ChildPath 'index.live.html'
      }
      
      if (Test-Path $file -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        
        switch ($ext) {
          '.html' { $res.ContentType = 'text/html; charset=utf-8' }
          '.js'   { $res.ContentType = 'application/javascript; charset=utf-8' }
          '.css'  { $res.ContentType = 'text/css; charset=utf-8' }
          '.json' { $res.ContentType = 'application/json; charset=utf-8' }
          '.png'  { $res.ContentType = 'image/png' }
          '.jpg'  { $res.ContentType = 'image/jpeg' }
          '.jpeg' { $res.ContentType = 'image/jpeg' }
          '.svg'  { $res.ContentType = 'image/svg+xml' }
          default { $res.ContentType = 'application/octet-stream' }
        }
        
        $res.ContentLength64 = $bytes.Length
        $res.StatusCode = 200
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      Write-Warning "Error handling request: $_"
      try {
        $res.StatusCode = 500
      } catch {}
    } finally {
      try { $res.OutputStream.Close() } catch {}
      try { $res.Close() } catch {}
    }
  }
} catch {
  Write-Error "Failed to start listener: $_"
} finally {
  if ($listener -and $listener.IsListening) { 
    $listener.Stop()
    $listener.Close()
  }
}