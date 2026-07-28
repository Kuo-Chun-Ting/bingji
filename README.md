# Ski Registration System

## Apps Script 設定

Apps Script 原始碼位於 `apps-script/`，透過 `clasp` 同步到 Google Apps Script。

### 安裝依賴

```bash
npm install
npm install --prefix apps-script
```

第一個指令安裝前端依賴，第二個指令安裝 Apps Script 使用的 `clasp`。

### 初次連接

1. 在 [Apps Script 設定](https://script.google.com/home/usersettings) 啟用 Apps Script API。
2. 登入擁有 Apps Script 專案的 Google 帳號：

```bash
npm run apps:login
```

這個指令會開啟 Google OAuth 授權頁面，讓 `clasp` 管理該帳號的 Apps Script 專案。

3. 建立本機專案設定：

```bash
cp apps-script/.clasp.json.example apps-script/.clasp.json
```

將 Google Apps Script 專案的 Script ID 填入 `apps-script/.clasp.json`。這個檔案只保留在本機，不會提交到 Git。

### 同步與部署

```bash
npm run apps:status
```

列出會同步到 Google Apps Script 的檔案，不會修改遠端內容。

```bash
npm run apps:push
```

將 `apps-script/Code.js` 和 `apps-script/appsscript.json` 上傳到 Google Apps Script。這個動作只更新原始碼，不會建立公開網址。

```bash
npm run apps:deploy
```

建立 Apps Script Web App 部署版本，供前端透過 HTTP 呼叫。

### 前端設定

將部署後取得的 Web App URL 寫入 `.env`：

```env
NUXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

重新啟動前端後，首頁會檢查 Apps Script 是否可以連線。
