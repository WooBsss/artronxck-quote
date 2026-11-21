# Opens the CNC Quote website: starts the local web server in the background
# (only if it is not already running) and opens http://localhost:8080 in the default browser.
# Used by the desktop shortcut "CK Plus CNC Quote".
param([int]$Port = 8080, [switch]$NoBrowser)
$url = "http://localhost:$Port/"

function Test-Server {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $ok = $c.ConnectAsync('127.0.0.1', $Port).Wait(400)
    $c.Close()
    return $ok
  } catch { return $false }
}

if (-not (Test-Server)) {
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSScriptRoot\serve.ps1`"", '-Port', $Port
  )
  for ($i = 0; $i -lt 40 -and -not (Test-Server); $i++) { Start-Sleep -Milliseconds 150 }
}

if (Test-Server) {
  if (-not $NoBrowser) { Start-Process $url } else { "server up at $url" }
} else {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("Could not start the website server on port $Port.", 'CK Plus CNC Quote') | Out-Null
}
