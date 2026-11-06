# Mission 1 (projets fiables) : la 11.5 + Claude maquettes auditee (copie intacte dans _in\base-m1), corrigee par patchs verifies.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root '_in\base-m1\JACK22-STUDIO-11.5-CLAUDE-MAQUETTES.html'
$name = 'JACK22-STUDIO-11.5-CLAUDE-M1-PROJETS.html'
$kit = Join-Path $root 'dist125\kit'
$utf8 = New-Object Text.UTF8Encoding($false)

if ((Get-FileHash $src -Algorithm SHA256).Hash.ToLower() -ne '03d69db75b32b24fafdb7a27840f7df8460f5a0d0db250d04e36458848c09d2c') { throw 'HTML 11.5 maquettes different de celui audite' }
$html = [IO.File]::ReadAllText($src)
function Patch([string]$old, [string]$new, [string]$what) {
  if (([regex]::Matches($script:html, [regex]::Escape($old))).Count -ne 1) { throw "$what introuvable ou multiple" }
  $script:html = $script:html.Replace($old, $new)
}
# Defaut de l'audit : l'export ecrit manifest.json + un fichier par audio (jusqu'a AUDIO_MAX_FILES = 27),
# mais le lecteur refusait plus de 12 fichiers. La limite du lecteur suit maintenant celle de l'import.
Patch 'PROJECT_FORMAT_VERSION = 4, ZIP_MAX_ENTRIES = 12,' 'PROJECT_FORMAT_VERSION = 4, ZIP_MAX_ENTRIES = AUDIO_MAX_FILES + 1,' 'limite de fichiers du ZIP'
# L'export refuse une archive hors limites, puis relit l'archive creee avec le lecteur de l'import (structure, noms, CRC)
# avant de la proposer : un projet exporte se rouvre, ou rien n'est enregistre.
# (Script en ASCII, lu par PowerShell 5.1 : les accents sont produits par $E et $H.)
$E = [string][char]0xE9; $H = [string][char]0x2026
$anchor = "      const blob = await Zip.build(entries, (i, n) => setStatus('Export du projet : '"
$tail = "      const name = T.fileName(), url = URL.createObjectURL(blob), a = document.createElement('a');"
Patch $anchor ("      if (entries.length > ZIP_MAX_ENTRIES) throw new Error('le projet contient ' + (entries.length - 1) + ' fichiers audio, le maximum est ' + (ZIP_MAX_ENTRIES - 1) + ' : aucun fichier cr" + $E + $E + "');`n" + $anchor) 'creation du ZIP'
Patch $tail ("      setStatus('Export du projet : relecture de l\'archive" + $H + "');`n      try { await Zip.read(blob); } catch (x) { throw new Error('l\'archive cr" + $E + $E + "e ne se relit pas (' + (x && x.message ? x.message : x) + ') : aucun fichier cr" + $E + $E + "'); }`n" + $tail) 'proposition du ZIP'
$build = 'JACK22-11.5-CLAUDE-M1'
Patch '<meta name="jack22-build" content="JACK22-11.5-CLAUDE">' ('<meta name="jack22-build" content="' + $build + '">') 'version de la page'
Patch "function diagnostics(){return {build:'JACK22-11.5-CLAUDE'," ("function diagnostics(){return {build:'" + $build + "',") 'version du diagnostic'

if (Test-Path $kit) { Remove-Item -Recurse -Force $kit }
New-Item -ItemType Directory -Force "$kit\tests" | Out-Null
[IO.File]::WriteAllText("$kit\$name", $html, $utf8)
Copy-Item (Join-Path $root 'tools\lot8-tests.js') "$kit\tests\lot8-tests.js"
Copy-Item (Join-Path $root 'tools\package125.ps1') "$kit\tests\package125.ps1"
Copy-Item (Join-Path $root 'tools\m1-tests.js') "$kit\tests\m1-tests.js"
[IO.File]::WriteAllText("$kit\ouvrir-dans-Edge.cmd", "@echo off`r`nstart msedge `"%~dp0$name`"`r`n", (New-Object Text.ASCIIEncoding))
[IO.File]::WriteAllText("$kit\LIRE-MOI.txt", "JACK22 11.5 + Claude - Mission 1 (projets fiables) - CANDIDATE`r`nBase : JACK22-STUDIO-11.5-CLAUDE-MAQUETTES.html (SHA-256 03d69db7...), design inchange.`r`nCorrection : un projet portable (.jack22.zip) avec plus de 11 fichiers audio se rouvre ; l'export relit l'archive avant de la proposer.`r`nOuvrir ouvrir-dans-Edge.cmd. Travailler sur une copie de projet. Lire JACK22-11.5-MISSION1-RENDU.md.`r`n", (New-Object Text.ASCIIEncoding))
if (Test-Path (Join-Path $root 'docs125\JACK22-11.5-MISSION1-RENDU.md')) {
  Copy-Item (Join-Path $root 'docs125\JACK22-11.5-MISSION1-RENDU.md') $kit
  if (Test-Path (Join-Path $root 'docs125\preuves')) { Copy-Item (Join-Path $root 'docs125\preuves') "$kit\preuves" -Recurse }
}
$sums = [ordered]@{}
foreach ($f in @($name, 'tests/lot8-tests.js', 'tests/m1-tests.js', 'tests/package125.ps1')) { $sums[$f] = (Get-FileHash (Join-Path $kit $f) -Algorithm SHA256).Hash.ToLower() }
$sums['base (11.5 maquettes auditee)'] = '03d69db75b32b24fafdb7a27840f7df8460f5a0d0db250d04e36458848c09d2c'
[IO.File]::WriteAllText("$kit\SHA256.json", ($sums | ConvertTo-Json), $utf8)
$zip = Join-Path $root 'JACK22-11.5-CLAUDE-MISSION1-PROJETS-CANDIDATE.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($kit, $zip)
Write-Host "ZIP $zip $((Get-Item $zip).Length) octets"
Write-Host "$($sums[$name])  $name"
