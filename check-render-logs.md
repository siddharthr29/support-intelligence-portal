# Check Render Backend Logs

## URGENT: Need to verify Firebase Admin SDK initialization

Go to: https://dashboard.render.com → `support-intelligence-portal` → **Logs** tab

## Look for these specific log messages:

### 1. Firebase Admin Initialization (on startup)
```
Initializing Firebase Admin SDK with environment variables {
  hasProjectId: true/false,
  hasClientEmail: true/false,
  hasPrivateKey: true/false,
  projectId: "support-tech-ac46d",
  clientEmail: "firebase-adminsdk-fbsvc@support-tech-ac46d.iam.gserviceaccount.com",
  privateKeyLength: 1704
}
```

**Expected:**
```
✅ Firebase Admin SDK initialized successfully {
  projectId: "support-tech-ac46d",
  clientEmail: "firebase-adminsdk-fbsvc@support-tech-ac46d.iam.gserviceaccount.com"
}
```

**If you see error:**
```
❌ Failed to initialize Firebase Admin SDK
Missing Firebase Admin credentials: [FIREBASE_PROJECT_ID, ...]
```

### 2. Token Verification (when you login)
```
Attempting to verify token {tokenPrefix: "eyJhbGciOiJSUzI1NiIs...", tokenLength: 1234}
```

**Expected:**
```
✅ Token verified successfully {uid: "...", email: "..."}
```

**If you see error:**
```
❌ Token verification failed {
  message: "Firebase ID token has incorrect 'aud' (audience) claim...",
  name: "FirebaseAuthError"
}
```

## What to Share

Copy and paste the logs showing:
1. Firebase Admin initialization message
2. Token verification attempt
3. Any error messages

This will tell us exactly why tokens are being rejected.
