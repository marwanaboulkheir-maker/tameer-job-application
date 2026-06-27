# Simple HTTP Server for Local Testing
# Usage: .\server.ps1

$Port = 8000
$RootPath = $PSScriptRoot

Write-Host "🚀 Starting HTTP Server..." -ForegroundColor Green
Write-Host "📁 Root: $RootPath" -ForegroundColor Cyan
Write-Host "🌐 Visit: http://localhost:$Port" -ForegroundColor Yellow
Write-Host "📋 Applications: http://localhost:$Port/index.html" -ForegroundColor Yellow
Write-Host "👨‍💼 Admin Panel: http://localhost:$Port/admin.html" -ForegroundColor Yellow
Write-Host "⏹️  Press Ctrl+C to stop" -ForegroundColor Gray

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

try {
    while ($true) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $filePath = Join-Path $RootPath $request.RawUrl.TrimStart('/')
        if ($filePath.EndsWith('/')) { $filePath += 'index.html' }

        Write-Host "📩 $($request.HttpMethod) $($request.RawUrl)" -ForegroundColor Cyan

        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            
            # Set content type
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = @{
                '.html' = 'text/html; charset=utf-8'
                '.js' = 'application/javascript; charset=utf-8'
                '.css' = 'text/css; charset=utf-8'
                '.json' = 'application/json'
                '.png' = 'image/png'
                '.jpg' = 'image/jpeg'
                '.jpeg' = 'image/jpeg'
                '.gif' = 'image/gif'
                '.svg' = 'image/svg+xml'
                '.pdf' = 'application/pdf'
                '.txt' = 'text/plain; charset=utf-8'
            }[$ext] ?? 'application/octet-stream'

            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            $response.StatusCode = 200
            Write-Host "✅ 200 OK" -ForegroundColor Green
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found: $($request.RawUrl)")
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
            Write-Host "❌ 404 Not Found" -ForegroundColor Red
        }

        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "`n⏹️  Server stopped" -ForegroundColor Yellow
}
