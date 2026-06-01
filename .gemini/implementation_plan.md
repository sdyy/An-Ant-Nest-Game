# 實施計畫：入侵蟻：蟻巢潛入戰 (Intruder Ant: Nest Infiltration)

本專案旨在建立一款基於 HTML5 Canvas 與 JavaScript 的 2D 網格制隱蔽策略遊戲。玩家將扮演一隻入侵敵對蟻巢的螞蟻，透過釋放費洛蒙引開敵方兵蟻，尋找並擊敗深處的蟻后。

## 使用者審查要求

> [!IMPORTANT]
> 請確認以下核心機制是否符合您的預期：
> 1. **兵蟻 AI 行為**：兵蟻擁有「巡邏」、「追擊（發現玩家）」與「誤導（被費洛蒙吸引）」三種狀態。當牠偵測到費洛蒙時，會被強制吸引朝費洛蒙最強的方向移動。
> 2. **蟻后防護罩機制**：蟻后位於地圖終點，周圍有 3 個「防護罩節點」。玩家必須在 3 個節點上均釋放足夠的費洛蒙（使其充能完畢）來解除防護罩，方可上前擊敗蟻后獲勝。
> 3. **操作方式**：使用方向鍵或 `WASD` 移動，按下 `Space` 鍵釋放費洛蒙。

## 專案結構

本專案將採用純前端技術（HTML + Vanilla CSS + JavaScript），不需要額外框架，以維持最佳的流暢度與輕量化。

```
C:/Users/10110012/Documents/antigravity/delightful-galileo/
├── index.html          # 遊戲主入口與 HTML 結構
├── index.css           # 現代暗色調霓虹風格 CSS 樣式
└── js/
    ├── game.js         # 遊戲主循環、狀態管理與初始化
    ├── map.js          # 隨機迷宮生成 (DFS)、戰爭迷霧與糖分生成邏輯
    ├── entities.js     # 玩家、兵蟻與蟻后的屬性與行為 (含 A* 尋路與費洛蒙邏輯)
    └── renderer.js     # Canvas 渲染模組 (粒子特效、迷霧與精緻視覺效果)
```

---

## 提案變更

### 1. 遊戲入口與樣式
*   `[NEW]` [index.html](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/index.html): 包含遊戲 Canvas、HUD 資訊欄（血量、費洛蒙能量、糖分數量、關卡提示）與開始/遊戲結束畫面。
*   `[NEW]` [index.css](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/index.css): 現代暗色調與螢光風格設計，採用毛玻璃效果 (Glassmorphism) 與流暢的微動畫。

### 2. 核心邏輯模組
*   `[NEW]` [js/map.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/map.js):
    *   **迷宮生成**：使用隨機深度優先搜尋 (DFS) 演算法生成 $25 \times 25$（或可調）的網格迷宮。
    *   **費洛蒙矩陣**：地圖每個網格包含費洛蒙強度值（0.0 至 1.0），每幀以固定比例衰減。
    *   **戰爭迷霧**：二維陣列記錄每個網格的探索狀態。玩家周圍半徑 3 格內為完全可見，已探索區域為半透明，未探索區域為全黑。
*   `[NEW]` [js/entities.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/entities.js):
    *   **玩家 (Player)**：記錄位置、血量、費洛蒙能量。能量不足時無法釋放費洛蒙。
    *   **兵蟻 (Soldier Ant)**：
        *   平時在無霧區域巡邏，若玩家進入視線且無牆阻擋，轉為「追擊」狀態並用 A* 尋找玩家。
        *   若探測到鄰近網格有費洛蒙，則會優先轉向費洛蒙最強的相鄰網格（誤導狀態），並清除追擊目標。
    *   **蟻后 (Queen)**：
        *   靜止於地圖右下角的巢穴中，被 3 個能量節點環繞。
        *   玩家需站在節點上消耗費洛蒙能量進行「氣味中和」，三個節點均完成後解鎖蟻后防護罩。
*   `[NEW]` [js/renderer.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/renderer.js):
    *   繪製網格地圖、牆壁細節（帶有土壤紋理的暗色調）。
    *   繪製玩家、兵蟻（紅色發光圈）、蟻后（紫色護罩）。
    *   繪製費洛蒙的綠色螢光粒子擴散效果。
    *   繪製戰爭迷霧遮罩。
*   `[NEW]` [js/game.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/game.js):
    *   主遊戲循環 (`requestAnimationFrame`)。
    *   鍵盤輸入監聽器。
    *   碰撞檢測（玩家與兵蟻、玩家與糖分、玩家與蟻后/節點）。
    *   遊戲勝負判定與畫面切換。

---

## 驗證計畫

### 手動驗證步驟
1. **地圖與迷霧驗證**：確認每次重新整理遊戲時會生成不同的迷宮，且未走過的區域會被戰爭迷霧遮蓋。
2. **費洛蒙與 AI 驗證**：
   *   引誘兵蟻：故意走到兵蟻前方引發追擊，接著在轉角釋放費洛蒙並逃跑，確認兵蟻是否會停留在費洛蒙處或沿費洛蒙反向走，而非繼續追擊玩家。
   *   能量消耗：確認釋放費洛蒙時，能量條會下降；收集糖分結晶時，能量會增加。
3. **勝利與失敗判定**：
   *   失敗：被兵蟻碰撞 3 次，確認是否彈出 Game Over 畫面。
   *   勝利：觸發 3 個蟻后防護節點並解除防護罩後，接近蟻后，確認是否能順利獲勝並顯示通關畫面。
