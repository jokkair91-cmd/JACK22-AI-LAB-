# 6.6 (Mission 0) : la 6.5 (copie intacte dans _in\base-d5, SHA 965835b6...) ; le bloc Claude c135 (6.5) est remplace par d5\c136-message-prise.html.
# Seul le bloc de Claude c135 est remplace (jamais le code de ChatGPT). La 6.5 n'est pas modifiee. Fichiers a part : d5\, dist136, docs136.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root '_in\base-d5\JACK22-STUDIO-11.5-CLAUDE-6-5-MESSAGE-PRISE.html'
$name = 'JACK22-STUDIO-11.5-CLAUDE-6-6-MISSION0.html'
$dev = Join-Path $root 'dist136'
$kit = Join-Path $dev 'kit'
$utf8 = New-Object Text.UTF8Encoding($false)
$baseHash = '965835b68a6410fc8305c3a26f82f588c3391b5fa1ce73069096af0e0dca160a'
if ((Get-FileHash $src -Algorithm SHA256).Hash.ToLower() -ne $baseHash) { throw 'HTML 6.5 different de la base attendue' }
$html = [IO.File]::ReadAllText($src, $utf8)
function Patch([string]$old, [string]$new, [string]$what) {
  $n = ([regex]::Matches($script:html, [regex]::Escape($old))).Count
  if ($n -ne 1) { throw "$what : trouve $n fois au lieu d'une" }
  $script:html = $script:html.Replace($old, $new)
}
$build = 'JACK22-11.5-CLAUDE-6.6'
Patch '<meta name="jack22-build" content="JACK22-11.5-CLAUDE-6.5">' ('<meta name="jack22-build" content="' + $build + '">') 'version de la page'
Patch "function diagnostics(){return {build:'JACK22-11.5-CLAUDE-6.5'," ("function diagnostics(){return {build:'" + $build + "',") 'version du diagnostic'
# Remplace le bloc c135 (6.5) par c136 : l'ancien texte doit etre trouve une seule fois.
$old135 = ([IO.File]::ReadAllText((Join-Path $root 'd4\c135-message-prise.html'), $utf8) -replace "`r`n", "`n").TrimEnd()
$new136 = ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'c136-message-prise.html'), $utf8) -replace "`r`n", "`n").TrimEnd()
Patch $old135 $new136 'bloc c135 de la 6.5'
New-Item -ItemType Directory -Force $dev | Out-Null
[IO.File]::WriteAllText("$dev\$name", $html, $utf8)
Write-Host "HTML $((Get-FileHash "$dev\$name" -Algorithm SHA256).Hash.ToLower())  $name"
if ($args -contains '-NoKit') { return }

if (Test-Path $kit) { Remove-Item -Recurse -Force $kit }
New-Item -ItemType Directory -Force "$kit\tests", "$kit\sources", "$kit\captures" | Out-Null
Copy-Item "$dev\$name" "$kit\$name"
foreach ($t in 'lot8-tests.js', 'm1-tests.js', 'm2-tests.js', 'm3-tests.js', 'm4-tests.js', 'm5-tests.js', 'm6-tests.js', 'd2-tests.js', 'd3-tests.js', 'd4-tests.js', 'd5-tests.js', 'fakemic.js', 'm3-bench.js', 'package136.ps1') { Copy-Item (Join-Path $PSScriptRoot $t) "$kit\tests\$t" }
Copy-Item (Join-Path $PSScriptRoot 'c136-message-prise.html') "$kit\sources\"; Copy-Item (Join-Path $root 'd4\c135-message-prise.html') "$kit\sources\c135-message-prise-6.5-remplace.html"
if (Test-Path (Join-Path $root 'docs136\captures')) { Copy-Item (Join-Path $root 'docs136\captures\*') "$kit\captures\" }
[IO.File]::WriteAllText("$kit\ouvrir-dans-Edge.cmd", "@echo off`r`nstart msedge `"%~dp0$name`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\ouvrir-ancien-style.cmd", "@echo off`r`nstart msedge `"file:///%~dp0${name}?style=origine`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\LIRE-MOI.txt", "JACK22 11.5 + Claude - 6.6 (Mission 0 : message de prise stabilise) - CANDIDATE`r`nBase : la 6.5 (SHA-256 965835b6...). La 6.5 reste intacte.`r`nLire JACK22-11.5-6-6-MISSION0-RENDU.md. Captures Edge dans captures\.`r`n", (New-Object Text.ASCIIEncoding))
if (Test-Path (Join-Path $root 'docs136\DIFF-c135-vers-c136.diff')) { Copy-Item (Join-Path $root 'docs136\DIFF-c135-vers-c136.diff') $kit }
if (Test-Path (Join-Path $root 'docs136\JACK22-11.5-6-6-MISSION0-RENDU.md')) { Copy-Item (Join-Path $root 'docs136\JACK22-11.5-6-6-MISSION0-RENDU.md') $kit }
$sums = [ordered]@{}
foreach ($f in (Get-ChildItem $kit -Recurse -File | Where-Object { $_.Name -ne 'SHA256.json' })) { $sums[$f.FullName.Substring($kit.Length + 1).Replace('\', '/')] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLower() }
$sums['base (6.5)'] = $baseHash
[IO.File]::WriteAllText("$kit\SHA256.json", ($sums | ConvertTo-Json), $utf8)
$zip = Join-Path $root 'JACK22-11.5-CLAUDE-6-6-MISSION0-CANDIDATE.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($kit, $zip)
Write-Host "ZIP $zip $((Get-Item $zip).Length) octets"
