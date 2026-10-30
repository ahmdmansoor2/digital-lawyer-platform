Add-Type -AssemblyName System.Drawing
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcPath = Join-Path $scriptDir "logo_final.png"
$bmp = New-Object System.Drawing.Bitmap($srcPath)

$minX = $bmp.Width; $maxX = 0; $minY = $bmp.Height; $maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.GetBrightness() -lt 0.85) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$w = $maxX - $minX + 1
$h = $maxY - $minY + 1
Write-Host "Logo trimmed: x=$minX, y=$minY, w=$w, h=$h"
$rect = New-Object System.Drawing.Rectangle($minX, $minY, $w, $h)
$crop = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($bmp, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$crop.Save((Join-Path $scriptDir "prosecution_logo_isolated.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$crop.Dispose()
$bmp.Dispose()
Write-Host "prosecution_logo_isolated.png saved!"
