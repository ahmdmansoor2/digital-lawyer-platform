Add-Type -AssemblyName System.IO.Compression.FileSystem
$docxPath = Join-Path $env:USERPROFILE ".gemini\antigravity\brain\82e1cf6b-533a-4130-8dc1-c60b4acf8a58\.user_uploaded\media_1792346143551_5679e423.docx"
Write-Host "Docx exists:" (Test-Path $docxPath)
$extractDir = "d:\قانوني 7\scripts\docx_inspect"
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
[System.IO.Compression.ZipFile]::ExtractToDirectory($docxPath, $extractDir)
Write-Host "Extracted successfully to $extractDir"

# List media files
Get-ChildItem -Path "$extractDir\word\media" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Media: $($_.Name), size: $($_.Length)"
    Copy-Item $_.FullName "d:\قانوني 7\scripts\$($_.Name)" -Force
}

# Inspect document.xml text
$docXml = [xml](Get-Content "$extractDir\word\document.xml" -Encoding UTF8)
$text = ($docXml.InnerText -replace '\s+', ' ').Trim()
Write-Host "Text preview: $($text.Substring(0, [Math]::Min(1200, $text.Length)))"
