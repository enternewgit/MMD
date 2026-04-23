"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";

export function MmdViewerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const width = 960;
    const height = 540;
    const canvas = canvasRef.current;
    if (!canvas) {
      initializedRef.current = false;
      return;
    }

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
    renderer.setSize(width, height);
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

    const loader = new MMDLoader(loadingManager);
    const modelUrl = "/mmd/紅魔館/紅魔館.pmx";
    loader.load(
      modelUrl,
      (mesh: THREE.SkinnedMesh) => {
        scene.add(mesh);
        mmdHelper.add(mesh, { physics: false });
      },
      undefined,
      (error: unknown) => {
        console.error("PMX load error. Check model path:", modelUrl, error);
      }
    );

    const clock = new THREE.Clock();
    const tick = () => {
      const delta = clock.getDelta();
      mmdHelper.update(delta);
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(tick);

    return () => {
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      initializedRef.current = false;
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "960px", height: "540px", maxWidth: "100%" }} />;
}
