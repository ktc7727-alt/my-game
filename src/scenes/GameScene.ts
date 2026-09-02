import Phaser from 'phaser';
import { Board } from '../game/board';
import {
  COLS,
  GEM_COLORS,
  GEM_TYPES,
  MOVE_BONUS,
  MOVES_PER_LEVEL,
  ROWS,
  targetScoreForLevel,
} from '../game/constants';
import type { CascadeStep, Cell, Pos } from '../game/types';
import { createButton, drawBackground } from '../ui/button';
import {
  BOARD_HEIGHT,
  BOARD_LEFT,
  BOARD_TOP,
  BOARD_WIDTH,
  CELL,
  FONT_FAMILY,
  GAME_HEIGHT,
  GAME_WIDTH,
  GEM_SIZE,
  PALETTE,
  cellCenterX,
  cellCenterY,
  pointToCell,
} from '../ui/layout';
import { TEXTURE_SIZE, gemTextureKey } from '../ui/textures';

interface GameSceneData {
  level?: number;
  score?: number;
}

/** 드래그로 인정할 최소 이동 거리 (칸 크기 기준) */
const DRAG_THRESHOLD = CELL * 0.38;
/** 이 시간 동안 조작이 없으면 힌트를 반짝인다 */
const HINT_DELAY_MS = 6000;

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private gemScale = GEM_SIZE / TEXTURE_SIZE;

  private level = 1;
  private score = 0;
  private scoreAtLevelStart = 0;
  private target = 0;
  private movesLeft = 0;
  private busy = false;

  private selected: Pos | null = null;
  private selector!: Phaser.GameObjects.Image;
  private dragStart: { pos: Pos; x: number; y: number; moved: boolean } | null = null;

  private levelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private toastText!: Phaser.GameObjects.Text;

  private hintTimer?: Phaser.Time.TimerEvent;
  private hintTweens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.level = data.level ?? 1;
    this.score = data.score ?? 0;
    this.scoreAtLevelStart = this.score;
    this.target = this.scoreAtLevelStart + targetScoreForLevel(this.level);
    this.movesLeft = MOVES_PER_LEVEL;
    this.busy = false;
    this.selected = null;
    this.dragStart = null;
    this.sprites.clear();
    this.hintTweens = [];
  }

  create(): void {
    drawBackground(this, GAME_WIDTH, GAME_HEIGHT);
    this.buildHud();
    this.buildBoardFrame();

    this.board = new Board({ rows: ROWS, cols: COLS, typeCount: GEM_TYPES });
    this.spawnAllSprites();

    this.selector = this.add
      .image(0, 0, 'cell-selector')
      .setDisplaySize(CELL, CELL)
      .setDepth(20)
      .setVisible(false);

    this.setupInput();
    this.updateHud();
    this.scheduleHint();
  }

  // ────────────────────────────── 화면 구성 ──────────────────────────────

  private buildHud(): void {
    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.panel, 0.9);
    panel.fillRoundedRect(28, 140, GAME_WIDTH - 56, 216, 32);

    this.levelText = this.add.text(58, 164, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '28px',
      fontStyle: 'bold',
      color: PALETTE.textDim,
    });

    this.scoreText = this.add.text(58, 198, '0', {
      fontFamily: FONT_FAMILY,
      fontSize: '62px',
      fontStyle: 'bold',
      color: PALETTE.text,
    });

    this.targetText = this.add
      .text(GAME_WIDTH - 58, 276, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: PALETTE.textDim,
      })
      .setOrigin(1, 0);

    // 남은 이동 횟수 배지
    const badge = this.add.graphics();
    badge.fillStyle(PALETTE.panelLight, 1);
    badge.fillCircle(GAME_WIDTH - 112, 218, 62);
    this.add
      .text(GAME_WIDTH - 112, 192, '남은 이동', {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);
    this.movesText = this.add
      .text(GAME_WIDTH - 112, 230, '0', {
        fontFamily: FONT_FAMILY,
        fontSize: '46px',
        fontStyle: 'bold',
        color: PALETTE.text,
      })
      .setOrigin(0.5);

    this.progressBar = this.add.graphics();

    this.toastText = this.add
      .text(GAME_WIDTH / 2, BOARD_TOP - 34, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: PALETTE.text,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(40);

    // 보드 아래 빈 공간에 힌트 버튼을 둔다. 막혔을 때 스스로 꺼내 볼 수 있어야 한다.
    createButton(this, GAME_WIDTH / 2, 1215, '힌트 보기', () => this.showHint(), {
      width: 300,
      height: 88,
      fill: PALETTE.panelLight,
      textColor: PALETTE.text,
      fontSize: 30,
    });

    // 메뉴로 나가기
    const quit = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 74, '메뉴로 나가기', {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    quit.on('pointerup', () => {
      if (!this.busy) this.scene.start('Menu');
    });
  }

  private buildBoardFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x000000, 0.28);
    frame.fillRoundedRect(BOARD_LEFT - 14, BOARD_TOP - 14, BOARD_WIDTH + 28, BOARD_HEIGHT + 28, 30);

    // 체크무늬로 칸을 구분해 두면 젬 위치를 눈으로 잡기 쉬워진다.
    const cells = this.add.graphics();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        cells.fillStyle(0xffffff, (r + c) % 2 === 0 ? 0.05 : 0.02);
        cells.fillRect(BOARD_LEFT + c * CELL, BOARD_TOP + r * CELL, CELL, CELL);
      }
    }

    // 보드 위쪽에서 떨어지는 젬이 HUD 를 침범하지 않도록 잘라낸다.
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillRect(BOARD_LEFT - 14, BOARD_TOP, BOARD_WIDTH + 28, BOARD_HEIGHT + 14);
    this.boardMask = mask.createGeometryMask();
  }

  private boardMask!: Phaser.Display.Masks.GeometryMask;

  private makeSprite(cell: Cell, pos: Pos): Phaser.GameObjects.Image {
    const img = this.add
      .image(cellCenterX(pos.c), cellCenterY(pos.r), gemTextureKey(cell.type, cell.special))
      .setDisplaySize(GEM_SIZE, GEM_SIZE)
      .setDepth(10);
    img.setMask(this.boardMask);
    this.sprites.set(cell.id, img);
    return img;
  }

  private spawnAllSprites(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.board.grid[r][c];
        if (cell) this.makeSprite(cell, { r, c });
      }
    }
  }

  // ────────────────────────────── 입력 ──────────────────────────────

  private setupInput(): void {
    const zone = this.add
      .zone(BOARD_LEFT, BOARD_TOP, BOARD_WIDTH, BOARD_HEIGHT)
      .setOrigin(0)
      .setInteractive();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.busy) return;
      const pos = pointToCell(pointer.x, pointer.y);
      if (!pos) return;
      this.dragStart = { pos, x: pointer.x, y: pointer.y, moved: false };
      this.cancelHint();
    });

    // 손가락이 보드 밖으로 나가는 경우까지 잡으려면 씬 단위 입력을 쓴다.
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.busy || !this.dragStart || this.dragStart.moved) return;
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

      // 더 많이 움직인 축 하나만 골라 인접한 한 칸으로 민다.
      const target =
        Math.abs(dx) > Math.abs(dy)
          ? { r: this.dragStart.pos.r, c: this.dragStart.pos.c + (dx > 0 ? 1 : -1) }
          : { r: this.dragStart.pos.r + (dy > 0 ? 1 : -1), c: this.dragStart.pos.c };

      const from = this.dragStart.pos;
      this.dragStart.moved = true;
      this.dragStart = null;
      if (this.board.inBounds(target)) void this.attemptSwap(from, target);
      else this.scheduleHint();
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.busy || !this.dragStart) return;
      const start = this.dragStart;
      this.dragStart = null;
      const moved = Math.hypot(pointer.x - start.x, pointer.y - start.y);
      if (moved > DRAG_THRESHOLD) return;
      this.handleTap(start.pos);
    });
  }

  /** 탭 두 번으로도 조작할 수 있게 한다 (드래그가 어려운 사용자를 위해) */
  private handleTap(pos: Pos): void {
    if (!this.selected) {
      this.select(pos);
      return;
    }
    if (this.selected.r === pos.r && this.selected.c === pos.c) {
      this.clearSelection();
      this.scheduleHint();
      return;
    }
    if (Board.areAdjacent(this.selected, pos)) {
      const from = this.selected;
      void this.attemptSwap(from, pos);
      return;
    }
    this.select(pos);
  }

  private select(pos: Pos): void {
    this.selected = pos;
    this.selector.setPosition(cellCenterX(pos.c), cellCenterY(pos.r)).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.selector);
    this.tweens.add({
      targets: this.selector,
      alpha: 0.35,
      duration: 480,
      yoyo: true,
      repeat: -1,
    });
    this.scheduleHint();
  }

  private clearSelection(): void {
    this.selected = null;
    this.tweens.killTweensOf(this.selector);
    this.selector.setVisible(false);
  }

  // ────────────────────────────── 스왑과 연쇄 재생 ──────────────────────────────

  private async attemptSwap(a: Pos, b: Pos): Promise<void> {
    if (this.busy) return;
    const cellA = this.board.at(a);
    const cellB = this.board.at(b);
    if (!cellA || !cellB) return;

    const spriteA = this.sprites.get(cellA.id);
    const spriteB = this.sprites.get(cellB.id);
    if (!spriteA || !spriteB) return;

    this.busy = true;
    this.cancelHint();
    this.clearSelection();

    // 보드 로직은 즉시 확정하고, 화면은 그 결과를 뒤따라 재생한다.
    const result = this.board.swap(a, b);

    await this.moveBoth(spriteA, b, spriteB, a, 170);

    if (!result.valid) {
      await this.moveBoth(spriteA, a, spriteB, b, 170);
      this.busy = false;
      this.scheduleHint();
      return;
    }

    this.movesLeft--;
    this.updateHud();

    await this.playCascades(result.cascades);
    await this.ensurePlayable();

    this.busy = false;
    if (!this.checkLevelEnd()) this.scheduleHint();
  }

  private async playCascades(steps: CascadeStep[]): Promise<void> {
    for (const step of steps) {
      await this.playClear(step);

      this.score += step.score;
      this.updateHud();
      this.showScorePop(step);

      await this.playFall(step);
    }
  }

  private async playClear(step: CascadeStep): Promise<void> {
    const dying: Phaser.GameObjects.Image[] = [];

    step.cleared.forEach((entry, i) => {
      const sprite = this.sprites.get(entry.cell.id);
      if (!sprite) return;
      this.sprites.delete(entry.cell.id);
      dying.push(sprite);
      // 파티클은 눈에 띄는 만큼만 쓴다. 한 번에 수십 개를 터뜨리면 저사양 기기가 버벅인다.
      if (i < 12) this.burst(entry.pos, entry.cell);
    });

    // 특수 젬으로 바뀌는 자리의 원래 젬도 함께 치운다.
    for (const entry of step.created) {
      if (entry.replacedId === null) continue;
      const sprite = this.sprites.get(entry.replacedId);
      if (!sprite) continue;
      this.sprites.delete(entry.replacedId);
      dying.push(sprite);
    }

    if (dying.length > 0) {
      this.tweens.add({
        targets: dying,
        scale: 0,
        alpha: 0,
        duration: 190,
        ease: 'Back.easeIn',
        onComplete: () => dying.forEach((s) => s.destroy()),
      });
      await this.wait(200);
    }

    for (const entry of step.created) {
      const sprite = this.makeSprite(entry.cell, entry.pos);
      sprite.setScale(0);
      this.tweens.add({
        targets: sprite,
        scale: this.gemScale,
        duration: 260,
        ease: 'Back.easeOut',
      });
    }
    if (step.created.length > 0) await this.wait(180);
  }

  private async playFall(step: CascadeStep): Promise<void> {
    let longest = 0;

    for (const fall of step.falls) {
      const sprite = this.sprites.get(fall.id);
      if (!sprite) continue;
      const duration = 110 + (fall.to.r - fall.from.r) * 36;
      longest = Math.max(longest, duration);
      this.tweens.add({
        targets: sprite,
        y: cellCenterY(fall.to.r),
        duration,
        ease: 'Quad.easeIn',
      });
    }

    for (const spawn of step.spawned) {
      const sprite = this.makeSprite(spawn.cell, { r: spawn.spawnRow, c: spawn.pos.c });
      const duration = 110 + (spawn.pos.r - spawn.spawnRow) * 36;
      longest = Math.max(longest, duration);
      this.tweens.add({
        targets: sprite,
        y: cellCenterY(spawn.pos.r),
        duration,
        ease: 'Quad.easeIn',
      });
    }

    if (longest > 0) await this.wait(longest + 40);
  }

  /** 둘 수 있는 수가 사라지면 보드를 섞고, 젬이 제자리로 미끄러지는 모습을 보여준다. */
  private async ensurePlayable(): Promise<void> {
    if (this.board.hasValidMove()) return;

    this.showToast('둘 수 있는 수가 없어 보드를 섞습니다');
    this.board.shuffle();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.board.grid[r][c];
        if (!cell) continue;
        const sprite = this.sprites.get(cell.id);
        if (!sprite) continue;
        this.tweens.add({
          targets: sprite,
          x: cellCenterX(c),
          y: cellCenterY(r),
          duration: 420,
          ease: 'Cubic.easeInOut',
        });
      }
    }
    await this.wait(480);
  }

  // ────────────────────────────── 연출 ──────────────────────────────

  private burst(pos: Pos, cell: Cell): void {
    const tint = cell.type >= 0 ? GEM_COLORS[cell.type % GEM_COLORS.length] : 0xffffff;
    const emitter = this.add.particles(cellCenterX(pos.c), cellCenterY(pos.r), 'spark', {
      speed: { min: 60, max: 230 },
      scale: { start: 0.55, end: 0 },
      lifespan: 380,
      tint,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(7);
    this.time.delayedCall(520, () => emitter.destroy());
  }

  private showScorePop(step: CascadeStep): void {
    if (step.cleared.length === 0) return;

    // 지워진 칸들의 무게중심에 점수를 띄운다.
    const avgR = step.cleared.reduce((s, x) => s + x.pos.r, 0) / step.cleared.length;
    const avgC = step.cleared.reduce((s, x) => s + x.pos.c, 0) / step.cleared.length;

    const label = step.index > 0 ? `+${step.score}  x${(1 + step.index * 0.5).toFixed(1)}` : `+${step.score}`;
    const text = this.add
      .text(cellCenterX(avgC), cellCenterY(avgR), label, {
        fontFamily: FONT_FAMILY,
        fontSize: step.index > 0 ? '46px' : '38px',
        fontStyle: 'bold',
        color: step.index > 0 ? '#ffd166' : '#ffffff',
        stroke: '#0b1021',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: text,
      y: text.y - 70,
      alpha: 0,
      duration: 720,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });

    if (step.index >= 1) this.showToast(`${step.index + 1}연쇄!`);
  }

  private showToast(message: string): void {
    this.toastText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 900,
      delay: 700,
    });
  }

  // ────────────────────────────── 힌트 ──────────────────────────────

  private scheduleHint(): void {
    this.cancelHint();
    this.hintTimer = this.time.delayedCall(HINT_DELAY_MS, () => this.showHint());
  }

  private cancelHint(): void {
    this.hintTimer?.remove();
    this.hintTimer = undefined;
    for (const tween of this.hintTweens) tween.stop();
    this.hintTweens = [];
    for (const sprite of this.sprites.values()) sprite.setScale(this.gemScale);
  }

  private showHint(): void {
    if (this.busy) return;
    // 버튼으로 직접 부를 수도 있으므로 이전 반짝임을 먼저 정리한다.
    this.cancelHint();

    const hint = this.board.findHint();
    if (!hint) return;

    for (const pos of hint) {
      const cell = this.board.at(pos);
      if (!cell) continue;
      const sprite = this.sprites.get(cell.id);
      if (!sprite) continue;
      this.hintTweens.push(
        this.tweens.add({
          targets: sprite,
          scale: this.gemScale * 1.16,
          duration: 460,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
        }),
      );
    }
  }

  // ────────────────────────────── HUD / 종료 판정 ──────────────────────────────

  private updateHud(): void {
    this.levelText.setText(`레벨 ${this.level}`);
    this.scoreText.setText(this.score.toLocaleString());
    this.targetText.setText(`목표 ${this.target.toLocaleString()}`);
    this.movesText.setText(String(this.movesLeft));
    this.movesText.setColor(this.movesLeft <= 3 ? '#ff4d6d' : PALETTE.text);

    const gained = Math.max(0, this.score - this.scoreAtLevelStart);
    const needed = Math.max(1, this.target - this.scoreAtLevelStart);
    const ratio = Math.min(1, gained / needed);

    const x = 58;
    const y = 316;
    const width = GAME_WIDTH - 116;
    this.progressBar.clear();
    this.progressBar.fillStyle(0x000000, 0.35);
    this.progressBar.fillRoundedRect(x, y, width, 18, 9);
    if (ratio > 0) {
      this.progressBar.fillStyle(ratio >= 1 ? PALETTE.accentWarm : PALETTE.accent, 1);
      this.progressBar.fillRoundedRect(x, y, Math.max(18, width * ratio), 18, 9);
    }
  }

  /** 레벨이 끝났으면 결과 화면으로 넘긴다. 넘겼으면 true */
  private checkLevelEnd(): boolean {
    if (this.score >= this.target) {
      // 남은 이동 횟수를 점수로 환산해 돌려준다.
      const bonus = this.movesLeft * MOVE_BONUS;
      this.scene.start('Result', {
        cleared: true,
        level: this.level,
        score: this.score + bonus,
        bonus,
      });
      return true;
    }

    if (this.movesLeft <= 0) {
      this.scene.start('Result', {
        cleared: false,
        level: this.level,
        score: this.score,
        bonus: 0,
      });
      return true;
    }

    return false;
  }

  // ────────────────────────────── 트윈 유틸 ──────────────────────────────

  private moveBoth(
    a: Phaser.GameObjects.Image,
    toA: Pos,
    b: Phaser.GameObjects.Image,
    toB: Pos,
    duration: number,
  ): Promise<void> {
    this.tweens.add({
      targets: a,
      x: cellCenterX(toA.c),
      y: cellCenterY(toA.r),
      duration,
      ease: 'Quad.easeInOut',
    });
    this.tweens.add({
      targets: b,
      x: cellCenterX(toB.c),
      y: cellCenterY(toB.r),
      duration,
      ease: 'Quad.easeInOut',
    });
    return this.wait(duration + 10);
  }

  /** 씬이 사라지면 대기 중인 프로미스가 영원히 걸리지 않도록 타이머를 씬에 묶어 둔다. */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }
}
