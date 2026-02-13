# 🔐 GitHub Secrets Configuration Guide

**Repository:** Your client-dashboard repository
**Location:** Settings → Secrets and variables → Actions → New repository secret

---

## Required Secrets (5 Total)

### 1. VPS_SSH_KEY
**Description:** Private SSH key for deployment to VPS

**How to get it:**
```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Display the private key
sudo cat /home/YOUR_USER/.ssh/id_rsa
```

**Value to paste:** Copy the ENTIRE output (entire private key block)

---

### 2. API_KEY
**Description:** API authentication key

**Value:**
```
your-api-key-here
```

**⚠️ Security:** Replace with your actual API key (keep this secret!)

---

### 3. GOOGLE_SERVICE_ACCOUNT_JSON
**Description:** Google Drive service account credentials

**How to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project → IAM & Admin → Service Accounts
3. Create or select service account → Keys → Add Key → Create New Key → JSON
4. Download the JSON file
5. Copy its entire contents as a single-line string

**Format:** Single-line JSON string with escaped newlines in the private_key field

**⚠️ Important:** Paste the entire JSON object as a single line (GitHub Secrets will handle it correctly)

---

### 4. GOOGLE_DRIVE_ROOT_FOLDER_ID
**Description:** Google Drive folder ID for file storage

**How to get it:**
1. Open Google Drive
2. Navigate to your root folder for the project
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

**Value:**
```
YOUR_GOOGLE_DRIVE_FOLDER_ID
```

---

### 5. GEMINI_API_KEY (Optional)
**Description:** Google Gemini API key for AI features

**Value:**
- If you have a Gemini API key, paste it here
- If not, you can skip this secret (AI features will be disabled)

**How to get it:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy and paste here

---

## 📝 Setup Instructions

### Step 1: Navigate to GitHub Secrets
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Add Each Secret
For each secret listed above:
1. Click **New repository secret**
2. **Name:** Paste the secret name exactly (e.g., `API_KEY`)
3. **Value:** Paste the value from this guide
4. Click **Add secret**

### Step 3: Verify
After adding all secrets, you should see:
- ✅ VPS_SSH_KEY
- ✅ API_KEY
- ✅ GOOGLE_SERVICE_ACCOUNT_JSON
- ✅ GOOGLE_DRIVE_ROOT_FOLDER_ID
- ✅ GEMINI_API_KEY (optional)

---

## 🎯 Quick Copy Commands

### For VPS_SSH_KEY (run on VPS):
```bash
sudo cat /home/clientdash/.ssh/id_rsa
```

### For Testing (run locally):
```bash
# Test if secrets work (replace with your actual values)
echo "API_KEY=your-api-key-here"
echo "FOLDER_ID=your-google-drive-folder-id"
```

---

## ✅ Verification

After adding all secrets, your GitHub Actions workflow will automatically use them during deployment. You can verify by:

1. Go to **Actions** tab
2. Manually trigger the **Deploy to Production** workflow
3. Check the logs to ensure no "missing secret" errors

---

## 🔒 Security Notes

- ✅ GitHub encrypts all secrets
- ✅ Secrets are never exposed in logs
- ✅ Only workflows can access secrets
- ✅ You can rotate secrets anytime by updating them

---

**Next Step:** After adding these secrets, you're ready to deploy! 🚀
