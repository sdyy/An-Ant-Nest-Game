/**
 * entities.js - 遊戲角色實體與 AI、A* 尋路演算法
 */

// A* 尋路演算法
function findAStarPath(map, startX, startY, endX, endY) {
    if (startX === endX && startY === endY) return [];

    const openList = [];
    const closedSet = new Set();

    const startNode = {
        x: startX,
        y: startY,
        g: 0,
        h: Math.abs(endX - startX) + Math.abs(endY - startY),
        parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    const getHash = (x, y) => `${x},${y}`;

    while (openList.length > 0) {
        // 找到 f 最小的節點
        openList.sort((a, b) => a.f - b.f);
        const current = openList.shift();

        if (current.x === endX && current.y === endY) {
            // 重建路徑
            const path = [];
            let temp = current;
            while (temp.parent) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedSet.add(getHash(current.x, current.y));

        // 檢查鄰居 (4方向)
        const neighbors = [
            { x: current.x, y: current.y - 1 },
            { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x - 1, y: current.y }
        ];

        for (const neighbor of neighbors) {
            if (!map.isWalkable(neighbor.x, neighbor.y)) continue;
            if (closedSet.has(getHash(neighbor.x, neighbor.y))) continue;

            const gScore = current.g + 1;
            let neighborNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

            if (!neighborNode) {
                neighborNode = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: gScore,
                    h: Math.abs(endX - neighbor.x) + Math.abs(endY - neighbor.y),
                    parent: current
                };
                neighborNode.f = neighborNode.g + neighborNode.h;
                openList.push(neighborNode);
            } else if (gScore < neighborNode.g) {
                neighborNode.g = gScore;
                neighborNode.f = neighborNode.g + neighborNode.h;
                neighborNode.parent = current;
            }
        }
    }

    return []; // 找不到路徑
}

// 玩家類別
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.lives = 3;
        this.maxPheromone = 100;
        this.pheromone = 100; // 目前費洛蒙能量
        this.pheromoneUseRate = 18; // 每次釋放消耗能量
        this.pheromoneRecoverRate = 0.08; // 每幀回復能量
    }

    move(dx, dy, map) {
        const nextX = this.x + dx;
        const nextY = this.y + dy;
        if (map.isWalkable(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
            return true;
        }
        return false;
    }

    releasePheromone(map) {
        if (this.pheromone >= this.pheromoneUseRate) {
            this.pheromone -= this.pheromoneUseRate;
            map.addPheromone(this.x, this.y, 1.0); // 在當前格子添加強度為 1.0 的費洛蒙
            return true;
        }
        return false;
    }

    update() {
        // 隨時間緩慢恢復費洛蒙能量
        this.pheromone = Math.min(this.maxPheromone, this.pheromone + this.pheromoneRecoverRate);
    }
}

// 兵蟻 AI
class Soldier {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = 'PATROL'; // 'PATROL', 'CHASE', 'DISTRACTED'
        this.viewRadius = 5.0; // 視野半徑
        
        // 巡邏方向：北(0), 東(1), 南(2), 西(3)
        this.patrolDir = Math.floor(Math.random() * 4);
        
        // 移動冷卻計時器 (讓兵蟻每隔固定幀數移動一格，避免移動過快)
        this.moveCooldownMax = 18; // 幀數間隔 (約 0.3 秒移動一格)
        this.moveCooldown = Math.floor(Math.random() * this.moveCooldownMax); // 隨機初始，避免所有兵蟻同步移動
        
