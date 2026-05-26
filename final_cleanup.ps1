
$path = "admin.html"
$content = Get-Content -Path $path -Encoding UTF8

$newContent = @()
for ($i = 0; $i -lt $content.Count; $i++) {
    $ln = $i + 1
    # Delete the duplicate showToast block (lines 1170 to 1177)
    if ($ln -ge 1170 -and $ln -le 1177) {
        continue
    }
    
    $line = $content[$i]
    # Replace common mojibake patterns
    # Using direct characters for standard accents
    $line = $line.Replace("Ã³", "ó")
    $line = $line.Replace("Ã­", "í")
    $line = $line.Replace("Ã¡", "á")
    $line = $line.Replace("Ã©", "é")
    $line = $line.Replace("Ã±", "ñ")
    $line = $line.Replace("Ãº", "ú")
    $line = $line.Replace("Ã¿", "¿")
    $line = $line.Replace("Ã¢â‚¬â€ ", "—")
    $line = $line.Replace("Ã¢â‚¬Â¦", "…")
    
    # For emojis, we use hex if possible or just the strings if they match
    $line = $line.Replace("Ã¢Å“â€¦", "✅")
    $line = $line.Replace("Ã¢Â Å’", "❌")
    $line = $line.Replace("Ã°Å¸â€™Â¾", "💾")
    $line = $line.Replace("Ã°Å¸â€ Â ", "🔍")
    $line = $line.Replace("Ã°Å¸â€”â€˜", "🗑️")
    $line = $line.Replace("Ã¢Å“Â Ã¯Â¸Â ", "✏️")
    $line = $line.Replace("Ã°Å¸â€ â€™", "🔗")
    $line = $line.Replace("Ã°Å¸â€œÂ±", "📱")
    $line = $line.Replace("Ã°Å¸Å¡Å¡", "🚚")
    $line = $line.Replace("Ã°Å¸â€œÂ­", "📫")
    $line = $line.Replace("Ã°Å¸š§", "🚧")
    
    $newContent += $line
}

$newContent | Set-Content -Path $path -Encoding UTF8
