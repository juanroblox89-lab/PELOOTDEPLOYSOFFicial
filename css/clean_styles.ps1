$c = Get-Content "styles.css" -Raw
$c = $c -replace "[^\x00-\x7F]", ""
Set-Content "styles.css" $c -Encoding Ascii