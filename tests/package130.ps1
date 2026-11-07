# Mission 6 (sampler et batterie) : la Mission 5 (copie intacte dans _in\base-m6, SHA 31616bc8...),
# corrigee par m6\m6-patches.txt, plus le bloc m6\c130-sampler.html. Fichiers a part : m6\, dist130, docs130.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root '_in\base-m6\JACK22-STUDIO-11.5-CLAUDE-M5-NOTES.html'
$name = 'JACK22-STUDIO-11.5-CLAUDE-M6-SAMPLER.html'
$dev = Join-Path $root 'dist130'
$kit = Join-Path $dev 'kit'
$utf8 = New-Object Text.UTF8Encoding($false)
$baseHash = '31616bc8b5b1fe6460b8bc170315fee9cc30a97e5af649ce8eab853e8c859002'

if ((Get-FileHash $src -Algorithm SHA256).Hash.ToLower() -ne $baseHash) { throw 'HTML Mission 5 different de la base attendue' }
$html = [IO.File]::ReadAllText($src, $utf8)
function Patch([string]$old, [string]$new, [string]$what) {
  $n = ([regex]::Matches($script:html, [regex]::Escape($old))).Count
  if ($n -ne 1) { throw "$what : trouve $n fois au lieu d'une" }
  $script:html = $script:html.Replace($old, $new)
}
$text = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'm6-patches.txt'), $utf8) -replace "`r`n", "`n"
$blocks = [regex]::Matches($text, '(?ms)^### (.+?)\n<<<\n(.*?)\n===\n(.*?)\n>>>$')
$expected = ([regex]::Matches($text, '(?m)^<<<$')).Count
if ($blocks.Count -ne $expected) { throw "m6-patches.txt : $($blocks.Count) remplacements lus sur $expected" }
foreach ($b in $blocks) { Patch $b.Groups[2].Value $b.Groups[3].Value $b.Groups[1].Value }
$build = 'JACK22-11.5-CLAUDE-M6'
Patch '<meta name="jack22-build" content="JACK22-11.5-CLAUDE-M5">' ('<meta name="jack22-build" content="' + $build + '">') 'version de la page'
Patch "function diagnostics(){return {build:'JACK22-11.5-CLAUDE-M5'," ("function diagnostics(){return {build:'" + $build + "',") 'version du diagnostic'
$html = $html.TrimEnd() + "`n" + ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'c130-sampler.html'), $utf8) -replace "`r`n", "`n")

New-Item -ItemType Directory -Force $dev | Out-Null
[IO.File]::WriteAllText("$dev\$name", $html, $utf8)
Write-Host "$($blocks.Count) remplacements"
Write-Host "HTML $((Get-FileHash "$dev\$name" -Algorithm SHA256).Hash.ToLower())  $name"
if ($args -contains '-NoKit') { return }

if (Test-Path $kit) { Remove-Item -Recurse -Force $kit }
New-Item -ItemType Directory -Force "$kit\tests", "$kit\sources" | Out-Null
Copy-Item "$dev\$name" "$kit\$name"
foreach ($t in 'lot8-tests.js', 'm1-tests.js', 'm2-tests.js', 'm3-tests.js', 'm4-tests.js', 'm5-tests.js', 'm6-tests.js', 'fakemic.js', 'm3-bench.js', 'm6-patches.txt', 'package130.ps1') { Copy-Item (Join-Path $PSScriptRoot $t) "$kit\tests\$t" }
Copy-Item (Join-Path $PSScriptRoot 'c130-sampler.html') "$kit\sources\"
[IO.File]::WriteAllText("$kit\ouvrir-dans-Edge.cmd", "@echo off`r`nstart msedge `"%~dp0$name`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\LIRE-MOI.txt", "JACK22 11.5 + Claude - Mission 6 (sampler et batterie) - CANDIDATE`r`nBase : JACK22-STUDIO-11.5-CLAUDE-M5-NOTES.html (SHA-256 31616bc8...), design inchange.`r`nSampler : pads (8), batterie echantillonnee, choke, banques, ADSR et decoupe ; Projet > Sampler, pads et batterie.`r`nOuvrir ouvrir-dans-Edge.cmd. Travailler sur une copie de projet. Lire JACK22-11.5-MISSION6-RENDU.md.`r`n", (New-Object Text.ASCIIEncoding))
if (Test-Path (Join-Path $root 'docs130\JACK22-11.5-MISSION6-RENDU.md')) { Copy-Item (Join-Path $root 'docs130\JACK22-11.5-MISSION6-RENDU.md') $kit }
$sums = [ordered]@{}
foreach ($f in (Get-ChildItem $kit -Recurse -File | Where-Object { $_.Name -ne 'SHA256.json' })) { $sums[$f.FullName.Substring($kit.Length + 1).Replace('\', '/')] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLower() }
$sums['base (Mission 5)'] = $baseHash
[IO.File]::WriteAllText("$kit\SHA256.json", ($sums | ConvertTo-Json), $utf8)
$zip = Join-Path $root 'JACK22-11.5-CLAUDE-MISSION6-SAMPLER-CANDIDATE.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($kit, $zip)
Write-Host "ZIP $zip $((Get-Item $zip).Length) octets"
