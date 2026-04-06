<#
.SYNOPSIS
  Polls a GitHub pull request for actionable Copilot review feedback.

.DESCRIPTION
  Queries the GitHub API (REST + GraphQL) on a configurable interval and
  reports any Copilot-authored reviews, inline comments, or thread comments
  that indicate a change request or suggestion.  Replaces the per-PR
  poll scripts (stage2_copilot_poll.ps1, stage2_copilot_poll_49.ps1,
  pr51_copilot_poll.ps1, pr51_poll.ps1).

.PARAMETER PrNumber
  The pull request number to watch.

.PARAMETER Owner
  GitHub repository owner (default: Triltsch).

.PARAMETER Repo
  GitHub repository name (default: PancakePainter).

.PARAMETER MaxIterations
  Maximum number of polling iterations before giving up (default: 30).

.PARAMETER IntervalSeconds
  Seconds to wait between iterations (default: 60).

.EXAMPLE
  .\poll-copilot-review.ps1 -PrNumber 51
  .\poll-copilot-review.ps1 -PrNumber 49 -IntervalSeconds 30
#>
param(
  [Parameter(Mandatory = $true)]
  [int]$PrNumber,

  [string]$Owner = 'Triltsch',
  [string]$Repo  = 'PancakePainter',

  [int]$MaxIterations   = 30,
  [int]$IntervalSeconds = 60
)

$ErrorActionPreference = 'Continue'
$found = $false

# GraphQL query to fetch unresolved/non-outdated review threads with comments.
$gqlQuery = 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved isOutdated comments(first:20){nodes{author{login} body url createdAt}}}}}}}'

function ConvertFrom-JsonSafe {
  param([string]$Text)
  if (-not $Text) { return $null }
  try { return $Text | ConvertFrom-Json } catch { return $null }
}

for ($i = 1; $i -le $MaxIterations; $i++) {
  $ts = Get-Date -Format o

  # --- REST: reviews + issue-level comments --------------------------------
  $viewRaw = gh pr view $PrNumber --repo "$Owner/$Repo" --json reviews,comments 2>$null
  $viewOk  = ($LASTEXITCODE -eq 0)
  $view    = if ($viewOk) { ConvertFrom-JsonSafe $viewRaw } else { $null }

  # --- REST: inline review comments ----------------------------------------
  $lineRaw      = gh api "repos/$Owner/$Repo/pulls/$PrNumber/comments" 2>$null
  $lineOk       = ($LASTEXITCODE -eq 0)
  $lineComments = if ($lineOk) { @(ConvertFrom-JsonSafe $lineRaw) } else { @() }
  if ($null -eq $lineComments) { $lineComments = @() }

  # --- GraphQL: review threads ---------------------------------------------
  $gqlRaw     = gh api graphql -f query="$gqlQuery" -F owner="$Owner" -F name="$Repo" -F number=$PrNumber 2>$null
  $gqlOk      = ($LASTEXITCODE -eq 0)
  $threadNodes = @()
  if ($gqlOk) {
    $gql = ConvertFrom-JsonSafe $gqlRaw
    if ($gql -and $gql.data.repository.pullRequest.reviewThreads.nodes) {
      $threadNodes = @($gql.data.repository.pullRequest.reviewThreads.nodes)
    }
  }

  # --- Collect Copilot-authored artifacts ----------------------------------
  $reviews       = if ($view -and $view.reviews)  { @($view.reviews)  } else { @() }
  $issueComments = if ($view -and $view.comments) { @($view.comments) } else { @() }

  $copilotReviews       = @($reviews       | Where-Object { $_.author.login -match 'copilot' })
  $copilotChangesReq    = @($copilotReviews | Where-Object { $_.state -eq 'CHANGES_REQUESTED' })
  $copilotIssueComments = @($issueComments  | Where-Object { $_.author.login -match 'copilot' })
  $copilotLineComments  = @($lineComments   | Where-Object { $_.user.login   -match 'copilot' })

  # Treat inline comments with code suggestions or wording indicating a
  # requested change as actionable.
  $copilotLineRequested = @($copilotLineComments | Where-Object {
    $_.body -match '```suggestion' -or $_.body -match '(?i)requested\s+code\s+change|requested\s+change'
  })

  $copilotThreadComments = @()
  foreach ($thread in $threadNodes) {
    if ($thread.comments -and $thread.comments.nodes) {
      $copilotThreadComments += @($thread.comments.nodes | Where-Object {
        $_.author.login -match 'copilot'
      })
    }
  }
  $copilotThreadRequested = @($copilotThreadComments | Where-Object {
    $_.body -match '```suggestion' -or $_.body -match '(?i)requested\s+code\s+change|requested\s+change'
  })

  $actionable = ($copilotChangesReq.Count -gt 0) -or
                ($copilotLineRequested.Count  -gt 0) -or
                ($copilotThreadRequested.Count -gt 0)

  Write-Output ("[$ts] iter={0} actionable={1} changesReq={2} issueComments={3} lineComments={4} lineRequested={5} threadRequested={6} viewOk={7} lineOk={8} gqlOk={9}" -f `
    $i, $actionable, $copilotChangesReq.Count, $copilotIssueComments.Count,
    $copilotLineComments.Count, $copilotLineRequested.Count,
    $copilotThreadRequested.Count, $viewOk, $lineOk, $gqlOk)

  if ($actionable) {
    Write-Output 'ACTIONABLE_COPILOT_FEEDBACK_DETECTED'
    foreach ($r in $copilotChangesReq)       { Write-Output ("CHANGES_REQUESTED {0} {1}" -f $r.submittedAt, $r.url) }
    foreach ($c in $copilotLineRequested)    { Write-Output ("LINE_REQUESTED_CHANGE {0} {1}" -f $c.created_at, $c.html_url) }
    foreach ($c in $copilotThreadRequested)  { Write-Output ("THREAD_REQUESTED_CHANGE {0} {1}" -f $c.createdAt, $c.url) }
    $found = $true
    break
  }

  if ($i -lt $MaxIterations) { Start-Sleep -Seconds $IntervalSeconds }
}

if (-not $found) {
  Write-Output 'NO_ACTIONABLE_COPILOT_FEEDBACK_WITHIN_TIMEOUT'
  Write-Output 'NEXT_ACTION: Re-request Copilot review and continue polling after Copilot posts review artifacts.'
}
