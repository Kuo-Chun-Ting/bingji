# Claude Instructions

## 使用者 Review 時機

除非使用者明確要求 review，建立或更新 agent 產生的規格、計畫、工作紀錄文件時，不得停下來要求 review。

## 測試方式

所有功能修改預設走 TDD：先依 change scope 寫失敗測試，再實作到通過。

1. Unit test：
   - 使用 Vitest。
   - 適用於純邏輯、資料轉換、狀態更新、error handling，或可以用 stub / mock 隔離外部依賴的程式。
2. Component test：
   - 使用 Vitest、Nuxt Test Utils 與 Vue Test Utils；缺少套件時先安裝。
   - 適用於 Vue / Nuxt 元件的 render、props、emit、互動與狀態變化。
3. E2E test：
   - 使用 Playwright。
   - 適用於跨元件、跨頁面、LINE 登入、Apps Script API 與完整使用者流程。
   - 預設 stub 無法由本專案控制的外部 API；修改授權、request / response schema、timeout / retry 或真實串接時，才執行 `@live` 測試。
4. 修改 Unit / Component / E2E test 時，同步更新 `docs/test-inventory.html`。

## 驗證方式

1. 預設執行所有不會呼叫真實外部 API 的測試。
2. 完成修改後執行 `npm run typecheck`。
3. 修改前端建置設定或部署流程時，執行 `npm run build`。
4. 只有修改外部 API 的授權、request / response schema、timeout / retry 或真實串接時，才執行 `@live` 測試。

## 部署

每次部署一律同步更新 Apps Script 後端與 Vercel 前端，即使本次只修改其中一端。兩端都成功後才能回報部署完成。
