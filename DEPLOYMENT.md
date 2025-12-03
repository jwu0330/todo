# 部署指南

## 部署到 GitHub Pages

### 步驟 1：建立 GitHub 儲存庫

1. 登入 GitHub
2. 點擊右上角的 "+" → "New repository"
3. 輸入儲存庫名稱（例如：`timeblock-scheduler`）
4. 選擇 "Public"
5. 點擊 "Create repository"

### 步驟 2：上傳檔案

在專案目錄中執行以下命令：

```bash
# 初始化 Git 儲存庫
git init

# 添加所有檔案
git add .

# 提交變更
git commit -m "Initial commit: TimeBlock Scheduler v1.0"

# 連接到 GitHub 儲存庫（替換成你的 GitHub 使用者名稱和儲存庫名稱）
git remote add origin https://github.com/你的使用者名稱/timeblock-scheduler.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步驟 3：啟用 GitHub Pages

1. 進入你的 GitHub 儲存庫頁面
2. 點擊 "Settings"（設定）
3. 在左側選單中點擊 "Pages"
4. 在 "Source" 下拉選單中選擇 "main" 分支
5. 選擇根目錄 "/ (root)"
6. 點擊 "Save"

### 步驟 4：訪問你的網站

幾分鐘後，你的網站將會在以下網址上線：

```
https://你的使用者名稱.github.io/timeblock-scheduler/
```

## 本地測試

### 方法 1：使用 Python（推薦）

```bash
# Python 3
python -m http.server 8000

# 然後在瀏覽器中訪問
# http://localhost:8000
```

### 方法 2：使用 Node.js

```bash
# 安裝 http-server
npm install -g http-server

# 啟動伺服器
http-server -p 8000

# 然後在瀏覽器中訪問
# http://localhost:8000
```

### 方法 3：直接開啟檔案

直接在瀏覽器中開啟 `index.html` 檔案即可使用（某些功能可能受限）。

## 更新網站

當你修改程式碼後，執行以下命令更新網站：

```bash
git add .
git commit -m "描述你的變更"
git push
```

GitHub Pages 會自動更新你的網站（通常需要幾分鐘）。

## 自訂網域（可選）

如果你有自己的網域，可以在 GitHub Pages 設定中添加自訂網域：

1. 在 "Settings" → "Pages" 中找到 "Custom domain"
2. 輸入你的網域名稱
3. 在你的網域 DNS 設定中添加 CNAME 記錄指向 `你的使用者名稱.github.io`

## 疑難排解

### 網站無法訪問

- 確認 GitHub Pages 已啟用
- 檢查儲存庫是否為 Public
- 等待幾分鐘讓 GitHub 建置網站

### 樣式或功能異常

- 清除瀏覽器快取
- 確認所有檔案都已正確上傳
- 檢查瀏覽器控制台是否有錯誤訊息

### LocalStorage 資料遺失

- LocalStorage 資料儲存在瀏覽器中
- 清除瀏覽器資料會導致資料遺失
- 建議定期匯出重要資料（未來版本功能）

## 效能優化建議

1. **啟用 HTTPS**：GitHub Pages 預設啟用 HTTPS
2. **壓縮檔案**：可以使用工具壓縮 CSS 和 JS 檔案
3. **快取策略**：GitHub Pages 會自動處理快取

## 安全性注意事項

- 所有資料儲存在使用者瀏覽器中
- 不會傳送任何資料到伺服器
- 完全離線可用
- 無需擔心資料外洩

---

**祝你使用愉快！** 🎉
