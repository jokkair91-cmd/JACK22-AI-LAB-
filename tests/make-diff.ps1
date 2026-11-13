# Différences entre deux versions JACK22 au format « unifié » (lisible par n'importe quel outil de comparaison).
# Les versions Claude ne font que remplacer des lignes (même nombre de lignes) et ajouter un bloc à la fin : comparaison ligne à ligne.
param([string]$Old, [string]$New, [string]$Out, [string]$OldName = 'a', [string]$NewName = 'b')
$u = New-Object Text.UTF8Encoding($false)
$a = [IO.File]::ReadAllLines((Resolve-Path $Old), $u); $b = [IO.File]::ReadAllLines((Resolve-Path $New), $u)
$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine("--- $OldName"); [void]$sb.AppendLine("+++ $NewName")
$n = [Math]::Min($a.Length, $b.Length); $changed = 0
# Les dernières lignes de l'ancienne version peuvent avoir été déplacées par l'ajout du bloc : on compare jusqu'à la fin commune.
for ($i = 0; $i -lt $n; $i++) {
  if ($a[$i] -ne $b[$i]) { $changed++; [void]$sb.AppendLine("@@ -$($i + 1),1 +$($i + 1),1 @@"); [void]$sb.AppendLine('-' + $a[$i]); [void]$sb.AppendLine('+' + $b[$i]) }
}
if ($b.Length -gt $a.Length) {
  [void]$sb.AppendLine("@@ -$($a.Length),0 +$($a.Length + 1),$($b.Length - $a.Length) @@")
  for ($i = $a.Length; $i -lt $b.Length; $i++) { [void]$sb.AppendLine('+' + $b[$i]) }
}
[IO.File]::WriteAllText($Out, $sb.ToString(), $u)
"lignes 7.8 : $($a.Length) ; lignes 7.9 : $($b.Length) ; lignes modifiées : $changed ; lignes ajoutées à la fin : $([Math]::Max(0, $b.Length - $a.Length))"
