# Azure Deployment Guide — Money Minded Minions

**Strategy:** Single Azure App Service. Build the app inside Cloud Shell, zip it, and deploy directly. Express serves both the API and the React build. MongoDB stays on Atlas (already in the cloud).

> **Important:** Run all `az` commands as **single lines** in Cloud Shell — backslash multiline format causes "unrecognized arguments" errors.

---

## STEP 1 — Open Azure Portal + Cloud Shell

1. Go to **https://portal.azure.com** and sign in with your credentials
2. Click the **Cloud Shell icon** `>_` in the top toolbar
3. Choose **Bash** when prompted
4. All commands below run inside Cloud Shell

---

## STEP 2 — Create a Resource Group

```bash
az group create --name money-minded-rg --location westeurope
```

> If you get `InvalidResourceGroupLocation` (group already exists in another region), delete it first: `az group delete --name money-minded-rg --yes`

---

## STEP 3 — Create an App Service Plan (F1 Free Linux)

```bash
az appservice plan create --name money-minded-plan --resource-group money-minded-rg --sku F1 --is-linux
```

> F1 is the free tier — no quota required. The app sleeps after 20 min of inactivity, which is fine for demos and hackathons.

---

## STEP 4 — Create the Web App (Node.js 20)

```bash
az webapp create --name money-minded-minions-group249 --resource-group money-minded-rg --plan money-minded-plan --runtime "NODE:20-lts"
```

> The app name must be globally unique on Azure. If taken, append a suffix and replace it in all subsequent commands.

---

## STEP 5 — Set Environment Variables

```bash
az webapp config appsettings set --name money-minded-minions-group249 --resource-group money-minded-rg --settings SCM_DO_BUILD_DURING_DEPLOYMENT="false" PROJECT="" MONGO_URI="mongodb+srv://idstyles12:abcd1234@myfreecluster.iqvgxeb.mongodb.net/?appName=MyFreeCluster" AZURE_OPENAI_ENDPOINT="https://tiyasha-first-foundry-resource.cognitiveservices.azure.com/" AZURE_OPENAI_API_KEY="<paste-key-from-backend/.env>" AZURE_OPENAI_DEPLOYMENT="gpt-4.1-mini" AZURE_OPENAI_VERSION="2024-02-15-preview" JWT_SECRET="mmm_jwt_secret_change_in_production" NODE_ENV="production"
```

> Replace `<paste-key-from-backend/.env>` with the actual `AZURE_OPENAI_API_KEY` value. `SCM_DO_BUILD_DURING_DEPLOYMENT=false` disables server-side Oryx build entirely — `node_modules` will be included in the zip instead (built in Cloud Shell).

---

## STEP 6 — Set Startup Command

```bash
az webapp config set --name money-minded-minions-group249 --resource-group money-minded-rg --startup-file "node backend/index.js"
```

> Must be `node backend/index.js` — Azure runs this from `/home/site/wwwroot` and `index.js` lives inside the `backend/` subfolder.

---

## STEP 7 — Clone Repo and Build Everything in Cloud Shell

```bash
cd ~ && git clone https://github.com/idstyles/money-minded-minions.git && cd money-minded-minions && git checkout aichange
```

Install all dependencies and build React — everything runs in Cloud Shell, not on the App Service:

```bash
npm --prefix backend install && npm --prefix frontend install && npm --prefix frontend run build
```

> All heavy work (npm install + React build) runs in Cloud Shell (free, unlimited CPU) — F1 quota is never touched.

---

## STEP 8 — Create Deployment Zip

Include `backend/node_modules` in the zip so Azure has no build step at all — just extract and run:

```bash
cd ~/money-minded-minions && zip -r ~/app-final.zip backend frontend/build package.json -x "backend/node_modules/.cache/*"
```

> Excluding only `.cache` keeps the zip lean while retaining all required modules.

---

## STEP 9 — Deploy the Zip

```bash
az webapp deploy --name money-minded-minions-group249 --resource-group money-minded-rg --src-path ~/app-final.zip --type zip --async true
```

> `--async true` returns immediately — Azure processes the deployment in the background, avoiding client-side timeout errors (502/504).
>
> If you get a 403 "Web app is stopped" error, go to **Azure Portal → App Services → money-minded-minions-group249 → Start**, then rerun this command.

Wait ~2 minutes then check the app state:

```bash
az webapp show --name money-minded-minions-group249 --resource-group money-minded-rg --query "state" -o tsv
```

---

## STEP 10 — Verify App is Live

```bash
az webapp show --name money-minded-minions-group249 --resource-group money-minded-rg --query "defaultHostName" -o tsv
```

Your app will be live at:

```
https://money-minded-minions-group249.azurewebsites.net
```

---

## STEP 11 — Stream Live Logs (for debugging)

```bash
az webapp log tail --name money-minded-minions-group249 --resource-group money-minded-rg
```

---

## Cleanup — Delete All Resources

```bash
az group delete --name money-minded-rg --yes --no-wait
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
| Deployed from | Cloud Shell zip deploy |
| Live URL | `https://money-minded-minions-group249.azurewebsites.net` |

---

## How It Works

```
Browser
  └── https://money-minded-minions-group249.azurewebsites.net
        └── Express  (backend/index.js)
              ├── /auth/*         → JWT auth routes
              ├── /budget         → Budget API
              ├── /add-expense    → Expense API
              ├── /chat           → AI co-pilot
              └── /*              → React build (frontend/build)
```

- All builds run in Cloud Shell (free, unlimited) — F1 CPU quota is never consumed
- Zip includes `backend/node_modules` + `frontend/build` — Azure just extracts and starts, no build step
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false` ensures Oryx does not run on the server
- `process.env.PORT` is set automatically by Azure (defaults to 8080)
- MongoDB runs on Atlas — no database resource needed in Azure
- All secrets are in App Service environment variables (not in code)
