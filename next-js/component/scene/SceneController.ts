import * as THREE from "three";

export type SpawnParams = {
    position?: THREE.Vector3 | [number, number, number];
    direction?: THREE.Vector3 | [number, number, number];
    speed?: number;
    life?: number; // seconds
    size?: number;
    color?: number;
};

export class SceneController {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    private bulletPool: THREE.Mesh[] = [];
    private activeBullets: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
    private bulletGeo = new THREE.SphereGeometry(4, 8, 8);
    private bulletMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer){
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
    }

    registerActor(_obj: THREE.Object3D){
        //将来的にActor管理する場合に拡張
    }

    spawnBullet(p: SpawnParams = {}) {
        const pos = p.position instanceof THREE.Vector3 ? p.position : new THREE.Vector3(...(p.position ?? [0, 200, 0]));
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
        this.activeBullets.push({ mesh, vel, life });
        return mesh;
    }

    update(deltaSec: number) {
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
    }

    clearAll() {
        for (const b of this.activeBullets) {
            this.scene.remove(b.mesh);
        }
        this.activeBullets.length = 0;
    }

    dispose() {
        this.clearAll();
        for (const m of this.bulletPool) {
            m.geometry?.dispose();
            (m.material as THREE.Material)?.dispose();
        }
        this.bulletPool.length = 0;
    }
}