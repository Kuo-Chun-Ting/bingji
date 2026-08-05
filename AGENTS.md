# Agent Instructions

## 使用者 Review 時機

除非使用者明確要求 review，建立或更新 agent 產生的規格、計畫、工作紀錄文件時，不得停下來要求 review。

## 測試與驗證

- 功能修改預設走 TDD。
- 依修改範圍執行必要測試；修改涵蓋多個測試層級或影響範圍不明時，執行 `npm test`。
- 只有修改真實外部串接時，才執行 `npm run test:e2e:live`。
- 修改測試時，同步更新 `docs/test-inventory.html`。
- 完成程式修改後執行 `npm run typecheck`；已執行 `npm test` 時不需重複執行。
- 修改前端建置設定或部署流程時，執行 `npm run build`。

## 部署

每次部署一律同步更新 Apps Script 後端與 Vercel 前端，即使本次只修改其中一端。兩端都成功後才能回報部署完成。
