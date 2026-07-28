# Ski Registration System

## Apps Script 部署

Apps Script 原始碼位於 `apps-script/`。部署使用 `scripts/` 內的兩個可執行 shell script。

### 一次性設定

```bash
npm install
npm install --prefix apps-script
```

1. 在 [Apps Script 設定](https://script.google.com/home/usersettings) 啟用 Apps Script API。
2. 登入擁有 Apps Script 專案的 Google 帳號：

```bash
npm run apps:login
```

3. 建立 `apps-script/.clasp.json`：

```json
{
  "scriptId": "YOUR_APPS_SCRIPT_ID",
  "rootDir": "."
}
```

將 `YOUR_APPS_SCRIPT_ID` 替換為目標 Apps Script 的 Script ID。這個檔案只保留在本機，不提交 Git。

上述設定只在首次連接 Apps Script，或更換 Apps Script 專案時執行。

### 第一次部署

```bash
./scripts/deploy-apps-script-init.sh
```

此指令會上傳 Apps Script 並建立 Web App deployment。Google 會印出 deployment ID。

將該 ID 填入 `apps-script/package.json` 的 `redeploy` 指令，取代 `REPLACE_WITH_DEPLOYMENT_ID`。這只需要做一次。

Web App URL 格式如下，將 deployment ID 代入後寫入 `.env`：

```env
NUXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

### 後續部署

```bash
./scripts/deploy-apps-script.sh
```

此指令會上傳 Apps Script 並更新既有 Web App deployment。Web App URL 維持不變。

### 檢查同步內容

```bash
npm run apps:status
```

列出會上傳到 Google Apps Script 的檔案，不會修改遠端內容。
