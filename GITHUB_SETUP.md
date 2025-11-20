# GitHub Integration Setup

This guide helps you set up GitHub integration for the bug report feature in Link360.

## Creating a GitHub Personal Access Token

1. **Go to GitHub Settings**
   - Navigate to: https://github.com/settings/tokens
   - Or: GitHub Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a descriptive name: `Link360 Bug Reporter`
   - Set expiration (recommended: 90 days or No expiration)

3. **Select Required Scopes**
   - ✅ **repo** (Full control of private repositories)
     - This allows creating issues in your repository

4. **Generate and Copy Token**
   - Click "Generate token" at the bottom
   - **IMPORTANT**: Copy the token immediately - you won't see it again!

5. **Add to Environment Variables**
   - Open your `.env` file
   - Add the following line:
     ```
     GITHUB_TOKEN=ghp_your_token_here
     ```
   - Replace `ghp_your_token_here` with your actual token

## Testing the Integration

1. **Restart your server** after adding the token:
   ```bash
   npm start
   ```

2. **Test bug report**:
   - Click the "Report Bug" button in the sidebar
   - Fill in the bug report form
   - Submit
   - A new issue should be created at: https://github.com/xthxr/Link360/issues

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit your `.env` file to git
- Never share your personal access token
- The `.gitignore` file already excludes `.env` to protect your credentials
- If your token is ever exposed, revoke it immediately on GitHub and generate a new one

## Troubleshooting

**Issue: "Failed to create bug report"**
- Check that your `GITHUB_TOKEN` is correctly set in `.env`
- Verify the token has `repo` scope
- Make sure the repository name is correct: `xthxr/Link360`

**Issue: 401 Unauthorized**
- Your token may be expired or invalid
- Generate a new token and update `.env`

**Issue: 404 Not Found**
- Check the repository name in `server.js` line with GitHub API call
- Ensure your token has access to the repository
