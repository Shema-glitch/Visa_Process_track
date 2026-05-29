# Google OAuth Redirect URI Troubleshooting Guide

## Error: redirect_uri_mismatch

This error occurs when the redirect URI specified in your OAuth request doesn't match any of the authorized redirect URIs configured in your Google Cloud Console project.

## Solution Steps

### Step 1: Identify Your Application's Redirect URI

Your application uses this redirect URI:
```
YOUR_APP_URL/auth/google/callback
```

Where `YOUR_APP_URL` is your production URL (e.g., `https://your-app.com`) or development URL (e.g., `http://localhost:5173`).

For the current setup, the redirect URI is:
```
window.location.origin + "/auth/google/callback"
```

### Step 2: Register the Redirect URI in Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **visa-readiness-backup**
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID: `122661586517-b1notd57qo7vcrgalrl5mllm2fibim10.apps.googleusercontent.com`
5. Click the edit (pencil) icon
6. Under **Authorized redirect URIs**, click **Add URI**
7. Add the following URIs:

**For Production (Supabase hosted):**
```
https://kdjdhfncfbiztkncnkwx.supabase.co/auth/v1/callback
https://your-production-domain.com/auth/google/callback
```

**For Local Development:**
```
http://localhost:5173/auth/google/callback
http://localhost:3000/auth/google/callback
http://127.0.0.1:5173/auth/google/callback
```

8. Click **Save**

### Step 3: Verification Checklist

- [ ] Redirect URI exactly matches the one in your code (including trailing slashes)
- [ ] For local development, include all possible ports you might use
- [ ] For production, ensure HTTPS is used if your site is served over HTTPS
- [ ] The Client ID in your code matches the one in Google Cloud Console

### Step 4: Update Your Code (if needed)

The redirect URI is defined in `src/lib/googleDrive.ts`:

```typescript
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
```

If you need to hardcode a specific URI, update this constant:
```typescript
const REDIRECT_URI = 'https://your-domain.com/auth/google/callback';
```

### Step 5: Common Issues & Fixes

**Issue 1: Port Mismatch**
- Problem: Your app uses port 5173, but you registered port 3000
- Fix: Add both port variations to authorized URIs

**Issue 2: Protocol Mismatch**
- Problem: Using `http://` in development but registered `https://`
- Fix: Add both HTTP and HTTPS versions

**Issue 3: Path Mismatch**
- Problem: Registered `/callback` but code uses `/auth/google/callback`
- Fix: Ensure exact path match

**Issue 4: Supabase Edge Function**
- The edge function also needs to use the correct redirect URI when exchanging the authorization code.

### Step 6: Testing the Fix

1. Clear your browser cache and cookies
2. Navigate to your application
3. Click "Connect Drive"
4. You should see the Google OAuth consent screen without errors
5. After authorization, you should be redirected back successfully

## Edge Function Configuration

The `google-drive-auth` edge function needs to use the same redirect URI when exchanging the authorization code for tokens. The function reads from environment variables:

```typescript
redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI") || 
              `${Deno.env.get("SUPABASE_URL")}/auth/google/callback`
```

Ensure the `GOOGLE_REDIRECT_URI` environment variable is set correctly in your Supabase project settings if needed.

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google Cloud Console](https://console.cloud.google.com/)

## Contact & Support

If you continue to experience issues:
1. Double-check all URIs are correctly registered
2. Verify your Client ID hasn't changed
3. Ensure the OAuth consent screen is properly configured
4. Check the browser's developer console for detailed error messages
