/**
 * map.js - 迷宮地圖、費洛蒙矩陣與戰爭迷霧系統
 */

const TILE_TYPES = {
    PATH: 0,
    WALL: 1
};

const FOG_TYPES = {
    UNEXPLORED: 0,  // 全黑
    EXPLORED: 1,    // 半透明
    VISIBLE: 2      // 全亮
};

class GameMap {
    constructor(cols, rows) {
        this.cols = cols; // 必須為單數以配合 DFS
        this.rows = rows; // 必須為單數以配合 DFS
        this.grid = [];   // 二維陣列：1 代表牆壁，0 代表通道
        this.pheromoneGrid = []; // 二維陣列：0.0 ~ 1.0 的費洛蒙值
        this.fogGrid = [];       // 二維陣列：記錄戰爭迷霧狀態
        this.sugars = [];        // 糖分座標陣列 [{x, y}]
        
        this.initialize();
    }

    initialize() {
        // 1. 初始化地圖與費洛蒙/迷霧矩陣
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.pheromoneGrid[y] = [];
            this.fogGrid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = TILE_TYPES.WALL;
                this.pheromoneGrid[y][x] = 0.0;
                this.fogGrid[y][x] = FOG_TYPES.UNEXPLORED;
            }
        }

        // 2. 使用隨機 DFS 生成迷宮
        this.generateMaze(1, 1);

        // 3. 隨機打破一些牆壁以創造環路與分岔路 (Braiding the maze)
        this.braidMaze(0.22);

        // 4. 清理起點安全區 (左上角 3x3)
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 3; x++) {
                if (x < this.cols - 1 && y < this.rows - 1) {
                    this.grid[y][x] = TILE_TYPES.PATH;
                }
            }
        }

        // 5. 建立蟻后巢穴 (右下角 5x5 大房間)
        const qSize = 5;
        const qStartX = this.cols - 1 - qSize;
        const qStartY = this.rows - 1 - qSize;
        for (let y = qStartY; y < this.rows - 1; y++) {
            for (let x = qStartX; x < this.cols - 1; x++) {
                this.grid[y][x] = TILE_TYPES.PATH;
            }
        }

        // 確保蟻后房間與主迷宮打通
        this.grid[qStartY][qStartX - 1] = TILE_TYPES.PATH;
        this.grid[qStartY - 1][qStartX] = TILE_TYPES.PATH;

        // 6. 生成糖分結晶
        this.generateSugars(15); // 生成 15 顆糖分
    }

    // 隨機打破隔開通道的牆壁，增加分岔與環路複雜度
    braidMaze(chance = 0.22) {
        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                if (this.grid[y][x] === TILE_TYPES.WALL) {
                    // 檢查打破這面牆是否能連通左右通道，或上下通道
                    const horizontalPath = (this.grid[y][x - 1] === TILE_TYPES.PATH && this.grid[y][x + 1] === TILE_TYPES.PATH);
                    const verticalPath = (this.grid[y - 1][x] === TILE_TYPES.PATH && this.grid[y + 1][x] === TILE_TYPES.PATH);

                    if (horizontalPath || verticalPath) {
                        // 排除起點安全區和蟻后巢穴，保護特定房間佈局
                        const isInStartArea = x < 4 && y < 4;
                        const isInQueenArea = x > this.cols - 7 && y > this.rows - 7;
                        
                        if (!isInStartArea && !isInQueenArea) {
                            if (Math.random() < chance) {
                                this.grid[y][x] = TILE_TYPES.PATH;
                            }
                        }
                    }
                }
            }
        }
    }

    // 隨機 DFS 迷宮生成演算法
    generateMaze(cx, cy) {
        this.grid[cy][cx] = TILE_TYPES.PATH;

        // 隨機方向
        const dirs = [
            [0, -2], // 北
            [2, 0],  // 東
            [0, 2],  // 南
            [-2, 0]  // 西
        ];
        this.shuffle(dirs);

        for (let i = 0; i < dirs.length; i++) {
            const nx = cx + dirs[i][0];
            const ny = cy + dirs[i][1];

            if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1) {
                if (this.grid[ny][nx] === TILE_TYPES.WALL) {
                    // 打通中間的牆壁
                    this.grid[cy + dirs[i][1] / 2][cx + dirs[i][0] / 2] = TILE_TYPES.PATH;
                    this.generateMaze(nx, ny);
                }
            }
        }
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 隨機在通道上生成糖分
    generateSugars(count) {
        this.sugars = [];
        let attempts = 0;
        while (this.sugars.length < count && attempts < 200) {
            attempts++;
            const rx = Math.floor(Math.random() * (this.cols - 2)) + 1;
            const ry = Math.floor(Math.random() * (this.rows - 2)) + 1;

            // 確保生成在通道上，且不是在玩家起點安全區 (x<4, y<4)，也不是在蟻后巢穴 (右下角)
            const isInStartArea = rx < 4 && ry < 4;
            const isInQueenChamber = rx > this.cols - 7 && ry > this.rows - 7;
            
            if (this.grid[ry][rx] === TILE_TYPES.PATH && !isInStartArea && !isInQueenChamber) {
                // 確保不重疊
                if (!this.sugars.some(s => s.x === rx && s.y === ry)) {
                    this.sugars.push({ x: rx, y: ry });
                }
            }
        }
    }

    // 費洛蒙更新：揮發/衰減
    decayPheromones(decayRate = 0.005) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.pheromoneGrid[y][x] > 0) {
                    this.pheromoneGrid[y][x] -= decayRate;
                    if (this.pheromoneGrid[y][x] < 0.01) {
                        this.pheromoneGrid[y][x] = 0;
                    }
                }
            }
        }
    }

    // 釋放費洛蒙
    addPheromone(x, y, amount = 0.3) {
        if (this.isWalkable(x, y)) {
            this.pheromoneGrid[y][x] = Math.min(1.0, this.pheromoneGrid[y][x] + amount);
        }
    }

    // 判斷是否可通行
    isWalkable(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
        return this.grid[y][x] === TILE_TYPES.PATH;
    }

    // 更新戰爭迷霧 (使用 Bresenham 射線檢測)
    updateFogOfWar(playerX, playerY, viewRadius = 3.5) {
        // 先將前次 VISIBLE (2) 變更為 EXPLORED (1)
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.fogGrid[y][x] === FOG_TYPES.VISIBLE) {
                    this.fogGrid[y][x] = FOG_TYPES.EXPLORED;
                }
            }
        }

        // 以玩家為中心進行射線檢測，計算半徑內的能見度
        const radiusSq = viewRadius * viewRadius;
        const startY = Math.max(0, Math.floor(playerY - viewRadius));
        const endY = Math.min(this.rows - 1, Math.ceil(playerY + viewRadius));
        const startX = Math.max(0, Math.floor(playerX - viewRadius));
        const endX = Math.min(this.cols - 1, Math.ceil(playerX + viewRadius));

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const dx = x - playerX;
                const dy = y - playerY;
                const distSq = dx * dx + dy * dy;

                if (distSq <= radiusSq) {
                    // 若在半徑內，進行視線檢測 (是否有牆阻擋)
                    if (this.hasLineOfSight(playerX, playerY, x, y)) {
                        this.fogGrid[y][x] = FOG_TYPES.VISIBLE;
                    }
                }
            }
        }
    }

    // Bresenham 視線檢測 (判斷兩點間是否無牆壁阻隔)
    hasLineOfSight(x0, y0, x1, y1) {
        // 鄰空格子直接可見
        if (Math.abs(x0 - x1) <= 1 && Math.abs(y0 - y1) <= 1) return true;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        let x = x0;
        let y = y0;

        while (true) {
            if (x === x1 && y === y1) return true;

            // 檢查當前格子（起點除外）是否為牆
            if ((x !== x0 || y !== y0) && this.grid[y][x] === TILE_TYPES.WALL) {
                return false;
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }
}
