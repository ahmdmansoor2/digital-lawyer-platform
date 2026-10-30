Add-Type -AssemblyName System.IO.Compression.FileSystem
$uploadDir = Join-Path $env:USERPROFILE ".gemini\antigravity\brain\82e1cf6b-533a-4130-8dc1-c60b4acf8a58\.user_uploaded"
$latestDocx = (Get-ChildItem -Path $uploadDir -Filter "*.docx" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

$zip = [System.IO.Compression.ZipFile]::OpenRead($latestDocx)
$docEntry = $zip.GetEntry("word/document.xml")
$stream = $docEntry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

# Parse XML paragraphs
[xml]$x = $xml
$ns = New-Object System.Xml.XmlNamespaceManager($x.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

$paras = $x.SelectNodes("//w:p", $ns)
Write-Host "Total paragraphs: $($paras.Count)"
foreach ($p in $paras) {
    $t = ($p.InnerText -replace '\s+', ' ').Trim()
    if ($t) {
        Write-Host "P: $t"
    }
}
