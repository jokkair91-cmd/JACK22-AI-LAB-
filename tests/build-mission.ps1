# Assemblage commun des missions « Montage audio pro » (Claude).
# Une version = la version precedente (copie intacte, empreinte verifiee) + remplacements documentes (fichier patches) + un bloc Claude ajoute a la fin.
# Usage : build-mission.ps1 -Dir d8 -Base '_in\base-d8\X.html' -BaseHash ... -BaseBuild 6.8 -Build 6.9 -Name 'JACK22-STUDIO-...html' -Block c139-x.html [-Patches m1-patches.txt] [-Zip NOM] [-Folder 29-...] [-Tests a.js,b.js]
param([string]$Dir, [string]$Base, [string]$BaseHash, [string]$BaseBuild, [string]$Build, [string]$Name, [string]$Block, [string]$Patches = '', [string]$Zip = '', [string]$Folder = '', [string]$Docs = '', [string[]]$Tests = @(), [switch]$NoKit)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$work = Join-Path $root $Dir
$utf8 = New-Object Text.UTF8Encoding($false)
$src = Join-Path $root $Base
if ((Get-FileHash $src -Algorithm SHA256).Hash.ToLower() -ne $BaseHash) { throw "base differente de l'empreinte attendue" }
$html = [IO.File]::ReadAllText($src, $utf8)
function Patch([string]$old, [string]$new, [string]$what) {
  $n = ([regex]::Matches($script:html, [regex]::Escape($old))).Count
  if ($n -ne 1) { throw "$what : trouve $n fois au lieu d'une" }
  $script:html = $script:html.Replace($old, $new)
}
Patch "<meta name=`"jack22-build`" content=`"JACK22-11.5-CLAUDE-$BaseBuild`">" "<meta name=`"jack22-build`" content=`"JACK22-11.5-CLAUDE-$Build`">" 'version de la page'
Patch "function diagnostics(){return {build:'JACK22-11.5-CLAUDE-$BaseBuild'," "function diagnostics(){return {build:'JACK22-11.5-CLAUDE-$Build'," 'version du diagnostic'
if ($Patches) {
  $txt = ([IO.File]::ReadAllText((Join-Path $work $Patches), $utf8) -replace "`r`n", "`n")
  foreach ($m in [regex]::Matches($txt, "(?s)### (.+?)\n<<<\n(.*?)\n===\n(.*?)\n>>>")) { Patch $m.Groups[2].Value $m.Groups[3].Value $m.Groups[1].Value.Trim() }
}
$blockTxt = ([IO.File]::ReadAllText((Join-Path $work $Block), $utf8) -replace "`r`n", "`n").TrimEnd()
$html = $html.TrimEnd() + "`n" + $blockTxt + "`n"
$dev = Join-Path $root ('dist-' + $Build)
New-Item -ItemType Directory -Force $dev | Out-Null
[IO.File]::WriteAllText("$dev\$Name", $html, $utf8)
Write-Host "HTML $((Get-FileHash "$dev\$Name" -Algorithm SHA256).Hash.ToLower())  $Name"
if ($NoKit) { return }
$kit = Join-Path $dev 'kit'
if (Test-Path $kit) { Remove-Item -Recurse -Force $kit }
New-Item -ItemType Directory -Force "$kit\tests", "$kit\sources", "$kit\captures" | Out-Null
Copy-Item "$dev\$Name" "$kit\$Name"
foreach ($t in $Tests) { Copy-Item (Join-Path $work $t) "$kit\tests\$t" }
Copy-Item (Join-Path $work $Block) "$kit\sources\"
if ($Patches) { Copy-Item (Join-Path $work $Patches) "$kit\sources\" }
Copy-Item $PSCommandPath "$kit\tests\"
$docs = Join-Path $root $Docs
if ($Docs -and (Test-Path $docs)) {
  if (Test-Path "$docs\captures") { Copy-Item "$docs\captures\*" "$kit\captures\" -ErrorAction SilentlyContinue }
  Get-ChildItem $docs -File | ForEach-Object { Copy-Item $_.FullName $kit }
}
[IO.File]::WriteAllText("$kit\ouvrir-dans-Edge.cmd", "@echo off`r`nstart msedge `"%~dp0$Name`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\LIRE-MOI.txt", "JACK22 11.5 + Claude - $Build - CANDIDATE`r`nBase : la $BaseBuild (SHA-256 $($BaseHash.Substring(0,8))...). La $BaseBuild reste intacte.`r`nLire le fichier -RENDU.md.`r`n", (New-Object Text.ASCIIEncoding))
$sums = [ordered]@{}
foreach ($f in (Get-ChildItem $kit -Recurse -File | Where-Object { $_.Name -ne 'SHA256.json' })) { $sums[$f.FullName.Substring($kit.Length + 1).Replace('\', '/')] = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLower() }
$sums["base ($BaseBuild)"] = $BaseHash
[IO.File]::WriteAllText("$kit\SHA256.json", ($sums | ConvertTo-Json), $utf8)
$zipPath = Join-Path $root "$Zip.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($kit, $zipPath)
if ($Folder) { $fd = Join-Path $root $Folder; New-Item -ItemType Directory -Force $fd | Out-Null; Copy-Item $zipPath $fd; if ($Docs -and (Test-Path $docs)) { Get-ChildItem $docs -File | ForEach-Object { Copy-Item $_.FullName $fd } } }
Write-Host "ZIP $zipPath $((Get-Item $zipPath).Length) octets"
