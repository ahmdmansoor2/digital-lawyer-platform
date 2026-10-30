Add-Type -AssemblyName System.IO.Compression.FileSystem
$desktopFile = Join-Path $env:USERPROFILE 'Desktop\خطاب_مديرية_الزراعة_إلى_رئيس_نيابة_برج_العرب.docx'
Write-Host 'Desktop file exists:' (Test-Path $desktopFile)

$zip = [System.IO.Compression.ZipFile]::OpenRead($desktopFile)
$docEntry = $zip.GetEntry('word/document.xml')
$sr = New-Object System.IO.StreamReader($docEntry.Open(), [System.Text.Encoding]::UTF8)
$xml = $sr.ReadToEnd()
$sr.Close()
$zip.Dispose()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outXmlPath = Join-Path $scriptDir 'desktop_doc.xml'
[System.IO.File]::WriteAllText($outXmlPath, $xml, [System.Text.Encoding]::UTF8)
Write-Host 'Saved XML to:' $outXmlPath

[xml]$x = $xml
$ns = New-Object System.Xml.XmlNamespaceManager($x.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$paras = $x.SelectNodes('//w:p', $ns)
Write-Host 'Total paragraphs:' $paras.Count
$idx = 0
foreach ($p in $paras) {
    $t = ($p.InnerText -replace '\s+', ' ').Trim()
    if ($t.Length -gt 0) {
        Write-Output ("[" + $idx + "] " + $t)
    }
    $idx++
}
