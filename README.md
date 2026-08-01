# Ski Registration System

Nuxt 靜態前端透過 Google Apps Script 讀寫 Google Sheet。

## Google Sheet 設定

建立兩個 Spreadsheet。

### 原始報名 Spreadsheet

第一個分頁的第一列必須依序為：

```text
姓名 | 電話 | Email | 購買堂數
```

Apps Script 只讀取這份資料，不會修改。

### 營運 Spreadsheet

建立以下三個分頁，名稱與第一列欄位必須完全一致：

```text
accounts
phone | password

courses
id | date | startTime | endTime | isOpen

registrations
id | courseId | phone | status | createdAt | updatedAt
```

- `accounts`：每位學員一列。電話需與原始報名資料相同。
- `courses`：直接在 Sheet 建立課程；`isOpen` 使用 `TRUE` 或 `FALSE`。
- `registrations`：只建立欄位列，報名與到課紀錄由系統寫入。

## Apps Script 設定

在 Apps Script 專案的「專案設定 > 指令碼屬性」加入：

```text
SOURCE_SPREADSHEET_ID=原始報名 Spreadsheet ID
OPERATIONS_SPREADSHEET_ID=營運 Spreadsheet ID
TEACHER_PHONE=管理者登入電話
TEACHER_PASSWORD=管理者登入密碼
SESSION_SECRET=自訂的長隨機字串
```

部署必須設定為「以部署者身分執行」，存取權限設為「任何人」。

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

## 本機啟動

在 `.env` 設定 Web App URL：

```env
NUXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

啟動前端：

```bash
npm run dev
```

MVP 的學員測試密碼以明碼存放在 `accounts`。正式使用前應改用 LINE 登入或安全的密碼儲存方式。
