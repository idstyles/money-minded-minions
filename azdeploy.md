# Azure Deployment Guide — Money Minded Minions

**Strategy:** Single Azure App Service. Express serves both the API and the React build. MongoDB stays on Atlas (already in the cloud).

---

## STEP 1 — Open Azure Portal + Cloud Shell

1. Go to **https://portal.azure.com** and sign in with your credentials
2. Click the **Cloud Shell icon** `>_` in the top toolbar
3. Choose **Bash** when prompted
4. All `az` commands below run inside Cloud Shell

---

## STEP 2 — Create a Resource Group

```bash
az group create \
  --name money-minded-rg \
  --location eastus
```

---

## STEP 3 — Create an App Service Plan (F1 Free Linux)

```bash
az appservice plan create \
  --name money-minded-plan \
  --resource-group money-minded-rg \
  --sku F1 \
  --is-linux
```

> **Note:** F1 is the free tier — no quota required. The app sleeps after 20 min of inactivity but is fine for demos and hackathons. Upgrade to B1 later if the subscription quota allows.

---

## STEP 4 — Create the Web App (Node.js 20)

```bash
az webapp create \
  --name money-minded-minions \
  --resource-group money-minded-rg \
  --plan money-minded-plan \
  --runtime "NODE:20-lts"
```

> **Note:** The app name must be globally unique on Azure. If `money-minded-minions` is taken, try `money-minded-minions-<yourname>`.

---

## STEP 5 — Set Environment Variables

```bash
az webapp config appsettings set \
  --name money-minded-minions \
  --resource-group money-minded-rg \
  --settings \
    MONGO_URI="<your-mongodb-atlas-uri>" \
    AZURE_OPENAI_ENDPOINT="<your-azure-openai-endpoint>" \
    AZURE_OPENAI_API_KEY="<your-azure-openai-api-key>" \
    AZURE_OPENAI_DEPLOYMENT="gpt-4.1-mini" \
    AZURE_OPENAI_VERSION="2024-02-15-preview" \
    JWT_SECRET="<a-strong-random-secret>" \
    NODE_ENV="production"
```

---

## STEP 6 — Set Startup Command

Tell Azure which file to run after deployment:

```bash
az webapp config set \
  --name money-minded-minions \
  --resource-group money-minded-rg \
  --startup-file "cd /home/site/wwwroot/backend && node index.js"
```

Enable automatic build during deployment:

```bash
az webapp config appsettings set \
  --name money-minded-minions \
  --resource-group money-minded-rg \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

---

## STEP 7 — Deploy from GitHub

Link the App Service to the GitHub repository:

```bash
az webapp deployment source config \
  --name money-minded-minions \
  --resource-group money-minded-rg \
  --repo-url https://github.com/idstyles/money-minded-minions \
  --branch aichange \
  --manual-integration
```

Trigger the first deployment:

```bash
az webapp deployment source sync \
  --name money-minded-minions \
  --resource-group money-minded-rg
```

---

## STEP 8 — Configure Build via Portal

Go to **Azure Portal → App Service → money-minded-minions → Configuration → General Settings** and set:

| Field | Value |
|---|---|
| Startup Command | `cd /home/site/wwwroot/backend && node index.js` |

Then go to **Deployment Center → Settings** and add a custom build command if needed:

```bash
# Build frontend, then install backend deps
cd frontend && npm install && npm run build && cd ../backend && npm install
```

---

## STEP 9 — Verify Deployment

Get your live URL:

```bash
az webapp show \
  --name money-minded-minions \
  --resource-group money-minded-rg \
  --query "defaultHostName" -o tsv
```

Your app will be live at:

```
https://money-minded-minions.azurewebsites.net
```

---

## STEP 10 — Stream Live Logs (for debugging)

```bash
az webapp log tail \
  --name money-minded-minions \
  --resource-group money-minded-rg
```

---

## Resource Summary

| Resource | Name |
|---|---|
| Resource Group | `money-minded-rg` |
| App Service Plan | `money-minded-plan` (F1 Free Linux) |
| Web App | `money-minded-minions` |
| Region | East US |
| Runtime | Node.js 20 LTS |
| Branch deployed | `aichange` |
| Live URL | `https://money-minded-minions.azurewebsites.net` |

---

## How It Works

```
Browser
  └── https://money-minded-minions.azurewebsites.net
        └── Express (backend/index.js)
              ├── /auth/*         → JWT auth routes
              ├── /budget         → Budget API
              ├── /add-expense    → Expense API
              ├── /chat           → AI co-pilot
              └── /*              → React build (frontend/build)
```

- Express serves the React production build as static files
- `process.env.PORT` is set automatically by Azure
- MongoDB runs on Atlas — no database resource needed in Azure
- All secrets are stored in App Service environment variables (not in code)