        this.path = []; // 用於追擊或誤導的路徑
        this.alertLevel = 0.0; // 0.0 ~ 1.0 用於視覺警告特效
    }

    update(map, player) {
        // 警示度平滑過渡
        if (this.state === 'CHASE') {
            this.alertLevel = Math.min(1.0, this.alertLevel + 0.1);
        } else {
            this.alertLevel = Math.max(0.0, this.alertLevel - 0.05);
        }

        if (this.moveCooldown > 0) {
            this.moveCooldown--;
            return;
        }
        this.moveCooldown = this.moveCooldownMax;

        // 1. 檢查周圍是否有費洛蒙（誤導檢測優先）
        const pheromoneTarget = this.scanForPheromones(map);
        if (pheromoneTarget) {
            this.state = 'DISTRACTED';
            // 朝費洛蒙最高的方向走一格
            this.moveTowards(pheromoneTarget.x, pheromoneTarget.y, map);
            return;
        }

        // 2. 檢查玩家是否在視線範圍內
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        const hasSight = distToPlayer <= this.viewRadius && map.hasLineOfSight(this.x, this.y, player.x, player.y);

        if (hasSight) {
            this.state = 'CHASE';
            // 使用 A* 尋路追擊玩家
            this.path = findAStarPath(map, this.x, this.y, player.x, player.y);
            if (this.path.length > 0) {
                const nextStep = this.path[0];
                this.x = nextStep.x;
                this.y = nextStep.y;
            }
        } else {
            // 3. 巡邏模式
            this.state = 'PATROL';
            this.patrolBehavior(map);
        }
    }

    // 掃描上下左右格子是否有費洛蒙，若有，傳回費洛蒙值最高的鄰格
    scanForPheromones(map) {
        const dirs = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 }
        ];

        let bestTarget = null;
        let maxPheromone = 0.15; // 費洛蒙必須大於此閾值才會引起注意

        // 檢查上下左右 4 格
        for (const d of dirs) {
            const tx = this.x + d.x;
            const ty = this.y + d.y;

            if (map.isWalkable(tx, ty)) {
                const val = map.pheromoneGrid[ty][tx];
                if (val > maxPheromone) {
                    maxPheromone = val;
                    bestTarget = { x: tx, y: ty };
                }
            }
        }

        return bestTarget;
    }

    // 朝著目標格移動一格
    moveTowards(tx, ty, map) {
        if (map.isWalkable(tx, ty)) {
            this.x = tx;
            this.y = ty;
        }
    }

    // 巡邏行為：直行，撞牆後隨機轉彎
    patrolBehavior(map) {
        const dirs = [
            { x: 0, y: -1 }, // 北
            { x: 1, y: 0 },  // 東
            { x: 0, y: 1 },  // 南
            { x: -1, y: 0 }  // 西
        ];

        // 嘗試沿當前方向移動
        let d = dirs[this.patrolDir];
        let nextX = this.x + d.x;
        let nextY = this.y + d.y;

        if (map.isWalkable(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // 撞牆，挑選所有可通行的方向
            const possibleDirs = [];
            for (let i = 0; i < 4; i++) {
                const testD = dirs[i];
                if (map.isWalkable(this.x + testD.x, this.y + testD.y)) {
                    possibleDirs.push(i);
                }
            }

            if (possibleDirs.length > 0) {
                // 優先選擇不往回走的方向（若有多個選擇）
                const oppositeDir = (this.patrolDir + 2) % 4;
                const forwardDirs = possibleDirs.filter(dIdx => dIdx !== oppositeDir);
                
                if (forwardDirs.length > 0) {
                    this.patrolDir = forwardDirs[Math.floor(Math.random() * forwardDirs.length)];
                } else {
                    this.patrolDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                }

                // 立即移動
                const finalD = dirs[this.patrolDir];
                this.x += finalD.x;
                this.y += finalD.y;
            }
        }
    }
}

// 蟻后與護衛節點
class Queen {
    constructor(cols, rows) {
        // 蟻后固定在右下角房間的中央
        this.x = cols - 3;
        this.y = rows - 3;
        this.shieldActive = true;
        
        // 三個防護節點，位於蟻后巢穴的周圍邊界
        this.nodes = [
            { id: 0, x: cols - 6, y: rows - 4, charge: 0, completed: false }, // 左節點
            { id: 1, x: cols - 4, y: rows - 6, charge: 0, completed: false }, // 上節點
            { id: 2, x: cols - 6, y: rows - 6, charge: 0, completed: false }  // 左上節點
        ];
    }

    // 充能節點 (玩家站在節點上釋放費洛蒙時觸發)
    chargeNode(nodeId, amount = 25) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node && !node.completed) {
            node.charge = Math.min(100, node.charge + amount);
            if (node.charge >= 100) {
                node.completed = true;
                this.checkShieldStatus();
            }
            return true;
        }
        return false;
    }

    // 檢查防護罩狀態
    checkShieldStatus() {
        // 若三個節點都完成，則解除防護罩
        this.shieldActive = !this.nodes.every(n => n.completed);
    }
}
