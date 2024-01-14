/**
 * Uses GitHub's GraphQL API to create a branch protection rule for the default branch of the repository.
 * @param {*} octokit Authenticated octokit instance
 * @param {*} payload Received payload from the event
 * @returns {Object} Branch protection rule object
 * @throws {Error} if the branch protection rule could not be created
 */
export async function protectDefaultBranch(octokit, payload) {
  const protectionResponse = await octokit.graphql(
    `mutation addBranchProtection($repositoryId:ID!, $branchPattern:String!) {
      createBranchProtectionRule(input: {
        allowsDeletions: false
        allowsForcePushes: false
        dismissesStaleReviews: true
        isAdminEnforced: true
        pattern: $branchPattern
        repositoryId: $repositoryId
        requiresApprovingReviews: true
        requiredApprovingReviewCount: 1
        requiresCodeOwnerReviews: true
        requiredStatusCheckContexts: []
        requiresStatusChecks: true
        restrictsReviewDismissals: false
      }) {
        branchProtectionRule {
          allowsDeletions
          allowsForcePushes
          creator {
            login
          }
          id
          isAdminEnforced
          requiredStatusCheckContexts
          requiredApprovingReviewCount
          requiresApprovingReviews
          requiresCodeOwnerReviews
          requiresStatusChecks
          restrictsPushes
          restrictsReviewDismissals
          dismissesStaleReviews
          pattern
        }
      }
    }`,
    {
      repositoryId: payload.repository.node_id,
      branchPattern: payload.repository.default_branch
    })
  const { createBranchProtectionRule: { branchProtectionRule } } = protectionResponse
  return branchProtectionRule
}

/**
 * Uses GitHub's GraphQL API to create an issue in the repository.
 * @param {*} octokit Authenticated octokit instance
 * @param {*} payload Received payload from the event
 * @param {*} branchProtectionRule Branch protection rule object
 * @returns {Number} Issue number
 * @throws {Error} if the issue could not be created
 */
export async function createIssue(octokit, payload) {
  const issueResponse = await octokit.graphql(
    `mutation createIssue($repositoryId:ID!, $title:String!, $body:String!) {
      createIssue(input: {
        repositoryId: $repositoryId
        title: $title
        body: $body
      }) {
        issue {
          id
          title
          body
          url
          labels(first: 10) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }`,
    {
      repositoryId: payload.repository.node_id,
      title: `Branch protection rule added`,
      body: getIssueFromTemplate(payload)
    })
  const { createIssue: { issue: { url } } } = issueResponse
  return url.split("/").pop();
}

/**
 * Returns the issue template for the issue to be created.
 * @param {*} payload Received payload from the event
 * @returns {String} Issue markdown text
 * @throws {Error} if the issue markdown text could not be created
 */
function getIssueFromTemplate(payload) {
  return `# Hello, @${payload.sender.login}! :wave:

## :sparkles: This repository's *${payload.repository.default_branch}* branch has been protected :octocat:

Your security team deeply cares about **proper code reviews**, as they are *essential* for maintaining code quality, ensuring long-term maintainability, promoting knowledge sharing, and fostering a culture of continuous improvement.

To guard your repository, the protection rule *main* has been added to the Settings which will stop any insufficiently reviewed pull requests in its tracks.

<br>

> [!NOTE]
> :eyes:  &nbsp; **Rule visibility in Settings > Branches**:
>
>  Although added, your rule will only show up in your repository's Settings view once the *main* branch exists.
> It might be missing if you have just created this repository without any files.

<br>

> This issue was automatically created by your Organization's security application.
> If you have any questions or concerns, please contact the security team.`
}
