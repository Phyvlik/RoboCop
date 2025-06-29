# Google OAuth Setup Guide

## For Testing Purposes Only

This guide will help you set up Google OAuth for testing the operator login system.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "Emergency Response AI Dashboard"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users: Your Google email address

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:8080`
   - `http://127.0.0.1:5500`
   - `file://` (for local file testing)
5. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:8080`
   - `http://127.0.0.1:5500`
6. Copy the Client ID

### Step 4: Update the Code

Replace `YOUR_GOOGLE_CLIENT_ID` in `index.html` with your actual Client ID:

```html
<div id="g_id_onload"
     data-client_id="123456789-abcdefghijklmnop.apps.googleusercontent.com"
     data-context="signin"
     data-ux_mode="popup"
     data-callback="handleCredentialResponse"
     data-auto_prompt="false">
</div>
```

### Step 5: Test the Login

1. Open `index.html` in your browser
2. You should see the login screen
3. Click "Sign in with Google" to test real Google OAuth
4. Or click "Demo Login" for testing without Google

### Important Notes

- **For Testing Only**: This is a demo implementation
- **Local Testing**: Use a local server (not just file://) for OAuth to work
- **Test Users**: Only add your own email as a test user
- **Security**: Never commit real Client IDs to version control

### Quick Local Server Setup

If you don't have a local server, you can use Python:

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Then access: `http://localhost:8080`

### Demo Mode

If you don't want to set up Google OAuth, you can use the "Demo Login" button which will:
- Simulate a successful login
- Show "Demo Operator" as the logged-in user
- Allow full access to the dashboard
- Store session in localStorage

### Removing the Login System

To remove the login system later, simply:
1. Delete the login screen HTML
2. Remove the login-related JavaScript
3. Show the dashboard directly 