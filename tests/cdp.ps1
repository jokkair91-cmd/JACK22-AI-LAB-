# Pilote Microsoft Edge (sans fenêtre) par son protocole de débogage, pour exécuter un test JavaScript dans une page JACK22
# et récupérer son résultat. Profil Edge temporaire et séparé : le navigateur de Bob n'est pas touché.
# Usage : cdp.ps1 -Url <adresse ou file:///…> -ScriptFile <test.js> [-Expr 'expression finale'] [-TimeoutSec 900] [-Size 1536,864]
param([string]$Url, [string[]]$ScriptFile = @(), [string]$Expr = '', [int]$Port = 9333, [int]$TimeoutSec = 900, [string]$Size = '1536,864', [string]$Profile = '', [int]$LoadWaitSec = 60, [switch]$Headful, [string]$Out = '', [string]$ReadyJs = 'window.JACK22_WORKSPACE&&window.JACK22_PRODUCTION')
$ErrorActionPreference = 'Stop'
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"; if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$ownProfile = -not $Profile
$prof = if ($Profile) { $Profile } else { Join-Path $env:TEMP ('j22cdp-' + [guid]::NewGuid().ToString('N').Substring(0, 8)) }
$args0 = @("--remote-debugging-port=$Port", "--user-data-dir=$prof", '--autoplay-policy=no-user-gesture-required', "--window-size=$Size", '--no-first-run', '--no-default-browser-check', '--disable-features=msEdgeSidebarV2', 'about:blank')
if (-not $Headful) { $args0 = @('--headless=new', '--disable-gpu') + $args0 }
$proc = Start-Process -FilePath $edge -ArgumentList $args0 -PassThru
function Stop-Edge { Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$prof*" } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} } }
try {
  $list = $null
  for ($i = 0; $i -lt 100; $i++) { try { $list = Invoke-RestMethod "http://127.0.0.1:$Port/json/list" -TimeoutSec 2; if ($list) { break } } catch {}; Start-Sleep -Milliseconds 200 }
  $target = @($list | Where-Object { $_.type -eq 'page' })[0]
  if (-not $target) { throw "Edge : aucune page pilotable" }
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
  $script:id = 0
  function Send([string]$method, $params) {
    $script:id++; $msg = @{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 30 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg); $seg = New-Object 'ArraySegment[byte]' -ArgumentList (, $bytes)
    $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait(); return $script:id
  }
  function Recv([int]$wantId, [int]$sec) {
    $buf = New-Object byte[] 4194304; $deadline = (Get-Date).AddSeconds($sec)
    while ((Get-Date) -lt $deadline) {
      $ms = New-Object IO.MemoryStream
      do {
        $seg = New-Object 'ArraySegment[byte]' -ArgumentList (, $buf); $left = [int][Math]::Max(1, ($deadline - (Get-Date)).TotalMilliseconds)
        $t = $ws.ReceiveAsync($seg, [Threading.CancellationToken]::None); if (-not $t.Wait($left)) { return $null }
        $r = $t.Result; $ms.Write($buf, 0, $r.Count)
      } while (-not $r.EndOfMessage)
      $txt = [Text.Encoding]::UTF8.GetString($ms.ToArray()); $o = $txt | ConvertFrom-Json
      if ($o.id -eq $wantId) { return $o }
    }
    return $null
  }
  function Eval([string]$js, [int]$sec) {
    $id = Send 'Runtime.evaluate' @{ expression = $js; awaitPromise = $true; returnByValue = $true; userGesture = $true }
    $o = Recv $id $sec; if (-not $o) { throw "délai dépassé ($sec s)" }
    if ($o.result.exceptionDetails) { throw ('exception : ' + ($o.result.exceptionDetails | ConvertTo-Json -Depth 6 -Compress)) }
    return $o.result.result.value
  }
  Recv (Send 'Page.enable' @{}) 10 | Out-Null
  Recv (Send 'Page.navigate' @{ url = $Url }) 30 | Out-Null
  $ready = Eval "new Promise(r=>{const t0=Date.now();(function w(){if(document.readyState==='complete'&&($ReadyJs))return setTimeout(()=>r({ok:true,hidden:document.hidden,vis:document.visibilityState,w:innerWidth,h:innerHeight,ua:navigator.userAgent.slice(0,120)}),2500);if(Date.now()-t0>$($LoadWaitSec*1000))return r({ok:false});setTimeout(w,200);})();})" ($LoadWaitSec + 10)
  if (-not $ready.ok) { throw "page non chargée : $Url" }
  foreach ($f in $ScriptFile) { $src = [IO.File]::ReadAllText((Resolve-Path $f), [Text.Encoding]::UTF8); Eval ($src + "`n;'ok'") 60 | Out-Null }
  $val = if ($Expr) { Eval $Expr $TimeoutSec } else { $null }
  $res = [ordered]@{ conditions = [ordered]@{ navigateur = 'Microsoft Edge ' + $(if ($Headful) { '(fenêtre)' } else { 'sans fenêtre (headless)' }); page_cachee = $ready.hidden; visibilite = $ready.vis; taille = "$($ready.w)x$($ready.h)"; url = $Url }; resultat = $val }
  $json = $res | ConvertTo-Json -Depth 30
  if ($Out) { [IO.File]::WriteAllText($Out, $json, (New-Object Text.UTF8Encoding($false))) }
  $json
} finally {
  try { $ws.Dispose() } catch {}
  # Fermeture normale d'Edge (comme fermer la fenêtre) : il écrit ses données (sauvegardes du projet) sur le disque.
  try {
    $ver = Invoke-RestMethod "http://127.0.0.1:$Port/json/version" -TimeoutSec 2; $bw = New-Object System.Net.WebSockets.ClientWebSocket
    $bw.ConnectAsync([Uri]$ver.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait(3000) | Out-Null
    $bytes = [Text.Encoding]::UTF8.GetBytes('{"id":1,"method":"Browser.close"}'); $seg = New-Object 'ArraySegment[byte]' -ArgumentList (, $bytes)
    $bw.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait(3000) | Out-Null
    for ($i = 0; $i -lt 50; $i++) { if (-not (Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$prof*" })) { break }; Start-Sleep -Milliseconds 200 }
  } catch {}
  Stop-Edge; Start-Sleep -Milliseconds 300; if ($ownProfile) { try { Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue } catch {} } }
