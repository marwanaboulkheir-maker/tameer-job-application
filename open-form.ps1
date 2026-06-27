$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chrome = $path
        break
    }
}

if ($chrome) {
    $filePath = "d:\job abb\index.html"
    Start-Process $chrome -ArgumentList $filePath
    Write-Host "Opened: $filePath"
} else {
    Write-Host "Chrome not found. Please open the file manually."
}
