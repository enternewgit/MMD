"use client";

type ViewerState = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  detail?: string;
};

type ModelOption = {
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
  models: ModelOption[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  onReset: () => void;
  onRetry: () => void;
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
  models,
  selectedModelId,
  onModelChange,
  onReset,
  onRetry,
}: MmdViewerPanelProps) {
  const statusColor = statusColorMap[state.status];
  const primaryActionLabel = isLoading ? "読み込み中..." : "再読み込み";

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
      </div>

      <label
        style={{
          display: "grid",
          gap: "8px",
          color: "#111827",
          fontWeight: 600,
        }}
      >
        モデル切り替え
        <select
          value={selectedModelId}
          onChange={(event) => onModelChange(event.target.value)}
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
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>

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