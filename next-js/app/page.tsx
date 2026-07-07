"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MmdViewerCanvas } from "../component/MmdViewerCanvas";
import { MmdViewerPanel } from "../component/MmdViewerPanel";
import { useMmdViewerStatus } from "../component/useMmdViewerStatus";
import type { SceneController, HandSide } from "../component/scene/SceneController";

type StageOption = {
  id: string;
  label: string;
  url: string;
};

type EnemyOption = {
  id: string;
  label: string;
  url: string;
};

const STAGES: StageOption[] = [
  {
    id: "koumakan",
    label: "紅魔館",
    url: "/mmd/紅魔館/紅魔館.pmx",
  },
  {
    id: "hakugyokuro",
    label: "白玉楼",
    url: "/mmd/白玉楼/白玉楼.pmx",
  },
];

const ENEMIES: EnemyOption[] = [
  {
    id: "remilia-chibi",
    label: "レミリア・スカーレット(ちび)",
    url: "/mmd/remilia/ちびレミリア/ちびレミリア.pmx",
  },
];

export default function Home() {
  const controllerRef = useRef<SceneController | null>(null);
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

  const [selectedStageId, setSelectedStageId] = useState(STAGES[0].id);
  const [selectedEnemyId, setSelectedEnemyId] = useState(ENEMIES[0].id);
  const [canvasKey, setCanvasKey] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [grazeCount, setGrazeCount] = useState(0);
  const [handSide, setHandSide] = useState<HandSide>("right");

  const selectedStage = useMemo(() => {
    return STAGES.find((stage) => stage.id === selectedStageId) ?? STAGES[0];
  }, [selectedStageId]);

  const selectedEnemy = useMemo(() => {
    return ENEMIES.find((enemy) => enemy.id === selectedEnemyId) ?? ENEMIES[0];
  }, [selectedEnemyId]);

  const handleReset = () => {
    resetStatus();
  };

  const handleRetry = () => {
    resetStatus();
    setCanvasKey((prev) => prev + 1);
  };

  const handleStageChange = (stageId: string) => {
    setSelectedStageId(stageId);
    resetStatus();
    setCanvasKey((prev) => prev + 1);
    setHitCount(0);
    setGrazeCount(0);
  };

  const handleEnemyChange = (enemyId: string) => {
    setSelectedEnemyId(enemyId);
    resetStatus();
    setCanvasKey((prev) => prev + 1);
    setHitCount(0);
    setGrazeCount(0);
  };

  const handleHandSideChange = (side: HandSide) => {
    setHandSide(side);
    controllerRef.current?.setHandSide(side); // 読み込み済みなら即座に切り替える
  };

  const handleFirePattern = (pattern: string) => {
    const controller = controllerRef.current;
    if (!controller) return;
    const error = controller.firePattern(pattern);
    if (error) {
      setError(new Error(error));
    }
  };

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        background: "#0f172a",
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0, position: "relative" }}>
        <MmdViewerCanvas
          key={canvasKey}
          stageUrl={selectedStage.url}
          enemyUrl={selectedEnemy.url}
          handSide={handSide}
          onStartLoading={startLoading}
          onReady={setReady}
          onError={setError}
          onControllerReady={(controller) => {
            controllerRef.current = controller;
          }}
          onPlayerHit={() => setHitCount((prev) => prev + 1)}
          onGraze={() => setGrazeCount((prev) => prev + 1)}
        />
      </div>

      <aside
        style={{
          width: "380px",
          flex: "0 0 auto",
          overflowY: "auto",
          padding: "24px",
          background: "#f8fafc",
          borderLeft: "1px solid #e5e7eb",
          display: "grid",
          gap: "16px",
          alignContent: "start",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <Link href="/reference" style={{ color: "#2563eb", fontSize: "14px" }}>
            弾幕コマンドリファレンス →
          </Link>
        </div>
        <MmdViewerPanel
          state={state}
          statusLabel={statusLabel}
          isLoading={isLoading}
          isReady={isReady}
          hasError={hasError}
          stages={STAGES}
          selectedStageId={selectedStageId}
          onStageChange={handleStageChange}
          enemies={ENEMIES}
          selectedEnemyId={selectedEnemyId}
          onEnemyChange={handleEnemyChange}
          onReset={handleReset}
          onRetry={handleRetry}
          onFirePattern={handleFirePattern}
          hitCount={hitCount}
          grazeCount={grazeCount}
          handSide={handSide}
          onHandSideChange={handleHandSideChange}
        />
      </aside>
    </main>
  );
}
