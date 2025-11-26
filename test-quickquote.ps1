$testBody = @{
    premium = 35
    coverageType = "Level"
    sex = "Female"
    state = "TX"
    age = "41"
    paymentType = "Bank Draft/EFT"
} | ConvertTo-Json

Write-Host "`n🧪 Testing /quickquote endpoint...`n" -ForegroundColor Cyan
Write-Host "Request: $testBody`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/quickquote" -Method POST -Body $testBody -ContentType "application/json"
    
    Write-Host "✅ Response received!`n" -ForegroundColor Green
    
    $validQuotes = $response.quotes | Where-Object { -not $_.error }
    
    if ($validQuotes.Count -gt 0) {
        Write-Host "✅ SUCCESS! Found $($validQuotes.Count) quote(s):`n" -ForegroundColor Green
        $validQuotes | ForEach-Object {
            Write-Host "  Provider: $($_.provider)" -ForegroundColor White
            Write-Host "  Monthly Premium: `$$($_.monthlyPremium)" -ForegroundColor White
            Write-Host "  Coverage: $($_.coverageType)`n" -ForegroundColor White
        }
    } else {
        Write-Host "❌ No valid quotes found`n" -ForegroundColor Red
        $response.quotes | Where-Object { $_.error } | ForEach-Object {
            Write-Host "Error: $($_.errorMessage)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`nFull Response:`n" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

