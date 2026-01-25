Write-Host "Attempting to close VS Code..."
taskkill /IM Code.exe /F
Start-Sleep -Seconds 3

$globalStorage = "$env:APPDATA\Code\User\globalStorage\state.vscdb"
$workspaceStorage = "$env:APPDATA\Code\User\workspaceStorage"

if (Test-Path $globalStorage) {
    Write-Host "Removing global state database..."
    Remove-Item $globalStorage -Force
} else {
    Write-Host "Global state database not found (already deleted?)"
}

if (Test-Path $workspaceStorage) {
    Write-Host "Backing up workspace storage (this resets window layouts for all projects)..."
    $backupName = "workspaceStorage_backup_$(Get-Date -Format 'yyyyMMddHHmmss')"
    Rename-Item $workspaceStorage -NewName $backupName
    Write-Host "Backed up to $backupName"
}

Write-Host "---------------------------------------------------"
Write-Host "FIX COMPLETE. Please open VS Code manually now."
Write-Host "---------------------------------------------------"
Pause
