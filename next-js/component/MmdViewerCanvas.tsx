"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";
import { SceneController, type HitKind, type HandSide } from "./scene/SceneController";

type MmdViewerCanvasProps = {
  stageUrl: string;
  enemyUrl: string;
  handSide: HandSide;
  onStartLoading: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
  onControllerReady?: (controller: SceneController) => void;
  onPlayerHit?: (kind: HitKind) => void;
  onGraze?: () => void;
};

// 敵モデルはステージと違って弾幕発生源(0,200,0)に立たせる想定。
// MMDの標準スケールはこの世界の距離感(弾速600/秒、リング半径2000超)に対して小さすぎるので拡大する。
const ENEMY_POSITION = new THREE.Vector3(0, 200, 0);
const ENEMY_SCALE = 10;

export function MmdViewerCanvas({
  stageUrl,
  enemyUrl,
  handSide,
  onStartLoading,
  onReady,
  onError,
  onControllerReady,
  onPlayerHit,
  onGraze,
}: MmdViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedRef = useRef(false);
  // 敵ロード完了時に最新の選択値を読むための ref（effect の再実行=モデル再読み込みを避ける）
  const handSideRef = useRef(handSide);
  useEffect(() => {
    handSideRef.current = handSide;
  }, [handSide]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) {
      return;
    }

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const loadingManager = new THREE.LoadingManager();
    loadingManager.setURLModifier((url) => {
      let normalized = url.replace(/\\/g, "/").replace(/%5C/gi, "/");
      normalized = normalized.replace("/texture/texture/", "/texture/");
      normalized = normalized.replace("texture/texture/", "texture/");
      return normalized;
    });
    loadingManager.onError = (url) => {
      console.error("Failed to load resource:", url);
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 50, 3000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(0, 200, 1200);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setSize(width, height, false); // updateStyle=false: CSSで100%にサイズを委ねる
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 200, 0);
    controls.update();

    const light = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const mmdHelper = new MMDAnimationHelper({
      afterglow: 2.0,
      physics: false,
    });

    const sceneController = new SceneController(scene, camera, renderer);
    if (typeof onPlayerHit === "function") {
      sceneController.onPlayerHit(onPlayerHit);
    }
    if (typeof onGraze === "function") {
      sceneController.onGraze(onGraze);
    }
    if (typeof onControllerReady === "function") onControllerReady(sceneController);

    const loader = new MMDLoader(loadingManager);

    if (!startedRef.current) {
      startedRef.current = true;
      onStartLoading();
    }

    let pendingLoads = 2;
    let failed = false;
    const handleOneLoaded = () => {
      pendingLoads -= 1;
      if (pendingLoads === 0 && !failed) onReady();
    };
    const handleLoadError = (label: string, url: string, error: unknown) => {
      if (failed) return; // avoid calling onError twice
      failed = true;
      console.error(`PMX load error (${label}). Check model path:`, url, error);
      onError(error);
    };

    loader.load(
      stageUrl,
      (mesh: THREE.SkinnedMesh) => {
        scene.add(mesh);
        mmdHelper.add(mesh, { physics: false });
        handleOneLoaded();
      },
      undefined,
      (error: unknown) => handleLoadError("stage", stageUrl, error)
    );

    loader.load(
      enemyUrl,
      (mesh: THREE.SkinnedMesh) => {
        mesh.position.copy(ENEMY_POSITION);
        mesh.scale.setScalar(ENEMY_SCALE);
        scene.add(mesh);
        mmdHelper.add(mesh, { physics: false });
        sceneController.registerActor(mesh, handSideRef.current);
        handleOneLoaded();
      },
      undefined,
      (error: unknown) => handleLoadError("enemy", enemyUrl, error)
    );

    const clock = new THREE.Clock();
    const tick = () => {
      const delta = clock.getDelta();
      sceneController.setPlayerPosition(camera.position);
      mmdHelper.update(delta);
      sceneController.update(delta);
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(tick);

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      sceneController.dispose();
      startedRef.current = false;
    };
  }, [stageUrl, enemyUrl]);


  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
