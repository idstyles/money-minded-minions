# Azure Deployment Guide — Money Minded Minions

**Strategy:** Single Azure App Service. Express serves both the API and the React build. MongoDB stays on Atlas (already in the cloud).

> **Important:** Run all `az` commands as **single lines** in Cloud Shell — backslash multiline format causes "unrecognized arguments" errors.

---

## STEP 1 — Open Azure Portal + Cloud Shell

1. Go to **https://portal.azure.com** and sign in with your credentials
2. Click the **Cloud Shell icon** `>_` in the top toolbar
3. Choose **Bash** when prompted
4. All `az` commands below run inside Cloud Shell

---

## STEP 2 — Create a Resource Group

```bash
az group create --name money-minded-rg --location westeurope
```

---

## STEP 3 — Create an App Service Plan (F1 Free Linux)

```bash
az appservice plan create --name money-minded-plan --resource-group money-minded-rg --sku F1 --is-linux
```

> **Note:** F1 is the free tier — no quota required. The app sleeps after 20 min of inactivity but is fine for demos and hackathons. If the subscription already has a resource group in another region, delete it first: `az group delete --name money-minded-rg --yes --no-wait`

---

## STEP 4 — Create the Web App (Node.js 20)

```bash
az webapp create --name money-minded-minions-group249 --resource-group money-minded-rg --plan money-minded-plan --runtime "NODE:20-lts"
```

> **Note:** The app name must be globally unique on Azure. If `money-minded-minions-group249` is taken, append a suffix and replace it in all subsequent commands.

---

## STEP 5 — Set Environment Variables

```bash
az webapp config appsettings set --name money-minded-minions-group249 --resource-group money-minded-rg --settings PROJECT="backend" SCM_DO_BUILD_DURING_DEPLOYMENT="true" MONGO_URI="mongodb+srv://idstyles12:abcd1234@myfreecluster.iqvgxeb.mongodb.net/?appName=MyFreeCluster" AZURE_OPENAI_ENDPOINT="https://tiyasha-first-foundry-resource.cognitiveservices.azure.com/" AZURE_OPENAI_API_KEY="<copy-from-backend/.env>" AZURE_OPENAI_DEPLOYMENT="gpt-4.1-mini" AZURE_OPENAI_VERSION="2024-02-15-preview" JWT_SECRET="mmm_jwt_secret_change_in_production" NODE_ENV="production"
```

> Replace `<copy-from-backend/.env>` with the actual `AZURE_OPENAI_API_KEY` value from your local `backend/.env` file.

---

## STEP 6 — Set Startup Command

```bash
az webapp config set --name money-minded-minions-group249 --resource-group money-minded-rg --startup-file "node index.js"
```

> Oryx builds from the `backend/` folder (set via `PROJECT=backend` in Step 5), so the startup file is just `node index.js` — no path prefix needed.

---

## STEP 7 — Deploy from GitHub

Link the App Service to the GitHub repository:

```bash
az webapp deployment source config --name money-minded-minions-group249 --resource-group money-minded-rg --repo-url https://github.com/idstyles/money-minded-minions --branch aichange --manual-integration
```

> If you see `Operation returned an invalid status 'OK'` — that is a known Azure CLI bug and means the command **succeeded**. Continue to the next step.

Trigger the deployment:

```bash
az webapp deployment source sync --name money-minded-minions-group249 --resource-group money-minded-rg
```

---

## STEP 8 — Check Deployment Logs

```bash
az webapp log deployment show --name money-minded-minions-group249 --resource-group money-minded-rg
```

Look for `"Deployment successful."` at the end. If it failed, check the `details_url` links in the output for the full Oryx build log.

---

## STEP 9 — Verify App is Live

```bash
az webapp show --name money-minded-minions-group249 --resource-group money-minded-rg --query "defaultHostName" -o tsv
```

Your app will be live at:

```
https://money-minded-minions-group249.azurewebsites.net
```

---

## STEP 10 — Stream Live Logs (for debugging)

```bash
az webapp log tail --name money-minded-minions-group249 --resource-group money-minded-rg
```

---

## Resource Summary

| Resource | Name |
|---|---|
| Resource Group | `money-minded-rg` |
| App Service Plan | `money-minded-plan` (F1 Free Linux) |
| Web App | `money-minded-minions-group249` |
| Region | West Europe |
| Runtime | Node.js 20 LTS |
| Branch deployed | `aichange` |
| Live URL | `https://money-minded-minions-group249.azurewebsites.net` |

---

## How It Works

```
Browser
  └── https://money-minded-minions-group249.azurewebsites.net
        └── Express (backend/index.js)
              ├── /auth/*         → JWT auth routes
              ├── /budget         → Budget API
              ├── /add-expense    → Expense API
              ├── /chat           → AI co-pilot
              └── /*              → React build (frontend/build)
```

- Oryx detects `PROJECT=backend` and runs `npm install` inside `backend/`
- Express serves the React production build as static files from `frontend/build`
- `process.env.PORT` is set automatically by Azure
- MongoDB runs on Atlas — no database resource needed in Azure
- All secrets are stored in App Service environment variables (not in code)
