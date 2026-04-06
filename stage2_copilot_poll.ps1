$ErrorActionPreference = 'Continue'
$owner = 'Triltsch'
$repo = 'PancakePainter'
$pr = 48
$maxIterations = 30
$intervalSeconds = 60
$found = $false

function Safe-Json($text) {
  if (-not $text) { return $null }
  try { return $text | ConvertFrom-Json } catch { return $null }
}

$query = 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved isOutdated comments(first:20){nodes{author{login} body url createdAt}}}}}}}'

for ($i = 1; $i -le $maxIterations; $i++) {
  $ts = Get-Date -Format o

  $viewRaw = gh pr view $pr --repo "$owner/$repo" --json reviews,comments 2>$null
  $viewOk = ($LASTEXITCODE -eq 0)
  $view = if ($viewOk) { Safe-Json $viewRaw } else { $null }

  $lineRaw = gh api "repos/$owner/$repo/pulls/$pr/comments" 2>$null
  $lineOk = ($LASTEXITCODE -eq 0)
  $lineComments = if ($lineOk) { @(Safe-Json $lineRaw) } else { @() }
  if ($null -eq $lineComments) { $lineComments = @() }

  $gqlRaw = gh api graphql -f query="$query" -F owner="$owner" -F name="$repo" -F number=$pr 2>$null
  $gqlOk = ($LASTEXITCODE -eq 0)
  $threadNodes = @()
  if ($gqlOk) {
    $gql = Safe-Json $gqlRaw
    if ($gql -and $gql.data -and $gql.data.repository -and $gql.data.repository.pullRequest -and $gql.data.repository.pullRequest.reviewThreads -and $gql.data.repository.pullRequest.reviewThreads.nodes) {
      $threadNodes = @($gql.data.repository.pullRequest.reviewThreads.nodes)
    }
  }

  $reviews = @()
  $issueComments = @()
  if ($view) {
    if ($view.reviews) { $reviews = @($view.reviews) }
    if ($view.comments) { $issueComments = @($view.comments) }
  }

  $copilotReviews = @($reviews | Where-Object { $_.author.login -match 'copilot' })
  $copilotChangesRequested = @($copilotReviews | Where-Object { $_.state -eq 'CHANGES_REQUESTED' })
  $copilotIssueComments = @($issueComments | Where-Object { $_.author.login -match 'copilot' })
  $copilotLineComments = @($lineComments | Where-Object { $_.user.login -match 'copilot' })
  $copilotLineRequestedChanges = @($copilotLineComments | Where-Object { $_.body -match '```suggestion' -or $_.body -match '(?i)requested\s+code\s+change|requested\s+change' })

  $copilotThreadComments = @()
  foreach ($thread in $threadNodes) {
    if ($thread.comments -and $thread.comments.nodes) {
      $copilotThreadComments += @($thread.comments.nodes | Where-Object { $_.author.login -match 'copilot' })
    }
  }
  $copilotThreadRequestedChanges = @($copilotThreadComments | Where-Object { $_.body -match '```suggestion' -or $_.body -match '(?i)requested\s+code\s+change|requested\s+change' })

  $actionable = ($copilotChangesRequested.Count -gt 0) -or ($copilotLineRequestedChanges.Count -gt 0) -or ($copilotThreadRequestedChanges.Count -gt 0)

  Write-Output "[$ts] iter=$i actionable=$actionable copilotReviews=$($copilotReviews.Count) changesRequested=$($copilotChangesRequested.Count) copilotIssueComments=$($copilotIssueComments.Count) copilotLineComments=$($copilotLineComments.Count) lineRequestedChanges=$($copilotLineRequestedChanges.Count) threadRequestedChanges=$($copilotThreadRequestedChanges.Count) viewOk=$viewOk lineOk=$lineOk gqlOk=$gqlOk"

  if ($actionable) {
    Write-Output 'ACTIONABLE_COPILOT_FEEDBACK_DETECTED'
    foreach ($r in $copilotChangesRequested) { Write-Output ("CHANGES_REQUESTED {0} {1}" -f $r.submittedAt, $r.url) }
    foreach ($c in $copilotLineRequestedChanges) { Write-Output ("LINE_REQUESTED_CHANGE {0} {1}" -f $c.created_at, $c.html_url) }
    foreach ($c in $copilotThreadRequestedChanges) { Write-Output ("THREAD_REQUESTED_CHANGE {0} {1}" -f $c.createdAt, $c.url) }
    $found = $true
    break
  }

  if ($i -lt $maxIterations) { Start-Sleep -Seconds $intervalSeconds }
}

if (-not $found) {
  Write-Output 'NO_ACTIONABLE_COPILOT_FEEDBACK_WITHIN_30_MINUTES'
  Write-Output 'NEXT_ACTION: Re-request Copilot review and continue polling after Copilot posts review artifacts.'
}
