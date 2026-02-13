$paths = @(
    "$env:USERPROFILE\.config\opencode\plugins\oh-my-opencode",
    "$env:USERPROFILE\.config\opencode\node_modules\oh-my-opencode",
    "$env:APPDATA\opencode\plugins\oh-my-opencode",
    "$env:APPDATA\npm\node_modules\oh-my-opencode",
    "$env:USERPROFILE\.opencode\plugins\oh-my-opencode"
)

Write-Host "Searching for oh-my-opencode..."
foreach ($path in $paths) {
    if (Test-Path $path) {
        Write-Host "FOUND: $path"
    } else {
        Write-Host "Not found: $path"
    }
}
