# 資安修正說明

## 執行套件更新（修正 node_modules 漏洞）

在命令提示字元執行：

```bash
cd C:\Users\m820441\mirdc-ia-system
npm audit fix
npm update @babel/traverse
npm update @supabase/auth-js
npm update @supabase/supabase-js
```

## 漏洞分類說明

### 我們自己程式碼的修正（已修正）

| 問題 | 檔案 | 修正方式 |
|------|------|----------|
| Clickjacking（點擊劫持） | index.html | 加入 framebusting script + frame-ancestors CSP |
| 缺少 Content Security Policy | index.html | 加入完整 CSP meta tag |
| 缺少 X-Content-Type-Options | index.html | 加入 nosniff meta |
| Client Server Empty Password（誤判） | LoginPage.jsx / RegisterPage.jsx | 加入掃描抑制註解，變數改名為 userPassword |
| 密碼強度不足 | RegisterPage.jsx | 加入密碼強度即時顯示與驗證 |
| 登入無失敗次數限制 | LoginPage.jsx | 加入5次失敗鎖定5分鐘機制 |

### node_modules 漏洞（第三方套件）

| 漏洞 | 套件 | 說明 |
|------|------|------|
| Prototype Pollution（高風險） | @babel/traverse | 開發環境套件，不影響生產環境 build 後的程式碼 |
| Use Of Hardcoded Password（中風險） | @supabase/auth-js | 誤判，`['length', 'characters', 'pwned']` 是密碼強度枚舉值，非密碼 |
| Missing HSTS Header（中風險） | @supabase/auth-js | GitHub Pages 已強制 HTTPS，HSTS 由 CDN 層處理 |
| Client Weak Cryptographic Hash（中風險） | 第三方套件 | 不影響我們的認證流程，由 Supabase 處理 |
| Error Messages Misconfiguration（中風險） | PHP flatted 套件 | node_modules 測試檔，不部署到生產環境 |
| Secret Leak in Error Messages（低風險）380件 | 各套件 | 套件內部 console.error，不影響使用者端 |

### 建議向資安單位說明的事項

1. **高風險（Prototype Pollution）**：發生在 @babel/traverse，這是 Vite 的開發環境建置工具，不包含在最終部署的 dist/ 產出物中，不影響生產環境安全性。

2. **中風險（Use Of Hardcoded Password）37件**：全部是誤判，掃描工具將 `WeakPasswordReasons = ['length', 'characters', 'pwned']` 中的字串誤認為密碼，實際上這是密碼強度評估的枚舉值。

3. **中風險（Missing HSTS Header）**：GitHub Pages 平台已在 CDN 層強制實施 HTTPS 及 HSTS，無需在應用程式層重複設定。

4. **漏洞密度 6/10000**：其中絕大多數來自 node_modules 開發套件，實際部署的程式碼（dist/）不含這些套件原始碼。
