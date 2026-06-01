/**
 * renderer.js - 遊戲 Canvas 渲染模組，包含動態粒子特效與發光霓虹效果
 */

class GameRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 畫布基礎尺寸設定
        this.cols = 25;
        this.rows = 25;
        this.tileSize = 24; // 單一網格的像素大小
        
        this.canvas.width = this.cols * this.tileSize;
        this.canvas.height = this.rows * this.tileSize;

        // 特效粒子系統
        this.particles = [];
        
        // 用於動畫的計時變數
        this.animFrame = 0;
    }

    render(map, player, soldiers, queen) {
        this.animFrame++;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. 繪製迷宮背景與通道/牆壁
        this.drawMap(map);

        // 2. 繪製費洛蒙與其微光粒子
        this.drawPheromones(map);

        // 3. 繪製收集品（糖分）
        this.drawSugars(map);

        // 4. 繪製防護罩節點
        this.drawQueenNodes(queen);

        // 5. 繪製蟻后
        this.drawQueen(queen);

        // 6. 繪製兵蟻
        this.drawSoldiers(soldiers);

        // 7. 繪製玩家（主角）
        this.drawPlayer(player);

        // 8. 更新並繪製動態粒子
        this.drawParticles();

        // 9. 覆蓋戰爭迷霧
        this.drawFogOfWar(map);
    }

    // 繪製地圖地形
    drawMap(map) {
        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (map.grid[y][x] === TILE_TYPES.WALL) {
                    // 牆壁：深褐色，泥土斑點質感
                    this.ctx.fillStyle = '#21150f';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    
                    // 邊線，增加浮雕感
                    this.ctx.strokeStyle = '#322017';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);

                    // 土壤雜點
                    this.ctx.fillStyle = '#170e0a';
                    if ((x + y) % 3 === 0) {
                        this.ctx.fillRect(px + 4, py + 4, 3, 3);
                    }
                    if ((x * y) % 5 === 1) {
                        this.ctx.fillRect(px + 14, py + 12, 2, 2);
                    }
                } else {
                    // 通道：極深褐色底色
                    this.ctx.fillStyle = '#0a0705';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }
    }

    // 繪製費洛蒙微光效果與生成上升微光粒子
    drawPheromones(map) {
        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                const intensity = map.pheromoneGrid[y][x];
                if (intensity > 0) {
                    const px = x * this.tileSize;
                    const py = y * this.tileSize;

                    // 漸層填滿費洛蒙網格
                    this.ctx.fillStyle = `rgba(57, 255, 20, ${intensity * 0.25})`;
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

                    // 隨機在有費洛蒙的格子生成擴散粒子
                    if (Math.random() < 0.05 * intensity) {
                        this.spawnParticle(
                            px + Math.random() * this.tileSize,
                            py + Math.random() * this.tileSize,
                            '#39ff14',
                            0.5 + Math.random() * 0.8
                        );
                    }
                }
            }
        }
    }

    // 繪製糖分結晶（浮動金黃微光）
    drawSugars(map) {
        const floatOffset = Math.sin(this.animFrame * 0.08) * 2;
        this.ctx.save();
        
        for (const sugar of map.sugars) {
            // 檢查迷霧狀態，只有探索過的才繪製
            if (map.fogGrid[sugar.y][sugar.x] === FOG_TYPES.UNEXPLORED) continue;

            const cx = sugar.x * this.tileSize + this.tileSize / 2;
            const cy = sugar.y * this.tileSize + this.tileSize / 2 + floatOffset;

            // 繪製糖分發光效果
            const grad = this.ctx.createRadialGradient(cx, cy, 1, cx, cy, 8);
            grad.addColorStop(0, 'rgba(255, 230, 100, 1)');
            grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
            grad.addColorStop(1, 'rgba(255, 200, 0, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            this.ctx.fill();

            // 實體小稜鏡結晶
            this.ctx.fillStyle = '#fff7cc';
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy - 4);
            this.ctx.lineTo(cx + 3, cy);
            this.ctx.lineTo(cx, cy + 4);
            this.ctx.lineTo(cx - 3, cy);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    // 繪製玩家（亮黃色精緻螞蟻）
    drawPlayer(player) {
        const cx = player.x * this.tileSize + this.tileSize / 2;
        const cy = player.y * this.tileSize + this.tileSize / 2;

        this.ctx.save();

        // 1. 底層發光圈
        const grad = this.ctx.createRadialGradient(cx, cy, 2, cx, cy, 12);
        grad.addColorStop(0, 'rgba(255, 208, 0, 0.6)');
        grad.addColorStop(1, 'rgba(255, 208, 0, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. 螞蟻身體繪製 (黃色)
        this.ctx.fillStyle = '#ffd000';
        
        // 腹部 (後)
        this.ctx.beginPath();
        this.ctx.arc(cx - 4, cy, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 胸部 (中)
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        this.ctx.fill();

        // 頭部 (前)
        this.ctx.beginPath();
        this.ctx.arc(cx + 3, cy, 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 觸角
        this.ctx.strokeStyle = '#ffe259';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(cx + 4.5, cy - 1);
        this.ctx.quadraticCurveTo(cx + 7, cy - 3, cx + 8, cy - 2);
        this.ctx.moveTo(cx + 4.5, cy + 1);
        this.ctx.quadraticCurveTo(cx + 7, cy + 3, cx + 8, cy + 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // 繪製兵蟻（帶紅色警告光圈）
    drawSoldiers(soldiers) {
        this.ctx.save();

        for (const soldier of soldiers) {
            const cx = soldier.x * this.tileSize + this.tileSize / 2;
            const cy = soldier.y * this.tileSize + this.tileSize / 2;

            // 1. 警戒紅光圈 (追擊狀態時光圈會震盪)
            const alertPulse = Math.sin(this.animFrame * 0.15) * 3 * soldier.alertLevel;
            const radius = 14 + alertPulse;
            
            const grad = this.ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
            const alpha = 0.2 + 0.4 * soldier.alertLevel;
            grad.addColorStop(0, `rgba(255, 51, 68, ${alpha})`);
            grad.addColorStop(1, 'rgba(255, 51, 68, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // 若警示度高，繪製外圍警告框
            if (soldier.alertLevel > 0.3) {
                this.ctx.strokeStyle = `rgba(255, 51, 68, ${soldier.alertLevel * 0.7})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }

            // 2. 兵蟻實體身體 (深紅色)
            this.ctx.fillStyle = '#ff2233';
            
            // 巨型大顎 (兵蟻特徵)
            this.ctx.strokeStyle = '#9e000e';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            // 左大顎
            this.ctx.arc(cx + 6, cy - 2, 3, Math.PI * 1.2, Math.PI * 1.8, false);
            this.ctx.stroke();
            // 右大顎
            this.ctx.arc(cx + 6, cy + 2, 3, Math.PI * 0.2, Math.PI * 0.8, true);
            this.ctx.stroke();

            // 腹部 (後)
            this.ctx.beginPath();
            this.ctx.arc(cx - 5, cy, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 胸部 (中)
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 頭部 (前)
            this.ctx.beginPath();
            this.ctx.arc(cx + 4, cy, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // 兵蟻雙眼 (發光黃點)
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillRect(cx + 5, cy - 1.5, 1, 1);
            this.ctx.fillRect(cx + 5, cy + 0.5, 1, 1);
        }

        this.ctx.restore();
    }

    // 繪製防護罩節點
    drawQueenNodes(queen) {
        this.ctx.save();

        for (const node of queen.nodes) {
            const cx = node.x * this.tileSize + this.tileSize / 2;
            const cy = node.y * this.tileSize + this.tileSize / 2;

            // 1. 節點基座
            this.ctx.fillStyle = '#1c1124';
            this.ctx.strokeStyle = node.completed ? '#bd00ff' : '#4a3b54';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // 2. 能量核心 (隨著 charge 進度發光)
            if (node.charge > 0) {
                const pulse = Math.sin(this.animFrame * 0.1) * 2;
                const r = (node.charge / 100) * 5 + pulse;
                
                const grad = this.ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(1, r));
                grad.addColorStop(0, '#fff0ff');
                grad.addColorStop(0.5, '#bd00ff');
                grad.addColorStop(1, 'rgba(189,0,255,0)');
                
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, Math.max(1, r + 4), 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 3. 繪製指向蟻后的能量連線 (若節點已解鎖，發出明亮雷射光連線)
            if (node.completed) {
                const qx = queen.x * this.tileSize + this.tileSize / 2;
                const qy = queen.y * this.tileSize + this.tileSize / 2;

                this.ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
                this.ctx.lineWidth = 2 + Math.sin(this.animFrame * 0.3) * 1;
                this.ctx.shadowColor = '#bd00ff';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(cx, cy);
                this.ctx.lineTo(qx, qy);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0; // 重置陰影
            }
        }

        this.ctx.restore();
    }

    // 繪製蟻后 (尊貴紫色，體型巨大，防護罩特效)
    drawQueen(queen) {
        const cx = queen.x * this.tileSize + this.tileSize / 2;
        const cy = queen.y * this.tileSize + this.tileSize / 2;

        this.ctx.save();

        // 1. 防護罩力場 (Shield) - 僅在啟用時繪製
        if (queen.shieldActive) {
            const shieldPulse = Math.sin(this.animFrame * 0.05) * 4;
            const shieldRadius = 24 + shieldPulse;

            // 漸層力場
            const grad = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, shieldRadius);
            grad.addColorStop(0, 'rgba(189, 0, 255, 0.1)');
            grad.addColorStop(0.8, 'rgba(189, 0, 255, 0.35)');
            grad.addColorStop(1, 'rgba(189, 0, 255, 0.7)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, shieldRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // 護盾外圈弧線 (科技感格線)
            this.ctx.strokeStyle = 'rgba(189, 0, 255, 0.8)';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([6, 12]);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, shieldRadius, this.animFrame * 0.02, this.animFrame * 0.02 + Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 2. 蟻后本體 (巨型紫色螞蟻)
        this.ctx.fillStyle = '#9400d3';
        this.ctx.shadowColor = '#bd00ff';
        this.ctx.shadowBlur = queen.shieldActive ? 0 : 15; // 解鎖後蟻后發出致命微光

        // 巨型腹部 (後)
        this.ctx.beginPath();
        this.ctx.arc(cx - 7, cy, 7, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 胸部 (中)
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 頭部 (前)
        this.ctx.beginPath();
        this.ctx.arc(cx + 6, cy, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // 觸角
        this.ctx.strokeStyle = '#bd00ff';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(cx + 9, cy - 2);
        this.ctx.quadraticCurveTo(cx + 14, cy - 6, cx + 16, cy - 4);
        this.ctx.moveTo(cx + 9, cy + 2);
        this.ctx.quadraticCurveTo(cx + 14, cy + 6, cx + 16, cy + 4);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // 粒子系統更新與渲染
    spawnParticle(x, y, color, speedY) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -speedY * 0.5,
            alpha: 1.0,
            color: color,
            size: 1 + Math.random() * 2,
            life: 30 + Math.random() * 20
        });
    }

    drawParticles() {
        this.ctx.save();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 1.0 / p.life;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    // 覆蓋戰爭迷霧 (黑與半透明黑)
    drawFogOfWar(map) {
        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                const state = map.fogGrid[y][x];
                if (state === FOG_TYPES.VISIBLE) continue;

                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (state === FOG_TYPES.UNEXPLORED) {
                    // 全黑
                    this.ctx.fillStyle = '#000000';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                } else if (state === FOG_TYPES.EXPLORED) {
                    // 半透明迷霧（已經走過但無視野）
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }
    }
}
