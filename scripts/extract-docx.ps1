param(
    [string]$docxPath,
    [string]$outTxt
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
$xmlContent = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

[xml]$xml = $xmlContent
$ns = New-Object System.Xml.XmlNamespaceManager -ArgumentList $xml.NameTable
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

$pNodes = $xml.SelectNodes('//w:p', $ns)
$lines = @()
foreach ($p in $pNodes) {
    $tNodes = $p.SelectNodes('.//w:t', $ns)
    $text = ''
    foreach ($t in $tNodes) {
        $text += $t.InnerText
    }
    if ($text.Trim().Length -gt 0) {
        $lines += $text
    }
}
$lines | Out-File -FilePath $outTxt -Encoding utf8
Write-Host "Extracted $($lines.Count) lines to $outTxt"
