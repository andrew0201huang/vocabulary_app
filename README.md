# SpeedVocab 拼寫反應時間單字庫

專注於「拼寫反應時間」的英文單字記憶與複習 Web App。採用 Serverless 純前端架構，可直接部署至 GitHub Pages，並使用使用者的個人 Google Drive (`appDataFolder`) 進行無伺服器雲端進度同步。

---

## 🌟 核心特色 (Core Features)

### 1. 以「拼寫反應時間」決定記憶熟悉度 (Latency-Based Familiarity & SM-2)
- 不只檢驗拼寫正確與否，更以毫秒（ms）等級精密計時。
- **⚡ 極速精通 (< 1.8s)**：直覺反射，大幅延長間隔複習天數（例如：+6、+14、+30 天）。
- **✨ 熟練反應 (1.8s - 3.5s)**：反應良好，正常推進複習週期。
- **⚠️ 生疏遲疑 (> 6.0s / 拼錯 / 放棄)**：自動歸入**動態複習池**，在本回合尾端重複出現，並在下回合優先排入複習。

### 2. 多元答題輸入模式 (Multi-modal Input Methods)
- **鍵盤打字 (Keyboard)**：預設即時回饋、智慧退格、Enter 快速送出與錯誤震動提示。
- **手寫繪圖評分 (Canvas Handwriting)**：滑順平滑手寫畫布、支援橡皮擦與「顯示答案自我核對評分」機制。
- **語音拼讀 (Voice Spelling)**：透過 Web Speech API (`SpeechRecognition`) 辨識使用者逐字唸出的英文字母 (如 A - P - P - L - E)。

### 3. 題目提示 (Prompts)
- **視覺**：繁體中文釋義、詞性、例句提示與可開關的音標 (KK / IPA)。
- **聽覺**：出題時自動播放 Web Speech API (`SpeechSynthesis`) 英文標準真人發音（支援語速、音調調整及空白鍵重播）。

### 4. 題庫管理模組 (Word Bank Management)
- **內建官方題庫**：一鍵快速匯入台灣教育部「國小基本單字」與「國中會考核心單字 (1200+)」。
- **Excel / Google Sheets 批次新增**：大型貼上區域，自動解析 Tab 分隔、逗號分隔（CSV）、`單字 - 中文`，並具備重複單字過濾與覆寫選項。
- **備份與匯出**：支援匯出完整學習歷程之 JSON 檔，以及支援 Excel 開啟（含 UTF-8 BOM）之 CSV 表格。

### 5. 資料同步與無伺服器架構 (Data Sync Flow)
- **Google OAuth 2.0 (GIS)**：使用 Google Identity Services 前端授權。
- **Google Drive `appDataFolder`**：將 `vocabulary_data.json` 隱藏存放於使用者個人的 Google Drive 特殊目錄，完全不佔用伺服器資源且保護隱私。
- **離線優先 (Offline-First)**：本地即時快取，測驗結束自動同步回傳覆蓋。
- **PWA 支援**：已配置 Service Worker 與 Web Manifest，可離線操作並安裝至桌面 / 手機主畫面。

---

## 🛠️ 技術堆疊 (Tech Stack)

- **框架**：React 18 + TypeScript + Vite
- **樣式**：Tailwind CSS + Lucide Icons
- **音效與語音**：Web Audio API (純程式合成音效) + Web Speech API (TTS & 語音辨識)
- **PWA**：Vite Plugin PWA + Workbox
- **雲端同步**：Google Drive API v3 (`spaces=appDataFolder`) + Google Identity Services (GIS)

---

## 🚀 本地開發與執行 (Local Development)

```bash
# 1. 安裝依賴
npm install

# 2. 啟動本機開發伺服器
npm run dev

# 3. 建置生產版本
npm run build

# 4. 預覽生產版本
npm run preview
```

---

## 🌐 部署至 GitHub Pages (Deployment)

1. 在 GitHub 上建立儲存庫並推動程式碼。
2. 執行建置：
   ```bash
   npm run build
   ```
3. 將 `dist/` 資料夾內容發佈至 `gh-pages` 分支，或使用 GitHub Actions 自動部署：

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 🔑 Google Drive API & OAuth 2.0 設定教學

若要啟用雲端同步功能：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)。
2. 建立新專案或選擇現有專案。
3. 進入「**API 和服務**」>「**程式庫**」，搜尋並啟用 **Google Drive API**。
4. 進入「**憑證**」頁面，點選「**建立憑證**」>「**OAuth 2.0 用戶端 ID**」：
   - 應用程式類型：**網頁應用程式 (Web Application)**
   - 已授權的 JavaScript 來源：新增本機網址 `http://localhost:5173` 以及您的 GitHub Pages 網址 `https://<username>.github.io`。
5. 複製生成的 **用戶端 ID (Client ID)**，在 SpeedVocab 右上角的「**設定**」齒輪中貼上即可開始使用！
