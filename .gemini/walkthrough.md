# 專案導覽：入侵蟻：蟻巢潛入戰 (Intruder Ant: Nest Infiltration)

本專案已順利實作完成，我們在 [delightful-galileo](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo) 目錄中建立了一款純 JavaScript 與 Canvas 繪製的 2D 網格制隱蔽策略遊戲。

## 實作成效

我們實作了以下檔案：
1. **[index.html](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/index.html)**：遊戲的主入口，包含 HUD（生命值、費洛蒙能量、糖分計數、防護節點進度）與開始/遊戲結束畫面。
2. **[index.css](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/index.css)**：毛玻璃面板與動態霓虹暗色調樣式。已將遊戲畫面寬度定為 642px、高度定為 830px，確保 600px * 600px 的 Canvas 畫面完整呈現而不被裁切。
3. **[js/map.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/map.js)**：
   * 隨機 DFS 迷宮生成，並實作 **Braid 織網演算法**（隨機打破 22% 的牆壁），消除單一路徑以創造豐富的環路與分岔，提升引誘兵蟻的策略性。
   * 費洛蒙二維強度矩陣（每幀衰減）。
   * 採用 Bresenham 射線檢測的真實戰爭迷霧系統（遮擋視線後方的物件）。
4. **[js/entities.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/entities.js)**：
   * `Player` 類別：管理生命值與費洛蒙計量。
   * `Soldier` AI 類別：包含「巡邏」、「偵測費洛蒙以誤導」、「A* 追擊玩家」的狀態機。
   * `Queen` 類別：管理靜止的蟻后與 3 個周遭費洛蒙充能節點。
5. **[js/renderer.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/renderer.js)**：
   * 渲染亮黃色玩家、紅色兵蟻（帶警告光圈）與紫色蟻后（帶力場防護罩）。
   * 精緻的螢光綠費洛蒙微光粒子系統與金黃糖分漂浮動畫。
6. **[js/game.js](file:///C:/Users/10110012/Documents/antigravity/delightful-galileo/js/game.js)**：
   * 主遊戲循環 (`requestAnimationFrame`)。
   * 鍵盤輸入監聽與碰撞檢測（兵蟻撞擊、糖分收集、節點充能、擊敗蟻后）。

---

## 驗證與測試說明

本地開發伺服器已在背景啟動。

* **連結網址**：[http://localhost:8085](http://localhost:8085)
* **控制方式**：
  * 使用 `W`、`A`、`S`、`D` 或**方向鍵**移動。
  * 按下**空白鍵 (Space)** 釋放費洛蒙。
* **遊玩攻略**：
  1. 觀察兵蟻的警戒圈。若兵蟻快追上你，按下**空白鍵**釋放費洛蒙，然後迅速轉彎。兵蟻走到費洛蒙處後會被誤導而順著氣味往別的方向走。
  2. 沿途收集發光的糖分結晶，這會回復你的費洛蒙能量。
  3. 摸索到地圖右下角的紫色蟻后巢穴。
  4. 站在蟻后巢穴邊界的三個標記「1、2、3」的節點上，分別按下**空白鍵**，消耗費洛蒙能量為節點充能至 100%。
  5. 三個節點均完成充能後，蟻后的防護罩便會解鎖。此時走上前接觸蟻后，即可獲勝！
