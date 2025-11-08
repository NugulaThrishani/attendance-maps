# Test attendance marking functionality  
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTk4NjdmM2QtNDE0OS00OWFhLTkyMjktYjRmNmUyMjZkYTM0IiwiZW1haWwiOiJhdnVsYXZlbmthdGFkaGFudXNoQGdtYWlsLmNvbSIsImZhY3VsdHlfaWQiOiJLTFU0MDM0MyIsImV4cCI6MTc1ODIxNzczMn0.FX9WZ8i4aMU9-2m7AHTOwimrpL9IWKSy7ATRWuSZe7g"

$attendanceData = @{
    live_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    network_info = @{
        ssid = "localhost"
        ip = "127.0.0.1"
        connection_type = "wifi"
    }
    liveness_sequence = @()
} | ConvertTo-Json -Depth 3

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Testing attendance marking..."

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/attendance/verify" -Method Post -Body $attendanceData -Headers $headers
    Write-Host "✅ Attendance marking successful!"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Attendance marking failed:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}