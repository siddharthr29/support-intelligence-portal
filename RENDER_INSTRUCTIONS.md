# Update Render with Base64-Encoded Private Key

## ✅ Backend Code Deployed

The backend now supports `FIREBASE_PRIVATE_KEY_BASE64` environment variable to avoid newline formatting issues.

## 📋 Steps to Update Render

### 1. Go to Render Dashboard

1. Open: https://dashboard.render.com
2. Click: `support-intelligence-portal`
3. Click: **Environment** tab

### 2. Add New Environment Variable

Click **Add Environment Variable**

**Name:**
```
FIREBASE_PRIVATE_KEY_BASE64
```

**Value:**
```
LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRGNuSkl5VDR5OXU0cC8KYTRxVkZOK2xkcDFKUHBWdjNweGJaOS9zTExndE0xclN4MGZLaHFkY3l2SGdOMVBSVmM1YjdvenFhTlBNbUQ3TQpwektSSk96bm10ajJhQ2h3eVhyeUFyMExOUFZuL3RjNExhemhtTFhWRlJUSlF2eTRMV1RRMDBxdENvc1FJT0dlCklaZE95aVUwR1lkQmRHMS9tMUVLUk9aVFp4S093a1ZvekF1L1NIdEo5SlV1NzFHcnZyQmJzOXZEbjZOQ1JaZnAKb0hweW5XTlBxSW5ZRmNOK0J1TXQ0c1VvcVhGdjBiZUY5VDlkUTVQYW9KbnE5TXhJUVpaRGU1eWJLUUVKUUk4Zwo0bExYMlFybFRGSktPU3dNUGM1Vi8yNEZIWUpRMWpYQkh6ODhRYXI5Wkg5R3lLQUxNakUrM3IveWZxcjQyMmF6CkorU2dhTWVMQWdNQkFBRUNnZ0VBRElYNDFXcm5PN1RYTi9lQStDSWxnc2JGclpOeEJIQ2VWVzJkQmRMZUR0MDMKV0YzNTNEa0liQ1l1Vktrc0xqT3FxeUdHRmJqYVJlY1ZZL0czQ25JT2VGZTFxcTVyL0hwSVVZTGlGY2ZndkhnUgo0akNmKzZoN0Y1VnBFOE5YbjN1NE11Q0tHbUlCSXJlLzdXd0FpWkQzZnJDOWY0MXJIOXdDa1AvRTRXd3BYdE5iCkowMjVlQXN5cjVNdmFRUzNwd292VjBPUjRiV3hkRHZkd1hCbmR0OGtuZkp2dFd5K0pQbWdpUjVlZU1CSE9mWXQKamVyZnFlOWlUN0YxOVlEenowOWtMQkhKaGxzbFdwR1hOeVoxcStCNC9pMWlqNXNnVm8xb3ErZmFkUTZIcUFETQozTHp2bVhuZDFDVzM2dWJQd1duSjhuS2NFV3ErODJMcDl4dFNtdjFHbFFLQmdRRC9XRjFCWU83SnVvL1Q0WGF4CkYveHVFNEV2L2JUMWpiYTBvNnVpSm4wV2lhVE44QmFub05zQVJYRy81a3N2Yk9vdit6UkZWNFpCb3NJOEx6T0kKOWtrMVgxVUh4SmViUFNZTzB0YzhPSFZWMDQrN3JBUzE1L3N6bjVCU3RXb3NTQmRMMjRRd1VYSU54S3VjT25LWApTTWNBbEUyWDUxY2d5MEI1RVZWR2lMaWo5UUtCZ1FEZExXZHNNN1hHZXhHUUZOWlp5V1VhWC9Hd1lvaWxJdXE1CmU4d2tnRVZwS25aUXVsWWhVNHpTRXRDOC9DZittY2ZSNkRZOWFMakloVk12SVRYR0lIbFRhNnZTWVZ6eTM3bTkKUk9nbXRWRVZBb3RwdElyRTE4NmtMRmtUWS9JZ05Sa05hL1hvWC8va1h6TE5qTS96WmdyNitoYTRBS3FtR1lXQQo3YzR0cVF3TmZ3S0JnUUQ1YzBIblZPTHlnQ2R5UHBqTmVUbEo4QlFNNWpXYWpjOG51WjA2MDQ3d0xaZXErQm1wCnVTTTVxSjN2Y3ZPUWFUNS9rVkVIVFBJRHZSVXo1b2phRElDSWU1RjkvVGgrbDhaT1JQdXdBUmZmdU1aNStSckEKK3RnVkhwVEh1Q0w1RDVSeXJ3ajhpeFI1RHVEM3hzR2J1YVZ2azNJYUxBNmFJdlhoVUdXV2VvcW00UUtCZ0RaQgo1aVlnQlU2Y2NER0ZPeFFwbUpqQXdweC9mMy9yTWVPd24rS3dhTmFrcVFPaXduQkllN29wRFhYZThieStZc3QyCmlKL0Y2ZGFmQmtvQWZwMk01OVowQ21HQXF2bVZzbzNnc29hVVlrQ2lNQ3NOTkNHWHcwUjQ4SjBXSHBhU0VBUS8KNE1KUmtvZW1adU1QMFErbmo3Z0QwOER0d084Z1FhVGdNWHo0QkZIbkFvR0FXWGNnc3lXdkFZeVpIcmxVQjhMWQpScHJ4bnVZK2lDVVM0K3VXd1k2RklEeUJBTXRrSmVTMHEySnBtQUcrQkFVaXhvWHJSc3huelpDekt2eW9pcGdCCkNCTlVMb2gzdVVublhqMnNUQlhmdjhLV0p2WkFkN0thcXdxZzY3WG52aTllNzZSaDdOeWxOLzVvZWl6Vko1eEUKN0xZVzVaOVU1MHZaQURmV2dNaGlTVWs9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K
```

**Copy the entire value above** (it's one long string with no spaces or newlines)

### 3. Optional: Delete Old Variable

You can optionally delete the old `FIREBASE_PRIVATE_KEY` variable since we're using the Base64 version now.

Or keep both - the backend will use Base64 first if available.

### 4. Save Changes

Click **Save Changes**

Render will automatically redeploy (2-3 minutes)

### 5. Verify Deployment

After Render shows "Live" status, check the logs for:

```
Using base64-encoded private key
✅ Firebase Admin SDK initialized successfully {
  projectId: "support-tech-ac46d",
  clientEmail: "firebase-adminsdk-fbsvc@support-tech-ac46d.iam.gserviceaccount.com"
}
```

### 6. Test Login

Go to: https://avni-support.vercel.app/login

**Expected:**
- ✅ Login succeeds
- ✅ Dashboard loads with data
- ✅ No 401 errors

---

## Why This Works

Base64 encoding solves the newline problem:
- The private key is encoded as a single string
- No `\n` characters that Render might misinterpret
- Backend decodes it back to the correct format with actual newlines
- Firebase Admin SDK receives properly formatted key

---

## If Still Having Issues

Check Render logs for:
- `Using base64-encoded private key` - confirms it's using the right format
- `privateKeyHasBeginMarker: true` - confirms key is valid
- `✅ Token verified successfully` - confirms authentication works

Share the logs if you see any errors.
