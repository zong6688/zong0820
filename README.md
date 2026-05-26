Pose Similarity Web Demo

此資料夾包含靜態網頁 `index.html`，實作 MediaPipe Pose 的即時姿勢相似度比對（捕捉目標、即時分數與視覺回饋）。

本地測試

1. 直接以瀏覽器開啟 `index.html`（注意：Chrome 等瀏覽器若以 `file://` 開啟，可能無法啟用攝影機；建議使用簡易靜態伺服器或在本機使用 `http://localhost`）。

   Python 3 簡易伺服器：

```powershell
# 在此資料夾執行
python -m http.server 8000
# 然後開啟 http://localhost:8000/index.html
```

部署到 GitHub（步驟示例）

1. 在本機 clone 你的 repo（若尚未 clone）：

```powershell
git clone https://github.com/zong6688/zong0820.git
cd zong0820
```

2. 將 `index.html` 放到 repo 根目錄（本範例已放置），建立新的分支 `gh-pages` 並推送：

```powershell
git checkout -b gh-pages
git add index.html
git commit -m "Add static pose-similarity web demo"
git push origin gh-pages
```

3. 前往 GitHub Repo → Settings → Pages，選擇 `gh-pages` 分支作為發佈來源，儲存後系統會顯示網站 URL。

註：若你偏好使用 `main` 的 `docs/` 目錄，也可以把檔案放到 `docs/`，然後在 Pages 設定中選擇 `main`/`docs`。

若你要，我可以嘗試在本機自動執行 `git` 操作並推送（需要你在本機的 git 有權限）。或我可以產出一個 ZIP，讓你手動上傳。