
$path = "admin.html"
$lines = Get-Content -Encoding UTF8 $path
$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $ln = $i + 1
    # Line numbers 1170 to 1177
    if ($ln -ge 1170 -and $ln -le 1177) { continue }
    
    $line = $lines[$i]
    # Replace common mojibake characters (no emojis in script to prevent corruption)
    $line = $line.Replace("Ã³", "ó")
    $line = $line.Replace("Ã­", "í")
    $line = $line.Replace("Ã¡", "á")
    $line = $line.Replace("Ã©", "é")
    $line = $line.Replace("Ã±", "ñ")
    $line = $line.Replace("Ãº", "ú")
    $line = $line.Replace("Ã¿", "¿")
    $line = $line.Replace("Ã¢â‚¬â€ ", "—")
    $line = $line.Replace("Ã¢â‚¬Â¦", "…")
    
    $newLines += $line
}
$newLines | Set-Content -Path $path -Encoding UTF8
