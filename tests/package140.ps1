# 7.0 (M2) : la 6.9 (copie intacte dans _in\base-e4, SHA 5f61673d...) + le bloc e4\c140-gestes-montage.html ajoute a la fin.
# Aucun remplacement dans le code existant (seul le numero de version change). La 6.9 n'est pas modifiee. Fichiers a part : e4\, dist140, docs140.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root '_in\base-e4\JACK22-STUDIO-11.5-CLAUDE-6-9-PISTES.html'
$name = 'JACK22-STUDIO-11.5-CLAUDE-7-0-MONTAGE.html'
$dev = Join-Path $root 'dist140'
$kit = Join-Path $dev 'kit'
$utf8 = New-Object Text.UTF8Encoding($false)
$baseHash = '5f61673d2ed078c971d1ac3d22c36f54f87f3e838a0a212de687786427fa98ea'
if ((Get-FileHash $src -Algorithm SHA256).Hash.ToLower() -ne $baseHash) { throw 'HTML 6.9 different de la base attendue' }
$html = [IO.File]::ReadAllText($src, $utf8)
function Patch([string]$old, [string]$new, [string]$what) {
  $n = ([regex]::Matches($script:html, [regex]::Escape($old))).Count
  if ($n -ne 1) { throw "$what : trouve $n fois au lieu d'une" }
  $script:html = $script:html.Replace($old, $new)
}
$build = 'JACK22-11.5-CLAUDE-7.0'
Patch '<meta name="jack22-build" content="JACK22-11.5-CLAUDE-6.9">' ('<meta name="jack22-build" content="' + $build + '">') 'version de la page'
Patch "function diagnostics(){return {build:'JACK22-11.5-CLAUDE-6.9'," ("function diagnostics(){return {build:'" + $build + "',") 'version du diagnostic'
$html = $html.TrimEnd() + "`n" + ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'c140-gestes-montage.html'), $utf8) -replace "`r`n", "`n")
New-Item -ItemType Directory -Force $dev | Out-Null
[IO.File]::WriteAllText("$dev\$name", $html, $utf8)
Write-Host "HTML $((Get-FileHash "$dev\$name" -Algorithm SHA256).Hash.ToLower())  $name"
if ($args -contains '-NoKit') { return }

if (Test-Path $kit) { Remove-Item -Recurse -Force $kit }
New-Item -ItemType Directory -Force "$kit\tests", "$kit\sources", "$kit\captures" | Out-Null
Copy-Item "$dev\$name" "$kit\$name"
foreach ($t in 'lot8-tests.js', 'm1-tests.js', 'm2-tests.js', 'm3-tests.js', 'm4-tests.js', 'm5-tests.js', 'm6-tests.js', 'd2-tests.js', 'd3-tests.js', 'd4-tests.js', 'd5-tests.js', 'e1-tests.js', 'e2-tests.js', 'e3-tests.js', 'e4-tests.js', 'fakemic.js', 'm3-bench.js', 'package140.ps1') { Copy-Item (Join-Path $PSScriptRoot $t) "$kit\tests\$t" }
Copy-Item (Join-Path $PSScriptRoot 'c140-gestes-montage.html') "$kit\sources\"
if (Test-Path (Join-Path $root 'docs140\captures')) { Copy-Item (Join-Path $root 'docs140\captures\*') "$kit\captures\" }
[IO.File]::WriteAllText("$kit\ouvrir-dans-Edge.cmd", "@echo off`r`nstart msedge `"%~dp0$name`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\ouvrir-ancien-style.cmd", "@echo off`r`nstart msedge `"file:///%~dp0${name}?style=origine`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\LIRE-MOI.txt", "JACK22 11.5 + Claude - 7.0 (M2 : gestes de montage) - CANDIDATE`r`nBase : la 6.9 (SHA-256 5f61673d...). La 6.9 reste intacte.`r`nLire JACK22-11.5-7-0-MONTAGE-RENDU.md. Captures Edge dans captures\.`r`n", (New-Object Text.ASCIIEncoding))
if (Test-Path (Join-Path $root 'docs140\JACK22-11.5-7-0-MONTAGE-RENDU.md')) { Copy-Item (Join-Path $root 'docs140\JACK22-11.5-7-0-MONTAGE-RENDU.md') $kit }
$sums = [ordered]@{}
foreach ($f in (Get-ChildItem $kit -Recurse -File | Where-Object { $_.Name -ne 'SHA256.json' })) { $sums[$f.FullName.Substring($kit.Length + 1).Replace('\', '/')] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLower() }
$sums['base (6.9)'] = $baseHash
[IO.File]::WriteAllText("$kit\SHA256.json", ($sums | ConvertTo-Json), $utf8)
$zip = Join-Path $root 'JACK22-11.5-CLAUDE-7-0-MONTAGE-CANDIDATE.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($kit, $zip)
Write-Host "ZIP $zip $((Get-Item $zip).Length) octets"
