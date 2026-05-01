"use client";

import { useMemo, useState, useRef } from "react";
import { MmdViewerCanvas } from "../component/MmdViewerCanvas";
import { MmdViewerPanel } from "../component/MmdViewerPanel";
import { useMmdViewerStatus } from "../component/useMmdViewerStatus";
import type { SceneController } from "../component/scene/SceneController";

type MmdModel = {
  id: string;
  label: string;
  url: string;
};

export default function Home() {
  const controllerRef = useRef<SceneController | null>(null);

  const models: MmdModel[] = [
    {
      id: "koumakan-pmx",
      label: "紅魔館 (PMX)",
      url: "/mmd/紅魔館/紅魔館.pmx",
    },
    {
      id: "hakugyokuro-pmx",
      label: "白玉楼(PMX)",
      url: "/mmd/白玉楼/白玉楼.pmx",
    },
    {
      id: "remilia-pmx",
      label:"レミリア・スカーレット(PMX)",
      url: "/mmd/remilia/ちびレミリア/ちびレミリア.pmx",
    }
  ];
  const {
    state,
    startLoading,
    setReady,
    resetStatus,
    setError,
    isLoading,
    isReady,
    hasError,
    statusLabel,
  } = useMmdViewerStatus();

  const [selectedModelId, setSelectedModelId] = useState(models[0].id);
  const [canvasKey, setCanvasKey] = useState(0);

  const selectedModel = useMemo(() => {
    return models.find((model) => model.id === selectedModelId) ?? models[0];
  }, [selectedModelId]);

  const handleReset = () => {
    resetStatus();
  };

  const handleRetry = () => {
    resetStatus();
    setCanvasKey((prev) => prev + 1);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    resetStatus();
    setCanvasKey((prev) => prev + 1);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      <MmdViewerPanel
        state={state}
        statusLabel={statusLabel}
        isLoading={isLoading}
        isReady={isReady}
        hasError={hasError}
        models={models}
        selectedModelId={selectedModelId}
        onModelChange={handleModelChange}
        onReset={handleReset}
        onRetry={handleRetry}
      />
      <button
        type="button"
        onClick={() => {
          if (controllerRef.current) {
            controllerRef.current.spawnBullet({
              position: [0, 200, 0],
              direction: [0, 0, -1],
              speed: 900,
              life: 4,
              size: 6,
            });
          }
        }}
      >
        発射(test)
      </button>
      <MmdViewerCanvas
        key={canvasKey}
        modelUrl={selectedModel.url}
        onStartLoading={startLoading}
        onReady={setReady}
        onError={setError}
        onControllerReady={(c) => (controllerRef.current = c)}
      />
    </main>
  );
}
