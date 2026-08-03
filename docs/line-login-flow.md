# LINE 登入流程

```mermaid
sequenceDiagram
    autonumber
    actor U as 學員
    participant B as 瀏覽器
    participant L as LINE
    participant A as Apps Script 後端
    participant S as Google Sheet

    U->>B: 點擊 LINE 登入

    B->>B: 產生 state = STATE123
    Note over B: 確認 callback 屬於這次登入流程

    B->>B: 產生 nonce = NONCE456
    Note over B: 確認 LINE 身分資料是針對這次登入產生

    B->>B: 暫存 state 和 nonce

    B->>L: 前往 LINE 授權網址
    Note over B,L: 帶上 channelId、redirectUri、state、nonce、scope

    L->>U: 要求登入或確認授權
    U->>L: 完成授權

    L-->>B: 導回 callback
    Note over L,B: code = CODE789，state = STATE123

    B->>B: 比對收到的 state 與暫存的 state

    alt state 不相同或遺失
        B-->>U: LINE 登入已失效
    else state 相同
        B->>A: loginWithLine
        Note over B,A: 傳送 code = CODE789，nonce = NONCE456

        A->>L: 使用 code 換取 LINE Token
        Note over A,L: 帶上 channelId、channelSecret、redirectUri、code

        L-->>A: 回傳 ID Token 與 Access Token
        Note over L,A: ID Token 包含 LINE userId、nonce、有效期限等身分資料

        A->>A: 驗證 LINE ID Token
        Note over A: 驗證簽章、有效期限、channelId 與 nonce

        alt nonce 不相同
            A-->>B: 拒絕登入
        else nonce 相同
            A->>S: 用 LINE userId 查詢綁定資料

            alt 已綁定學員
                A-->>B: 回傳冰記 Session Token
                Note over A,B: Session Token 代表已登入的學員與權限
                B->>B: 儲存 Session Token
                B-->>U: 顯示學員頁面
            else 尚未綁定
                A-->>B: 回傳 Binding Token
                Note over A,B: Binding Token 只能用來完成電話與 LINE 帳號綁定
                B->>A: Binding Token 加電話
                A->>S: 儲存電話與 LINE userId
                A-->>B: 回傳冰記 Session Token
                B-->>U: 顯示學員頁面
            end
        end
    end
```

## 變數用途

| 變數 | 產生者 | 使用階段 | 目的 |
| --- | --- | --- | --- |
| `state` | 前端 | LINE callback 回來時 | 確認 callback 對應這次登入 |
| `nonce` | 前端 | 後端驗證 LINE ID Token 時 | 防止舊身分資料被重播 |
| `code` | LINE | 後端向 LINE 換 Token | 一次性、短效的兌換碼 |
| LINE ID Token | LINE | 後端驗證 LINE 身分 | 證明使用者的 LINE 身分 |
| Binding Token | 冰記後端 | 第一次綁定電話 | 暫時允許完成帳號綁定 |
| 冰記 Session Token | 冰記後端 | 登入後呼叫冰記功能 | 代表冰記登入身分與權限 |

`state`、`nonce`、`code` 都是登入過程中的臨時資料；真正讓使用者持續使用冰記的是最後取得的冰記 Session Token。
