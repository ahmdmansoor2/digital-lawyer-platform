$m = 'D:\المكتبة القانونية\مذكرات\إجازة رعاية الطفل\مذكرة استصدار فتوي بشأن قيد 3 مرات في إجازة رعاية الطفل.md'
$text = [System.IO.File]::ReadAllText($m)
$patterns = @(
  '8 قرارات',
  '5 سنوات و8 أشهر',
  '5 سنوات و 8 أشهر',
  '3 سنوات',
  '3 سنة',
  'للمشاركة',
  'يشارك القطاع',
  'يشارك القطاع الأهلي',
  '8 قرارات إجازة',
  '7 قرارات إجازة',
  'حوالي 5 سنوات',
  '≈ 5',
  'حوالي 3 سنوات'
)
foreach ($p in $patterns) {
  $count = ([regex]::Matches($text, [regex]::Escape($p))).Count
  Write-Host "Pattern '$p': $count"
}
$idx = $text.IndexOf('8 قرارات')
if ($idx -ge 0) {
  Write-Host "`nContext around 8 قرارات: $($text.Substring([Math]::Max(0, $idx - 5), 40))"
}
$idx = $text.IndexOf('3 سنوات')
if ($idx -ge 0) {
  Write-Host "`nContext around 3 سنوات: $($text.Substring([Math]::Max(0, $idx - 5), 40))"
}
$idx = $text.IndexOf('للمشاركة')
if ($idx -ge 0) {
  Write-Host "`nContext around للمشاركة: $($text.Substring([Math]::Max(0, $idx - 5), 40))"
}
