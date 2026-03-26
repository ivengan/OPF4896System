# Find local IP address
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Ethernet' -and $_.IPAddress -notmatch '127.0.0.1' }).IPAddress[0]
if (-not $ip) { $ip = "YOUR_LOCAL_IP" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   OPF4896 SYSTEM - LOCAL SERVER" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Access the system from this computer at:" -NoNewline
Write-Host "  http://localhost:5000" -ForegroundColor Green
Write-Host "Access from other devices on your WiFi at:" -NoNewline
Write-Host "  http://$($ip):5000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

npm run serve
