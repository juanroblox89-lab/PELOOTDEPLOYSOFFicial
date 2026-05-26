
$path = "admin.html"
$content = Get-Content -Path $path -Raw -Encoding UTF8

# Common Mojibake replacements
$replacements = @{
    "Ã¢Å“â€¦" = "✅"
    "Ã¢Â Å’" = "❌"
    "Ã°Å¸â€™Â¾" = "💾"
    "Ã°Å¸â€ Â " = "🔍"
    "Ã°Å¸â€”â€˜" = "🗑️"
    "Ã¢Å“Â Ã¯Â¸Â " = "✏️"
    "Ã°Å¸â€ â€™" = "🔗"
    "Ã°Å¸â€œÂ±" = "📱"
    "Ã°Å¸Å¡Å¡" = "🚚"
    "Ã°Å¸â€œÂ­" = "📫"
    "Ã°Å¸š§" = "🚧"
    "Ã¢â‚¬â€ " = "—"
    "Ã¢â‚¬Â¦" = "…"
    "ÃƒÂ­" = "í"
    "Ã³" = "ó"
    "Ã¡" = "á"
    "Ã©" = "é"
    "Ã±" = "ñ"
    "Ãº" = "ú"
    "Ã¿" = "¿"
    "Ã­a" = "ía"
    "Ã³n" = "ón"
    "Ã­" = "í"
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

# Explicitly remove the duplicate showToast block if it still exists
# We look for the pattern starting at the TOAST helper comment
$badBlockPattern = "(?s)// ============================================================\r?\n// TOAST helper \(re-use from parent scope via window\)\r?\n// ============================================================\r?\nfunction showToast\(msg, type='success'\) \{.*?\}\r?\n"
$content = [regex]::Replace($content, $badBlockPattern, "`r`n")

Set-Content -Path $path -Value $content -Encoding UTF8
