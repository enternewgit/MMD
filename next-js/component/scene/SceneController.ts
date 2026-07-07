import * as THREE from "three";

export type SpawnParams = {
    position?: THREE.Vector3 | [number, number, number];
    direction?: THREE.Vector3 | [number, number, number];
    speed?: number;
    life?: number; // seconds
    size?: number;
    color?: number;
};

type ActiveLoop = {
    nextFireTime: number; // when to fire next (accumulated time in seconds)
    period: number;
    count: number | null; // null = infinite
    firedCount: number;
    commandName: string;
    args: number[];
};

type QueuedCommand = {
    executeAt: number; // accumulated time in seconds
    name: string;
    args: number[];
};

type LaserType = "straight" | "spin" | "sweep" | "aiming";

type ActiveLaser = {
    group: THREE.Group;
    segments: THREE.Mesh[];
    origin: THREE.Vector3;
    baseQuaternion: THREE.Quaternion;
    life: number;
    type: LaserType;
    direction: THREE.Vector3;
    width: number;
    length: number;
    age: number;
    appearDuration: number;
    travelDistance: number;
    travelSpeed: number;
    trailLength: number;
    angularVel?: number; // for spin
    sweepAngle?: number; // for sweep
    sweepDirection?: number; // 1 or -1 for sweep
    currentAngle?: number; // current angle for spin/sweep
    currentVisibleLength: number; // updated each frame, used for collision checks
    grazed: boolean;
};

export type HitKind = "bullet" | "laser";
export type HandSide = "left" | "right";

