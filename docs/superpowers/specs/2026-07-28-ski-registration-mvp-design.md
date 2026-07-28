# 滑雪報名系統 MVP 設計

## 目標

建立供學員報名每週課程、查看剩餘堂數，以及供老師確認實際到課狀態的 MVP。

## 架構

- Nuxt 4 提供靜態前端。
- Google Apps Script 提供公開 HTTP API，並以部署者的 Google 帳號權限讀寫 Google Sheet。
- 前端只呼叫 Apps Script，不直接存取 Google Sheet。
- 不使用 Nuxt Server、本機 JSON、LINE 登入或其他資料庫。

## Google Sheet

使用兩個 Spreadsheet。

原始報名 Spreadsheet 只讀，固定欄位：

- `姓名`
- `電話`
- `Email`
- `購買堂數`

營運 Spreadsheet 包含三個分頁：

- `accounts`：`phone`、`password`
- `courses`：`id`、`date`、`startTime`、`endTime`、`isOpen`
- `registrations`：`id`、`courseId`、`phone`、`status`、`createdAt`、`updatedAt`

電話正規化後不可重複，並作為學員識別資料。課程由 owner 直接在 `courses` 分頁維護。

## Apps Script 設定

Script Properties 保存：

- `SOURCE_SPREADSHEET_ID`
- `OPERATIONS_SPREADSHEET_ID`
- `TEACHER_PHONE`
- `TEACHER_PASSWORD`
- `SESSION_SECRET`

MVP 使用測試密碼明碼。API 不回傳或記錄密碼。正式使用前必須改用 LINE 登入或安全的密碼儲存方式。

## 登入與權限

- 老師與學員使用同一個電話加密碼表單。
- 老師帳密由 Script Properties 驗證。
- 學員帳密由營運 Spreadsheet 的 `accounts` 分頁驗證。
- 登入成功後，Apps Script 回傳包含電話、角色與到期時間的簽章 token。
- 前端保存 token，後續 API 請求都必須攜帶 token。
- Apps Script 每次請求都驗證 token，不信任前端傳入的電話或角色。
- 學員只能查看自己的資料及新增自己的 `registered` 紀錄。
- 老師可以查看全部資料，但不能替學員新增報名。
- 老師只能將 `registered` 更新為 `attended`、`absent` 或 `cancelled`。

## 堂數

- 剩餘堂數等於原始購買堂數減去該學員的 `attended` 紀錄數。
- 報名不扣堂。
- 老師確認 `attended` 時才影響剩餘堂數。
- 原始報名 Spreadsheet 永遠不修改。

## API

- `GET`：回傳服務健康狀態。
- `login`：驗證電話與密碼，回傳 token 與角色。
- `getStudentDashboard`：回傳登入學員、剩餘堂數、課程及自己的報名紀錄。
- `registerCourse`：替登入學員新增報名。
- `getTeacherDashboard`：回傳全部學員、課程、報名及剩餘堂數。
- `updateAttendance`：更新已報名紀錄的到課狀態。

所有寫入操作使用 Apps Script LockService，避免重複報名或同時更新造成資料衝突。

## 前端

- 首頁提供統一的電話與密碼登入。
- 登入後依角色導向學員頁或老師頁。
- 學員頁顯示剩餘堂數、可報名課程及歷史紀錄。
- 老師頁依課程顯示報名名單並更新到課狀態。
- 登出清除本機 token 並返回首頁。
- API 錯誤顯示明確訊息，不保留失敗操作的前端假狀態。

## 測試

- 單元測試涵蓋電話正規化、Sheet 資料轉換、登入、token、權限、剩餘堂數、重複報名與狀態轉換。
- 測試 Apps Script 對 Sheet gateway 的輸入、輸出與錯誤處理，不測 Google Sheet 或 Apps Script 平台本身。
- 測試命名使用 `test_{function_name}_when_{condition}_then_{expected_result}`，並使用 Arrange、Act、Assert 分段。

## MVP 不包含

- LINE 登入或通知
- 加購、付款與退費
- 密碼修改或重設介面
- 課程管理介面
- 手機驗證碼
- 候補與人數上限
