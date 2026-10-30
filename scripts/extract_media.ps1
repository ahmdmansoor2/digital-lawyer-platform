Add-Type -AssemblyName System.IO.Compression.FileSystem
$uploadDir = Join-Path $env:USERPROFILE ".gemini\antigravity\brain\82e1cf6b-533a-4130-8dc1-c60b4acf8a58\.user_uploaded"
$latestDocx = (Get-ChildItem -Path $uploadDir -Filter "*.docx" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "Found file: $latestDocx"

$zip = [System.IO.Compression.ZipFile]::OpenRead($latestDocx)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($entry in $zip.Entries) {
    if ($entry.FullName -like "word/media/*") {
        $destPath = Join-Path $scriptDir $entry.Name
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destPath, $true)
        Write-Host "Extracted media: $($entry.Name) to $destPath"
    }
}

$docEntry = $zip.GetEntry("word/document.xml")
if ($docEntry) {
    $stream = $docEntry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    $xml = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $cleanText = ($xml -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim()
    Write-Host "Text preview:`n$($cleanText.Substring(0, [Math]::Min(1500, $cleanText.Length)))"
}
$zip.Dispose()
