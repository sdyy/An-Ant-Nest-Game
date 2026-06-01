/**
 * game.js - 遊戲主循環、狀態控制、輸入管理與碰撞檢測
 */

class GameController {
    constructor() {
        this.map = null;
        this.player = null;
        this.soldiers = [];
        this.queen = null;
        this.renderer = null;

        // 遊戲狀態：'START', 'PLAYING', 'GAMEOVER', 'WIN'
        this.gameState = 'START';
        
        // 統計數據
        this.sugarsCollected = 0;
        this.totalPheromonesUsed = 0;

        // DOM 元素
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.endScreen = document.getElementById('end-screen');
        
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');

        this.lifeContainer = document.getElementById('life-container');
        this.sugarCountLabel = document.getElementById('sugar-count');
        this.energyFill = document.getElementById('energy-fill');
        this.energyPercentage = document.getElementById('energy-percentage');

        this.endTitle = document.getElementById('end-title');
        this.endMessage = document.getElementById('end-message');
        this.statSugars = document.getElementById('stat-sugars');
        this.statPheromones = document.getElementById('stat-pheromones');

        this.initEvents();
    }

    initEvents() {
        // 按鈕監聽
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.startGame());

        // 鍵盤監聽
        window.addEventListener('keydown', (e) => this.handleInput(e));
    }

    startGame() {
        // 1. 初始化資料與實體
        this.map = new GameMap(25, 25);
        this.player = new Player(1, 1);
        this.queen = new Queen(25, 25);
        this.renderer = new GameRenderer('game-canvas');
        this.soldiers = [];
        
        this.sugarsCollected = 0;
        this.totalPheromonesUsed = 0;

        // 2. 在迷宮中隨機生成 5 隻兵蟻，避開起點與終點
        this.spawnSoldiers(5);

        // 3. 初始更新戰爭迷霧
        this.map.updateFogOfWar(this.player.x, this.player.y);

        // 4. 切換畫面
        this.gameState = 'PLAYING';
        this.startScreen.classList.remove('active');
        this.endScreen.classList.remove('active');
        this.gameScreen.classList.add('active');

        // 5. 更新 HUD
        this.updateHUD();

        // 6. 啟動遊戲循環
        this.gameLoop();
    }

    spawnSoldiers(count) {
        let spawned = 0;
        let attempts = 0;
        
        while (spawned < count && attempts < 500) {
            attempts++;
            const rx = Math.floor(Math.random() * (this.map.cols - 2)) + 1;
            const ry = Math.floor(Math.random() * (this.map.rows - 2)) + 1;

            // 避開玩家起點 5x5 與 蟻后巢穴 7x7
            const inStartArea = rx < 5 && ry < 5;
            const inQueenArea = rx > this.map.cols - 8 && ry > this.map.rows - 8;

            if (this.map.grid[ry][rx] === TILE_TYPES.PATH && !inStartArea && !inQueenArea) {
                // 確保同位置沒有其他兵蟻
                if (!this.soldiers.some(s => s.x === rx && s.y === ry)) {
                    this.soldiers.push(new Soldier(rx, ry));
                    spawned++;
                }
            }
        }
    }

    handleInput(e) {
        if (this.gameState !== 'PLAYING') return;

        let moved = false;
        let dx = 0;
        let dy = 0;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                dy = -1;
                moved = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                dy = 1;
                moved = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                dx = -1;
                moved = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                dx = 1;
                moved = true;
                break;
            case ' ': // 空白鍵：釋放費洛蒙 / 幫節點充能
                this.handlePheromoneRelease();
                break;
        }

        if (moved) {
            const success = this.player.move(dx, dy, this.map);
            if (success) {
                // 移動成功後立即更新迷霧，避免視覺殘留
                this.map.updateFogOfWar(this.player.x, this.player.y);
                // 檢查是否收集到糖分
                this.checkSugarCollision();
                // 檢查是否接觸蟻后
                this.checkQueenCollision();
                // 檢查是否碰到兵蟻
                this.checkSoldierCollision();
            }
        }
    }

    handlePheromoneRelease() {
        // 1. 檢查玩家是否站在防護罩節點上
        const currentNode = this.queen.nodes.find(n => n.x === this.player.x && n.y === this.player.y);

        if (currentNode) {
            // 站在節點上：嘗試幫節點充能
            if (this.player.pheromone >= this.player.pheromoneUseRate && !currentNode.completed) {
                this.player.pheromone -= this.player.pheromoneUseRate;
                this.queen.chargeNode(currentNode.id, 25);
                this.totalPheromonesUsed++;

                // 產生美麗的充能粒子特效
                for (let i = 0; i < 15; i++) {
                    this.renderer.spawnParticle(
                        this.player.x * this.renderer.tileSize + this.renderer.tileSize / 2,
                        this.player.y * this.renderer.tileSize + this.renderer.tileSize / 2,
                        '#bd00ff', // 紫色能量粒子
                        0.8 + Math.random() * 1.2
                    );
                }
                
                this.updateHUD();
            }
        } else {
            // 一般格子上：釋放費洛蒙引開兵蟻
            const released = this.player.releasePheromone(this.map);
            if (released) {
                this.totalPheromonesUsed++;

                // 產生費洛蒙釋放特效粒子
                for (let i = 0; i < 10; i++) {
                    this.renderer.spawnParticle(
                        this.player.x * this.renderer.tileSize + this.renderer.tileSize / 2,
                        this.player.y * this.renderer.tileSize + this.renderer.tileSize / 2,
                        '#39ff14', // 螢光綠粒子
                        0.5 + Math.random() * 1.0
                    );
                }

                this.updateHUD();
            }
        }
    }

    checkSugarCollision() {
        const index = this.map.sugars.findIndex(s => s.x === this.player.x && s.y === this.player.y);
        if (index !== -1) {
            this.map.sugars.splice(index, 1);
            this.sugarsCollected++;
            
            // 回復費洛蒙能量 (最多到100)
            this.player.pheromone = Math.min(this.player.maxPheromone, this.player.pheromone + 30);

            // 生成金黃色收集粒子
            for (let i = 0; i < 8; i++) {
                this.renderer.spawnParticle(
                    this.player.x * this.renderer.tileSize + this.renderer.tileSize / 2,
                    this.player.y * this.renderer.tileSize + this.renderer.tileSize / 2,
                    '#ffd000',
                    0.6 + Math.random() * 0.8
                );
            }

            this.updateHUD();
        }
    }

    checkSoldierCollision() {
        const hit = this.soldiers.some(s => s.x === this.player.x && s.y === this.player.y);
        if (hit) {
            // 扣除生命
            this.player.lives--;

            // 受傷粒子爆炸 (紅色)
            for (let i = 0; i < 20; i++) {
                this.renderer.spawnParticle(
                    this.player.x * this.renderer.tileSize + this.renderer.tileSize / 2,
                    this.player.y * this.renderer.tileSize + this.renderer.tileSize / 2,
                    '#ff3344',
                    0.8 + Math.random() * 1.5
                );
            }

            this.updateHUD();

            if (this.player.lives <= 0) {
                this.endGame(false);
            } else {
                // 重置玩家到起點安全區
                this.player.x = 1;
                this.player.y = 1;
                this.map.updateFogOfWar(this.player.x, this.player.y);
            }
        }
    }

    checkQueenCollision() {
        // 如果玩家與蟻后重合或相鄰
        const dx = Math.abs(this.player.x - this.queen.x);
        const dy = Math.abs(this.player.y - this.queen.y);

        if (dx <= 1 && dy <= 1) {
            if (!this.queen.shieldActive) {
                // 防護罩解鎖，玩家成功擊敗蟻后獲勝！
                this.endGame(true);
            }
        }
    }

    updateHUD() {
        // 1. 更新血量 (Heart icons)
        const hearts = this.lifeContainer.children;
        for (let i = 0; i < 3; i++) {
            if (i < this.player.lives) {
                hearts[i].classList.add('active');
            } else {
                hearts[i].classList.remove('active');
            }
        }

        // 2. 更新糖分收集數
        this.sugarCountLabel.textContent = this.sugarsCollected;

        // 3. 更新費洛蒙進度條與數值
        const pPercent = Math.floor(this.player.pheromone);
        this.energyFill.style.width = `${pPercent}%`;
        this.energyPercentage.textContent = `${pPercent}%`;

        // 4. 更新防護罩節點燈
        for (let i = 0; i < 3; i++) {
            const nodeDom = document.getElementById(`node-${i}`);
            const nodeData = this.queen.nodes[i];
            
            nodeDom.classList.remove('active', 'completed');
            if (nodeData.completed) {
                nodeDom.classList.add('completed');
                nodeDom.textContent = '✔';
            } else if (nodeData.charge > 0) {
                nodeDom.classList.add('active');
                nodeDom.textContent = `${nodeData.charge}%`;
            } else {
                nodeDom.textContent = `${i + 1}`;
            }
        }
    }

    gameLoop() {
        if (this.gameState !== 'PLAYING') return;

        // 1. 更新玩家狀態（能量慢慢恢復）
        this.player.update();

        // 2. 地圖費洛蒙衰減
        this.map.decayPheromones(0.003); // 每影格揮發 0.003

        // 3. 更新所有兵蟻 AI
        for (const soldier of this.soldiers) {
            soldier.update(this.map, this.player);
        }

        // 4. 偵測移動後兵蟻撞擊玩家
        this.checkSoldierCollision();

        // 5. 渲染畫面
        this.renderer.render(this.map, this.player, this.soldiers, this.queen);

        // 6. 更新 HUD 面板數值 (費洛蒙進度條會因為緩慢恢復而變動)
        this.updateHUD();

        // 繼續下一次循環
        requestAnimationFrame(() => this.gameLoop());
    }

    endGame(isWin) {
        this.gameState = isWin ? 'WIN' : 'GAMEOVER';
        
        // 切換 UI 面板
        this.gameScreen.classList.remove('active');
        this.endScreen.classList.add('active');

        // 設定結算文字與數據
        if (isWin) {
            this.endScreen.className = 'screen active'; // win 主題
            this.endTitle.textContent = '潛入成功';
            this.endTitle.className = 'end-title-win';
            this.endMessage.textContent = '你成功破解了所有防護節點，並順利擊敗敵方蟻后！';
        } else {
            this.endScreen.className = 'screen active lose'; // lose 主題
            this.endTitle.textContent = '潛入失敗';
            this.endTitle.className = 'end-title-lose';
            this.endMessage.textContent = '你被敵方兵蟻發現並撕咬致死，功敗垂成。';
        }

        this.statSugars.textContent = this.sugarsCollected;
        this.statPheromones.textContent = this.totalPheromonesUsed;
    }
}

// 頁面載入後自動初始化控制器
window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
