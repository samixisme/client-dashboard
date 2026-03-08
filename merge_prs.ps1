$ErrorActionPreference = "Continue"

Write-Host "Stashing local changes on feature/files-management..."
git stash

Write-Host "Switching to main and pulling latest..."
git checkout main
git pull origin main

$prs = Invoke-RestMethod -Uri "https://api.github.com/repos/samixisme/client-dashboard/pulls?state=open&per_page=100" -Method Get

$mergedBranches = @()

foreach ($pr in $prs) {
    if ($pr.draft -eq $true) { continue }
    
    $branch = $pr.head.ref
    
    # Get PR details for mergeability
    $prDetail = Invoke-RestMethod -Uri $pr.url -Method Get
    
    if ($prDetail.mergeable -ne $true) {
        Write-Host "---"
        Write-Host "PR #$($pr.number) ($branch) is not mergeable (mergeable=$($prDetail.mergeable)). Skipping."
        continue
    }
    
    # Check CI checks
    $checksUrl = "https://api.github.com/repos/samixisme/client-dashboard/commits/$($prDetail.head.sha)/check-runs"
    $checkRuns = (Invoke-RestMethod -Uri $checksUrl -Method Get).check_runs
    
    $allPassed = $true
    foreach ($run in $checkRuns) {
        if ($run.status -eq "completed") {
            if ($run.conclusion -ne "success" -and $run.conclusion -ne "skipped" -and $run.conclusion -ne "neutral") {
                $allPassed = $false
            }
        }
        elseif ($run.status -ne "completed") {
            $allPassed = $false
        }
    }
    
    if ($checkRuns.Count -eq 0) {
        Write-Host "---"
        Write-Host "PR #$($pr.number) ($branch) has NO checks. Assuming not verified. Skipping or please comment out this check."
        $allPassed = $false
        continue
    }

    if (-not $allPassed) {
        Write-Host "---"
        Write-Host "PR #$($pr.number) ($branch) has failing or pending checks. Skipping."
        continue
    }
    
    Write-Host "---"
    Write-Host "Merging PR #$($pr.number) ($branch)..."
    
    git fetch origin $branch
    
    $mergeOutput = git merge "origin/$branch" -m "Merge pull request #$($pr.number) from $branch" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Merge conflict or error for $($branch): $mergeOutput"
        git merge --abort
    }
    else {
        Write-Host "Successfully merged $branch"
        $mergedBranches += $branch
    }
}

if ($mergedBranches.Count -gt 0) {
    Write-Host "---"
    Write-Host "Pushing main to origin..."
    git push origin main
    
    foreach ($b in $mergedBranches) {
        Write-Host "Deleting branch $b remotely..."
        git push origin --delete $b
    }
}
else {
    Write-Host "---"
    Write-Host "No PRs were merged."
}

Write-Host "Returning to feature/files-management..."
git checkout feature/files-management
git stash pop
