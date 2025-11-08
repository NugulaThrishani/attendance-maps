# Test login functionality
$loginData = @{
    email = "avulavenkatadhanush@gmail.com"
    password = "2300040343"
} | ConvertTo-Json

Write-Host "Testing login with credentials:"
Write-Host $loginData

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    Write-Host "✅ Login successful!"
    Write-Host $response
} catch {
    Write-Host "❌ Login failed:"
    Write-Host $_.Exception.Message
}