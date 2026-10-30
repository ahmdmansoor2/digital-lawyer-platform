Add-Type -AssemblyName System.IO.Compression.FileSystem
$desktopDir = Join-Path $HOME "Desktop"
$target = Get-ChildItem -Path $desktopDir -Filter "*برج*" | Select-Object -First 1
Write-Host "Found file:" $target.FullName "Size:" $target.Length

$zip = [System.IO.Compression.ZipFile]::OpenRead($target.FullName)
$entry = $zip.GetEntry("word/document.xml")
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $scriptDir "current_doc.xml"
if (Test-Path $dest) { Remove-Item -Force $dest }
[System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
$zip.Dispose()
Write-Host "Extracted current_doc.xml successfully!"