export class SceneController {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    private bulletPool: THREE.Mesh[] = [];
    private activeBullets: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; grazed: boolean }[] = [];
    private bulletGeo = new THREE.SphereGeometry(4, 8, 8);
    private bulletMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
    
    private laserPool: THREE.Mesh[] = [];
    private activeLasers: ActiveLaser[] = [];
    private laserGeo = new THREE.CylinderGeometry(1, 1, 100, 8);
    
    private initLaserGeo() {
        this.laserGeo.rotateX(Math.PI / 2);
        this.laserGeo.translate(0, 0, 50);
    }
    private laserMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, transparent: true, opacity: 1 });
    
    private activeLoops: ActiveLoop[] = [];
    private commandQueue: QueuedCommand[] = [];
    private accumulatedTime: number = 0;
    private playerPos: THREE.Vector3 = new THREE.Vector3(0, 200, 0);

    private playerHitRadius = 18;
    private grazeRadius = 45;
    private hitListeners: Array<(kind: HitKind) => void> = [];
    private grazeListeners: Array<() => void> = [];

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer){
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;        this.initLaserGeo();    }

    setPlayerPosition(pos: THREE.Vector3) {
        this.playerPos.copy(pos);
    }

    setPlayerHitRadius(radius: number) {
        this.playerHitRadius = radius;
    }

    onPlayerHit(cb: (kind: HitKind) => void) {
        this.hitListeners.push(cb);
    }

    onGraze(cb: () => void) {
        this.grazeListeners.push(cb);
    }

    private emitHit(kind: HitKind) {
        for (const cb of this.hitListeners) cb(kind);
    }

    private emitGraze() {
        for (const cb of this.grazeListeners) cb();
    }

    private actor: THREE.Object3D | null = null;
    private handBoneNames: string[] = SceneController.HAND_BONE_CANDIDATES.right;

    // MMD標準ボーン名。モデルによって手先の終端ボーンが無い場合があるため、手首・肩まで段階的にフォールバックする
    private static readonly HAND_BONE_CANDIDATES: Record<HandSide, string[]> = {
        right: ["右手先", "右手首", "右手", "右腕"],
        left: ["左手先", "左手首", "左手", "左腕"],
    };

    registerActor(obj: THREE.Object3D, handSide: HandSide = "right") {
        this.actor = obj;
        this.handBoneNames = SceneController.HAND_BONE_CANDIDATES[handSide];
    }

    setHandSide(handSide: HandSide) {
        this.handBoneNames = SceneController.HAND_BONE_CANDIDATES[handSide];
    }

    // 敵アクターの手のボーンが見つかればその現在位置、無ければアクター自体の位置、
    // アクター未登録なら従来の固定座標にフォールバックする
    private getOrigin(): THREE.Vector3 {
        if (!this.actor) return new THREE.Vector3(0, 200, 0);

        const skeleton = (this.actor as THREE.SkinnedMesh).skeleton;
        if (skeleton) {
            for (const name of this.handBoneNames) {
                const bone = skeleton.getBoneByName(name);
                if (bone) return bone.getWorldPosition(new THREE.Vector3());
            }
        }

        return this.actor.position.clone();
    }

    firePattern(command: string): string | null {
        // 改行で分割（縦方向 = 順次実行）
        const lines = command.split(/\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) return "Invalid command";

        let currentDelay = 0;
        const DEFAULT_LINE_DELAY = 0.1; // 改行ごとの自動遅延（秒）

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            
            // 各行をセミコロンで分割（同時実行グループ）
            const groups = line.split(/;/)
                .map((g) => g.trim())
                .filter((g) => g.length > 0);

            for (const group of groups) {
                const parsed = this.parseCommand(group);
                if (!parsed) return `Invalid command at line #${lineIdx + 1}`;

                const { name, args } = parsed;
                
                switch (name) {
                    case "delay":
                        // delay(秒) - 明示的に遅延を設定
                        if (args.length < 1 || !Number.isFinite(args[0]) || args[0] < 0) {
                            return `Invalid delay at line #${lineIdx + 1}`;
                        }
                        currentDelay += args[0];
                        break;
                        
                    case "wait":
                        if (!Number.isFinite(args[0]) || args[0] < 0) {
                            return `Invalid wait time at line #${lineIdx + 1}`;
                        }
                        currentDelay += args[0];
                        break;
                        
                    case "loop":
                        // loop(delay, period[, count])
                        if (args.length < 2) return `loop requires at least 2 args at line #${lineIdx + 1}`;
                        const loopDelay = Number.isFinite(args[0]) ? args[0] : 0;
                        const loopPeriod = Number.isFinite(args[1]) ? args[1] : 1;
                        const loopCount = args.length >= 3 && Number.isFinite(args[2]) ? Math.floor(args[2]) : null;
                        
                        if (loopPeriod <= 0) return `loop period must be > 0 at line #${lineIdx + 1}`;
                        
                        // The actual command is the next line
                        if (lineIdx + 1 >= lines.length) return `loop at line #${lineIdx + 1} has no command to loop`;
                        
                        const nextLine = lines[lineIdx + 1];
                        const nextGroups = nextLine.split(/;/)
                            .map((g) => g.trim())
                            .filter((g) => g.length > 0);
                        
                        if (nextGroups.length === 0) return `loop at line #${lineIdx + 1} has no command to loop`;
                        
                        // Use first command in next line
                        const nextParsed = this.parseCommand(nextGroups[0]);
                        if (!nextParsed) return `Invalid looped command at line #${lineIdx + 2}`;
                        
                        this.activeLoops.push({
                            nextFireTime: this.accumulatedTime + currentDelay + loopDelay,
                            period: loopPeriod,
                            count: loopCount,
                            firedCount: 0,
                            commandName: nextParsed.name,
                            args: nextParsed.args,
                        });
                        
                        lineIdx++; // skip next line
                        break;
                        
                    case "single":
                    case "ring":
                    case "ring3d":
                    case "fan":
                    case "aimingShot":
                    case "avoidingShot":
                    case "nway":
                    case "scatter":
                    case "laser":
                    case "laserSpin":
                    case "laserSweep":
                    case "laserAiming":
                        this.commandQueue.push({
                            executeAt: this.accumulatedTime + currentDelay,
                            name,
                            args,
                        });
                        break;
                        
                    default:
                        return `Unknown pattern at line #${lineIdx + 1}: ${name}`;
                }
            }
            
            // 次の行の前に自動遅延を追加
            if (lineIdx < lines.length - 1) {
                currentDelay += DEFAULT_LINE_DELAY;
            }
        }

        return null;
    }

    spawnBullet(p: SpawnParams = {}) {
        const pos = p.position instanceof THREE.Vector3
            ? p.position
            : p.position
            ? new THREE.Vector3(...p.position)
            : this.getOrigin();
        const dir = p.direction instanceof THREE.Vector3 ? p.direction.clone() : new THREE.Vector3(...(p.direction ?? [0, 0, -1]));
        dir.normalize();
        const speed = p.speed ?? 600;
        const life = p.life ?? 5;
        const size = p.size ?? 4;
        const color = p.color ?? 0xff0000;

        let mesh = this.bulletPool.pop();
        if (!mesh) {
            mesh = new THREE.Mesh(this.bulletGeo, this.bulletMat.clone());
        } else {
            (mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
        }

        mesh.scale.setScalar(size / 4);
        mesh.position.copy(pos);
        this.scene.add(mesh);

        const vel = dir.multiplyScalar(speed);
        this.activeBullets.push({ mesh, vel, life, grazed: false });
        return mesh;
    }

    private buildParams(args: number[]): SpawnParams {
        const [speed, life, size, color] = args;
        return {
            speed: Number.isFinite(speed) ? speed : undefined,
            life: Number.isFinite(life) ? life : undefined,
            size: Number.isFinite(size) ? size : undefined,
            color: Number.isFinite(color) ? Math.floor(color) : undefined,
        };
    }

    private spawnRing(args: number[]) {
        const count = Math.max(1, Math.floor(args[0] ?? 12));
        const speed = Number.isFinite(args[1]) ? args[1] : 600;
        const life = Number.isFinite(args[2]) ? args[2] : 4;
        const size = Number.isFinite(args[3]) ? args[3] : 4;
        const color = Number.isFinite(args[4]) ? Math.floor(args[4]) : 0xff0000;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const direction: [number, number, number] = [Math.cos(angle), 0, Math.sin(angle)];
            this.spawnBullet({ direction, speed, life, size, color });
        }
    }

    private spawnFan(args: number[]) {
        const count = Math.max(1, Math.floor(args[0] ?? 9));
        const spreadDeg = Number.isFinite(args[1]) ? args[1] : 30;
        const speed = Number.isFinite(args[2]) ? args[2] : 600;
        const life = Number.isFinite(args[3]) ? args[3] : 4;
        const size = Number.isFinite(args[4]) ? args[4] : 4;
        const color = Number.isFinite(args[5]) ? Math.floor(args[5]) : 0xff0000;

        if (count === 1) {
            this.spawnBullet({ direction: [0, 0, -1], speed, life, size, color });
            return;
        }

        const half = spreadDeg / 2;
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const angleDeg = -half + t * spreadDeg;
            const angleRad = (angleDeg * Math.PI) / 180;
            const direction: [number, number, number] = [Math.sin(angleRad), 0, -Math.cos(angleRad)];
            this.spawnBullet({ direction, speed, life, size, color });
        }
    }

    private spawnRing3d(args: number[]) {
        const count = Math.max(1, Math.floor(args[0] ?? 12));
        const pitchDeg = Number.isFinite(args[1]) ? args[1] : 15;
        const speed = Number.isFinite(args[2]) ? args[2] : 600;
        const life = Number.isFinite(args[3]) ? args[3] : 4;
        const size = Number.isFinite(args[4]) ? args[4] : 4;
        const color = Number.isFinite(args[5]) ? Math.floor(args[5]) : 0xff0000;

        const pitchRad = (pitchDeg * Math.PI) / 180;
        const y = Math.sin(pitchRad);
        const planar = Math.cos(pitchRad);

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const direction: [number, number, number] = [Math.cos(angle) * planar, y, Math.sin(angle) * planar];
            this.spawnBullet({ direction, speed, life, size, color });
        }
    }

    private spawnAimingShot(args: number[]) {
        const speed = Number.isFinite(args[0]) ? args[0] : 600;
        const life = Number.isFinite(args[1]) ? args[1] : 4;
        const size = Number.isFinite(args[2]) ? args[2] : 4;
        const color = Number.isFinite(args[3]) ? Math.floor(args[3]) : 0xff0000;

        const pos = this.getOrigin();
        const direction = this.playerPos.clone().sub(pos).normalize();
        this.spawnBullet({ position: pos, direction, speed, life, size, color });
    }

    private spawnAvoidingShot(args: number[]) {
        const count = Math.max(1, Math.floor(args[0] ?? 12));
        const speed = Number.isFinite(args[1]) ? args[1] : 600;
        const life = Number.isFinite(args[2]) ? args[2] : 4;
        const color = Number.isFinite(args[3]) ? Math.floor(args[3]) : 0xff0000;

        const pos = this.getOrigin();
        const toPlayer = this.playerPos.clone().sub(pos).normalize();

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;

            // 2Dで回転させる（Yは変えない）
            const x = Math.cos(angle);
            const z = Math.sin(angle);
            const dir = new THREE.Vector3(x, 0, z);
            
            // 自機方向から遠い方向を優先
            if (dir.dot(toPlayer) < 0) {
                this.spawnBullet({ position: pos, direction: dir, speed, life, size: 4, color });
            }
        }
    }

    private spawnNway(args: number[]) {
        const count = Math.max(1, Math.floor(args[0] ?? 3));
        const angleGapDeg = Number.isFinite(args[1]) ? args[1] : 45;
        const speed = Number.isFinite(args[2]) ? args[2] : 600;
        const life = Number.isFinite(args[3]) ? args[3] : 4;
        const color = Number.isFinite(args[4]) ? Math.floor(args[4]) : 0xff0000;

        const pos = this.getOrigin();
        const toPlayer = this.playerPos.clone().sub(pos);

        // 自機方向のヨー角を計算
        const playerYaw = Math.atan2(toPlayer.x, toPlayer.z);

        const half = (angleGapDeg * (count - 1)) / 2;
        for (let i = 0; i < count; i++) {
            const angleDeg = -half + i * angleGapDeg;
            const angleRad = playerYaw + (angleDeg * Math.PI) / 180;
            const direction: [number, number, number] = [Math.sin(angleRad), 0, Math.cos(angleRad)];
            this.spawnBullet({ position: pos, direction, speed, life, size: 4, color });
        }
    }

    private spawnScatter(args: number[]) {
        const count = Math.max(1, Math.floor(args[0] ?? 12));
        const speed = Number.isFinite(args[1]) ? args[1] : 600;
        const life = Number.isFinite(args[2]) ? args[2] : 4;
        const color = Number.isFinite(args[3]) ? Math.floor(args[3]) : 0xff0000;

        const pos = this.getOrigin();

        for (let i = 0; i < count; i++) {
            const yaw = Math.random() * Math.PI * 2;
            const pitch = (Math.random() - 0.5) * Math.PI * 0.5; // -45度～45度
            
            const x = Math.cos(pitch) * Math.sin(yaw);
            const y = Math.sin(pitch);
            const z = Math.cos(pitch) * Math.cos(yaw);
            
            const direction: [number, number, number] = [x, y, z];
            this.spawnBullet({ position: pos, direction, speed, life, size: 4, color });
        }
    }

    private spawnLaserBase(
        type: LaserType,
        direction: THREE.Vector3,
        width: number,
        length: number,
        life: number,
        color: number,
        angularVel?: number,
        sweepAngle?: number,
        sweepDirection?: number
    ) {
        const pos = this.getOrigin();
        const group = new THREE.Group();
        group.position.copy(pos);
        
        // Align the laser's circular face (local Z) toward the firing direction.
        const forwardVec = direction.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forwardVec);
        const baseQuaternion = group.quaternion.clone();

        const segmentCount = 10;
        const segmentLength = length / segmentCount;
        const segments: THREE.Mesh[] = [];
        for (let i = 0; i < segmentCount; i++) {
            const segment = new THREE.Mesh(this.laserGeo, this.laserMat.clone());
            const material = segment.material as THREE.MeshStandardMaterial;
            material.color.setHex(color);
            material.emissive.setHex(color);
            material.transparent = true;
            material.opacity = 0;
            segment.scale.set(width, 0.001, width);
            segment.position.set(0, 0, i * segmentLength);
            group.add(segment);
            segments.push(segment);
        }

        this.scene.add(group);
        
        this.activeLasers.push({
            group,
            segments,
            origin: pos.clone(),
            baseQuaternion,
            life,
            type,
            direction: forwardVec,
            width,
            length,
            age: 0,
            appearDuration: Math.min(0.25, Math.max(0.12, life * 0.12)),
            travelDistance: 0,
            travelSpeed: Math.max(length / Math.max(life, 0.1), 1200),
            trailLength: Math.max(length * 0.45, 180),
            angularVel,
            sweepAngle,
            sweepDirection,
            currentAngle: 0,
            currentVisibleLength: 0,
            grazed: false,
        });
    }

    private spawnLaser(args: number[]) {
        const width = Math.max(0.1, Number.isFinite(args[0]) ? args[0] : 10);
        const length = Math.max(1, Number.isFinite(args[1]) ? args[1] : 500);
        const life = Number.isFinite(args[2]) ? args[2] : 3;
        const color = Number.isFinite(args[3]) ? Math.floor(args[3]) : 0xff0000;

        const direction = new THREE.Vector3(0, 0, -1);
        this.spawnLaserBase("straight", direction, width, length, life, color);
    }

    private spawnLaserSpin(args: number[]) {
        const width = Math.max(0.1, Number.isFinite(args[0]) ? args[0] : 10);
        const length = Math.max(1, Number.isFinite(args[1]) ? args[1] : 500);
        const angularVel = Number.isFinite(args[2]) ? args[2] : Math.PI; // rad/sec
        const life = Number.isFinite(args[3]) ? args[3] : 3;
        const color = Number.isFinite(args[4]) ? Math.floor(args[4]) : 0xff0000;

        const direction = new THREE.Vector3(0, 0, -1);
        this.spawnLaserBase("spin", direction, width, length, life, color, angularVel);
    }

    private spawnLaserSweep(args: number[]) {
        const width = Math.max(0.1, Number.isFinite(args[0]) ? args[0] : 10);
        const length = Math.max(1, Number.isFinite(args[1]) ? args[1] : 500);
        const sweepSpeedDeg = Number.isFinite(args[2]) ? args[2] : 90; // deg/sec
        const totalSweepDeg = Number.isFinite(args[3]) ? args[3] : 90; // total sweep angle
        const life = Number.isFinite(args[4]) ? args[4] : 3;
        const color = Number.isFinite(args[5]) ? Math.floor(args[5]) : 0xff0000;

        const direction = new THREE.Vector3(0, 0, -1);
        const angularVelRad = (sweepSpeedDeg * Math.PI) / 180;
        this.spawnLaserBase("sweep", direction, width, length, life, color, angularVelRad, totalSweepDeg, 1);
    }

    private spawnLaserAiming(args: number[]) {
        const width = Math.max(0.1, Number.isFinite(args[0]) ? args[0] : 10);
        const length = Math.max(1, Number.isFinite(args[1]) ? args[1] : 500);
        const life = Number.isFinite(args[2]) ? args[2] : 3;
        const color = Number.isFinite(args[3]) ? Math.floor(args[3]) : 0xff0000;

        const pos = this.getOrigin();
        const direction = this.playerPos.clone().sub(pos).normalize();
        this.spawnLaserBase("aiming", direction, width, length, life, color);
    }

    private parseCommand(command: string): { name: string; args: number[] } | null {
        const trimmed = command.trim();
        if (!trimmed) return null;
        const match = trimmed.match(/^([a-zA-Z0-9_]+)\s*(?:\((.*)\))?$/);
        if (!match) return null;
        const name = match[1];
        const argsRaw = match[2];
        if (!argsRaw) return { name, args: [] };
        
        const args = argsRaw
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part.length > 0)
            .map((part) => {
                const num = Number(part);
                return Number.isFinite(num) ? num : NaN;
            })
            .filter((value) => Number.isFinite(value));
        
        return { name, args };
    }

    private executeCommand(name: string, args: number[]) {
        switch (name) {
            case "single":
                this.spawnBullet(this.buildParams(args));
                break;
            case "ring":
                this.spawnRing(args);
                break;
            case "ring3d":
                this.spawnRing3d(args);
                break;
            case "fan":
                this.spawnFan(args);
                break;
            case "aimingShot":
                this.spawnAimingShot(args);
                break;
            case "avoidingShot":
                this.spawnAvoidingShot(args);
                break;
            case "nway":
                this.spawnNway(args);
                break;
            case "scatter":
                this.spawnScatter(args);
                break;
            case "laser":
                this.spawnLaser(args);
                break;
            case "laserSpin":
                this.spawnLaserSpin(args);
                break;
            case "laserSweep":
                this.spawnLaserSweep(args);
                break;
            case "laserAiming":
                this.spawnLaserAiming(args);
                break;
        }
    }

    update(deltaSec: number) {
        this.accumulatedTime += deltaSec;
        
        // Process queued commands
        for (let i = this.commandQueue.length - 1; i >= 0; i--) {
            if (this.commandQueue[i].executeAt <= this.accumulatedTime) {
                const cmd = this.commandQueue[i];
                this.executeCommand(cmd.name, cmd.args);
                this.commandQueue.splice(i, 1);
            }
        }
        
        // Process active loops
        for (let i = this.activeLoops.length - 1; i >= 0; i--) {
            const loop = this.activeLoops[i];
            
            if (this.accumulatedTime >= loop.nextFireTime) {
                this.executeCommand(loop.commandName, loop.args);
                loop.firedCount++;
                
                if (loop.count !== null && loop.firedCount >= loop.count) {
                    this.activeLoops.splice(i, 1);
                } else {
                    loop.nextFireTime += loop.period;
                }
            }
        }
        
        // Update bullets
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const b = this.activeBullets[i];
            b.mesh.position.addScaledVector(b.vel, deltaSec);
            b.life -= deltaSec;
            if (b.life <= 0) {
                this.scene.remove(b.mesh);
                this.bulletPool.push(b.mesh);
                this.activeBullets.splice(i, 1);
            }
        }

        // Update lasers
        for (let i = this.activeLasers.length - 1; i >= 0; i--) {
            const laser = this.activeLasers[i];
            laser.age += deltaSec;
            laser.life -= deltaSec;

            laser.travelDistance += laser.travelSpeed * deltaSec;
            laser.group.position.copy(laser.origin).addScaledVector(laser.direction, laser.travelDistance);

            const grow = Math.min(1, laser.age / laser.appearDuration);
            const visibleLength = Math.min(laser.length, laser.trailLength + laser.travelDistance * 0.2);
            laser.currentVisibleLength = visibleLength;
            const segmentLength = laser.length / laser.segments.length;

            for (let segmentIndex = 0; segmentIndex < laser.segments.length; segmentIndex++) {
                const segment = laser.segments[segmentIndex];
                const material = segment.material as THREE.MeshStandardMaterial;
                const segmentStart = segmentIndex * segmentLength;
                const segmentVisible = THREE.MathUtils.clamp(visibleLength - segmentStart, 0, segmentLength);
                const segmentGrow = segmentVisible / segmentLength;

                segment.scale.set(laser.width, Math.max(0.001, (segmentLength / 100) * segmentGrow), laser.width);
                segment.position.y = segmentStart + segmentVisible / 2;
                material.opacity = Math.max(0.08, segmentGrow * grow);
            }

            // Update rotation for spin/sweep
            if (laser.type === "spin" && laser.angularVel !== undefined) {
                laser.currentAngle ??= 0;
                laser.currentAngle += laser.angularVel * deltaSec;
                laser.group.quaternion.copy(laser.baseQuaternion);
                laser.group.rotateY(laser.currentAngle);
            } else if (laser.type === "sweep" && laser.sweepAngle !== undefined && laser.sweepDirection !== undefined) {
                laser.currentAngle ??= 0;
                const maxSweep = laser.sweepAngle / 2;
                laser.currentAngle += laser.sweepDirection * laser.angularVel! * deltaSec;
                if (laser.currentAngle > maxSweep || laser.currentAngle < -maxSweep) {
                    laser.sweepDirection *= -1;
                }
                const angle = (laser.currentAngle * Math.PI) / 180;
                laser.group.quaternion.copy(laser.baseQuaternion);
                laser.group.rotateY(angle);
            }

            if (laser.life <= 0) {
                this.scene.remove(laser.group);
                for (const segment of laser.segments) {
                    const material = segment.material as THREE.Material;
                    material.dispose();
                }
                this.activeLasers.splice(i, 1);
            }
        }

        this.checkPlayerCollisions();
    }

    private checkPlayerCollisions() {
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const b = this.activeBullets[i];
            const bulletRadius = 4 * b.mesh.scale.x; // bulletGeo is a radius-4 sphere
            const dist = b.mesh.position.distanceTo(this.playerPos);

            if (!b.grazed && dist <= this.grazeRadius + bulletRadius) {
                b.grazed = true;
                this.emitGraze();
            }

            if (dist <= this.playerHitRadius + bulletRadius) {
                this.scene.remove(b.mesh);
                this.bulletPool.push(b.mesh);
                this.activeBullets.splice(i, 1);
                this.emitHit("bullet");
            }
        }

        for (const laser of this.activeLasers) {
            const localPlayer = laser.group.worldToLocal(this.playerPos.clone());
            const withinLength = localPlayer.z >= 0 && localPlayer.z <= laser.currentVisibleLength;
            const radial = Math.hypot(localPlayer.x, localPlayer.y);

            if (!laser.grazed && withinLength && radial <= laser.width + this.grazeRadius) {
                laser.grazed = true;
                this.emitGraze();
            }

            if (withinLength && radial <= laser.width + this.playerHitRadius * 0.3) {
                this.emitHit("laser");
            }
        }
    }

    clearAll() {
        for (const b of this.activeBullets) {
            this.scene.remove(b.mesh);
        }
        this.activeBullets.length = 0;
        for (const l of this.activeLasers) {
            this.scene.remove(l.group);
            for (const segment of l.segments) {
                const material = segment.material as THREE.Material;
                material.dispose();
            }
        }
        this.activeLasers.length = 0;
        this.commandQueue.length = 0;
        this.activeLoops.length = 0;
        this.accumulatedTime = 0;
    }

    dispose() {
        this.clearAll();
        for (const m of this.bulletPool) {
            m.geometry?.dispose();
            (m.material as THREE.Material)?.dispose();
        }
        this.bulletPool.length = 0;
        for (const m of this.laserPool) {
            m.geometry?.dispose();
            (m.material as THREE.Material)?.dispose();
        }
        this.laserPool.length = 0;
        for (const m of this.laserPool) {
            m.geometry?.dispose();
            (m.material as THREE.Material)?.dispose();
        }
        this.laserPool.length = 0;
    }
}