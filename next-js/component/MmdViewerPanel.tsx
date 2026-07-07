"use client";

import { useState } from "react";
import type { HandSide } from "./scene/SceneController";

type ViewerState = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  detail?: string;
};

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

type MmdViewerPanelProps = {
  state: ViewerState;
  statusLabel: string;
  isLoading: boolean;
  isReady: boolean;
  hasError: boolean;
  stages: StageOption[];
  selectedStageId: string;
  onStageChange: (stageId: string) => void;
  enemies: EnemyOption[];
  selectedEnemyId: string;
  onEnemyChange: (enemyId: string) => void;
  onReset: () => void;
  onRetry: () => void;
  onFirePattern: (pattern: string) => void;
  hitCount: number;
  grazeCount: number;
  handSide: HandSide;
  onHandSideChange: (side: HandSide) => void;
};

const statusColorMap: Record<ViewerState["status"], string> = {
  idle: "#6b7280",
  loading: "#2563eb",
  ready: "#16a34a",
  error: "#b91c1c",
};

export function MmdViewerPanel({
  state,
  statusLabel,
  isLoading,
  isReady,
  hasError,
  stages,
  selectedStageId,
  onStageChange,
  enemies,
  selectedEnemyId,
  onEnemyChange,
  onReset,
  onRetry,
  onFirePattern,
  hitCount,
  grazeCount,
  handSide,
  onHandSideChange,
}: MmdViewerPanelProps) {
  const statusColor = statusColorMap[state.status];
  const primaryActionLabel = isLoading ? "読み込み中..." : "再読み込み";
  const [patternText, setPatternText] = useState("ring(12)");

  return (
    <section
      aria-live="polite"
      style={{
        width: "min(960px, 100%)",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
        display: "grid",
        gap: "12px",
        background: "#ffffff",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          aria-hidden="true"
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            background: statusColor,
            boxShadow: `0 0 0 4px ${statusColor}22`,
          }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>{statusLabel}</p>
          <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>
            {state.message}
          </p>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 700,
            color: hitCount > 0 ? "#b91c1c" : "#111827",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          被弾: {hitCount}
        </span>
        <span
          style={{
            fontWeight: 700,
            color: "#2563eb",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          かすり: {grazeCount}
        </span>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <label
          style={{
            display: "grid",
            gap: "8px",
            color: "#111827",
            fontWeight: 600,
            flex: "1 1 200px",
          }}
        >
          ステージ
          <select
            value={selectedStageId}
            onChange={(event) => onStageChange(event.target.value)}
            disabled={isLoading}
            style={{
              width: "100%",
              maxWidth: "360px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "10px 12px",
              background: isLoading ? "#f8fafc" : "#ffffff",
              color: "#111827",
            }}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "grid",
            gap: "8px",
            color: "#111827",
            fontWeight: 600,
            flex: "1 1 200px",
          }}
        >
          敵
          <select
            value={selectedEnemyId}
            onChange={(event) => onEnemyChange(event.target.value)}
            disabled={isLoading}
            style={{
              width: "100%",
              maxWidth: "360px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "10px 12px",
              background: isLoading ? "#f8fafc" : "#ffffff",
              color: "#111827",
            }}
          >
            {enemies.map((enemy) => (
              <option key={enemy.id} value={enemy.id}>
                {enemy.label}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: "grid",
            gap: "8px",
            color: "#111827",
            fontWeight: 600,
            flex: "1 1 200px",
          }}
        >
          発射位置
          <div style={{ display: "flex", gap: "8px" }}>
            {(["right", "left"] as HandSide[]).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => onHandSideChange(side)}
                style={{
                  flex: "1 1 0",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: handSide === side ? "#0f172a" : "#ffffff",
                  color: handSide === side ? "#ffffff" : "#111827",
                }}
              >
                {side === "right" ? "右手" : "左手"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(hasError || state.detail) && (
        <details
          open={hasError}
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            エラー詳細
          </summary>
          <p style={{ margin: "8px 0 0", fontSize: "14px" }}>
            {state.detail ?? "不明"}
          </p>
        </details>
      )}

      <div style={{ display: "grid", gap: "8px" }}>
        <label style={{ fontWeight: 600, color: "#111827" }}>弾幕コマンド</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <textarea
            value={patternText}
            onChange={(event) => setPatternText(event.target.value)}
            placeholder="ring(12); fan(9, 30)&#10;&#10;ring3d(12, 20)"
            style={{
              flex: "1 1 260px",
              minWidth: "200px",
              minHeight: "80px",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "10px 12px",
              fontFamily: "monospace",
              fontSize: "13px",
              resize: "vertical",
            }}
          />
          <button
            type="button"
            onClick={() => onFirePattern(patternText)}
            disabled={isLoading}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "8px 16px",
              fontWeight: 600,
              color: "#ffffff",
              background: isLoading ? "#94a3b8" : "#0f172a",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            発射
          </button>
        </div>
        <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
          例: single(); ring(12, 600); ring3d(12, 20); fan(9, 30)
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onRetry}
          disabled={isLoading}
          style={{
            border: "none",
            borderRadius: "999px",
            padding: "8px 16px",
            fontWeight: 600,
            color: "#ffffff",
            background: isLoading ? "#93c5fd" : "#2563eb",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {primaryActionLabel}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading || isReady}
          style={{
            border: "1px solid #cbd5f5",
            borderRadius: "999px",
            padding: "8px 16px",
            fontWeight: 600,
            color: "#1e3a8a",
            background: "#eef2ff",
            cursor: isLoading || isReady ? "not-allowed" : "pointer",
          }}
        >
          ステータスをリセット
        </button>
      </div>
    </section>
  );
}