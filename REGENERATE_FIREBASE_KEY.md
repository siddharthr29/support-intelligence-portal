# URGENT: Regenerate Firebase Service Account Key

## The Problem

The current `FIREBASE_PRIVATE_KEY` on Render is corrupted and cannot be parsed by Firebase Admin SDK.

Error: `"Credential implementation problem"` - This means the private key format is completely invalid.

## Solution: Generate Fresh Service Account Key

### Step 1: Generate New Service Account Key

1. Go to: https://console.firebase.google.com
2. Select project: **support-tech-ac46d**
3. Click the gear icon → **Project Settings**
4. Go to: **Service Accounts** tab
5. Click: **Generate New Private Key**
6. Click: **Generate Key** (downloads JSON file)

### Step 2: Extract Private Key from JSON

Open the downloaded JSON file. It will look like:

```json
{
  "type": "service_account",
  "project_id": "support-tech-ac46d",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@support-tech-ac46d.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Step 3: Update Render Environment Variables

Go to: https://dashboard.render.com → `support-intelligence-portal` → **Environment** tab

**Update these 3 variables:**

#### 1. FIREBASE_PROJECT_ID
```
support-tech-ac46d
```

#### 2. FIREBASE_CLIENT_EMAIL
Copy the `client_email` value from the JSON file. It should look like:
```
firebase-adminsdk-xxxxx@support-tech-ac46d.iam.gserviceaccount.com
```

#### 3. FIREBASE_PRIVATE_KEY

**CRITICAL:** Copy the `private_key` value EXACTLY as it appears in the JSON, including:
- The opening and closing quotes
- The `\n` characters (as literal backslash-n, not actual newlines)
- The BEGIN and END markers

Example (this is the format):
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**DO NOT:**
- ❌ Remove the quotes
- ❌ Convert `\n` to actual newlines
- ❌ Add extra spaces
- ❌ Split into multiple lines

**The value should be ONE LONG LINE with `\n` as literal characters.**

### Step 4: Save and Redeploy

1. Click **Save Changes** in Render
2. Render will automatically redeploy (2-3 minutes)
3. Wait for "Live" status

### Step 5: Verify

After deployment, check Render logs for:

```
✅ Firebase Admin SDK initialized successfully {
  projectId: "support-tech-ac46d",
  clientEmail: "firebase-adminsdk-xxxxx@support-tech-ac46d.iam.gserviceaccount.com"
}
```

Then test login at: https://avni-support.vercel.app/login

## Why This Will Work

The backend code now:
1. Strips wrapping quotes from the key
2. Converts `\n` to actual newlines
3. Validates the key has BEGIN/END markers
4. Logs detailed information for debugging

A fresh service account key in the correct format will be properly normalized by the backend code.

## Alternative: Use Base64 Encoding

If the above still doesn't work, we can base64 encode the entire private key:

```bash
# On your Mac terminal:
echo "-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----" | base64
```

Then update backend to decode it:
```typescript
privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64!, 'base64').toString('utf-8')
```

But try the JSON method first - it should work with the current normalization code.
