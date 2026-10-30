$word = $null
try {
    $word = New-Object -ComObject Word.Application
    Write-Host "Word COM available, version: $($word.Version)"
    $word.Quit()
} catch {
    Write-Host "Word COM not accessible: $($_.Exception.Message)"
}
