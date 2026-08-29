# 隱私權政策 (Privacy Policy)

**生效日期 / 最後更新日期**：2026 年 8 月 29 日  
**應用程式名稱**：SpeedVocab (拼寫反應時間單字庫)  
**開發者 / 聯絡方式**：andrew0201dev@gmail.com  
**專案網址**：https://github.com/andrew0201huang/vocabulary_app  
**線上服務網址**：https://andrew0201huang.github.io/vocabulary_app/

---

## 1. 簡介 (Introduction)

感謝您使用 **SpeedVocab**（以下簡稱「本應用程式」）。本應用程式為無伺服器（Serverless）架構的純前端單字學習工具，致力於保護每位使用者的個人隱私。

本隱私權政策旨在說明我們如何收集、使用、儲存及保護您的資料，特別是有關您透過 Google 帳號登入與 Google Drive 雲端同步的資料處理方式。

---

## 2. 我們收集的資料 (Information We Collect)

### 2.1 Google 帳號資訊 (Google User Data)
當您選擇使用「Google 帳號登入」時，我們會透過 Google OAuth 2.0 取得以下基本公開資訊：
- **基本個人資料**：您的姓名（Name）、電子郵件地址（Email）與個人頭像（Profile Picture）。
- **用途**：僅用於在網頁介面上顯示您的登入身分與識別個人學習進度。

### 2.2 Google Drive 雲端同步資料 (Google Drive Data)
本應用程式嚴格僅申請 **`https://www.googleapis.com/auth/drive.appdata`**（應用程式專屬隱藏資料夾）權限：
- **操作範圍**：僅在您的個人 Google Drive 專屬隱藏目錄中建立、讀取與更新名為 `vocabulary_data.json` 的單字資料檔。
- **絕對權限限制**：本應用程式**完全無法且絕對不會**存取、讀取、修改或刪除您 Google Drive 雲端硬碟中的任何其他個人文件、相簿或私人檔案。

### 2.3 本地學習與測驗數據 (Local Learning Data)
- 包含您建立的單字庫、測驗作答反應時間（毫秒）、答題正確率、連續正確次數與艾賓浩斯複習時間排程。
- 此數據儲存於您個人的瀏覽器快取（LocalStorage / IndexedDB）及您授權的 Google Drive 檔案中。

---

## 3. 資料的使用方式 (How We Use Information)

- **純前端運算**：所有的測驗計時、記憶演算法（SM-2）與數據分析皆完全在您的瀏覽器端執行。
- **跨裝置進度同步**：僅將您個人的單字學習檔案存取於您的個人 Google 帳號中，供您在不同裝置間同步。
- **不收集、不出售、不追蹤**：本應用程式**沒有**後端伺服器，不會將您的任何個人資料或單字庫儲存至第三方伺服器，亦絕不向任何第三方出售、出租或分享您的個人資料。

---

## 4. Google API 使用者資料政策遵循聲明 (Google API Limited Use Disclosure)

> SpeedVocab 對從 Google API 收到的資訊的使用和向任何其他應用程式的傳輸，均遵守 [Google API 服務使用者資料政策](https://developers.google.com/terms/api-services-user-data-policy)，包括**限定使用 (Limited Use)** 要求。

---

## 5. 資料安全與保存 (Data Storage & Security)

- 本應用程式採用 Google 官方推薦的 OAuth 2.0 與 HTTPS 加密連線傳輸。
- 您的 Access Token 僅暫存於您的本機瀏覽器工作階段中，並會在過期後自動失效。

---

## 6. 使用者權益與資料刪除 (User Rights & Data Deletion)

您對您的個人資料擁有完全的控制權：
1. **清除本地資料**：您可隨時在 SpeedVocab 右上角「設定」中點擊「**重設本機所有學習資料**」，或透過瀏覽器清除網站快取。
2. **解除 Google 授權**：您可隨時前往 [Google 帳戶安全性設定 - 第三方應用程式存取權](https://myaccount.google.com/permissions) 撤銷 SpeedVocab 的存取權限。
3. **刪除雲端檔案**：撤銷授權或在 Google Drive 管理應用程式中清除資料夾即可徹底刪除 `appDataFolder` 中的檔案。

---

## 7. 隱私權政策的修訂 (Changes to This Policy)

我們可能會不定期更新本隱私權政策。任何修改都會發布於本頁面，並更新最上方的「最後更新日期」。

---

## 8. 聯絡我們 (Contact Us)

如果您對本隱私權政策或資料處理有任何疑問或建議，歡迎透過電子郵件與開發者聯絡：  
✉️ **Email**：`andrew0201dev@gmail.com`
