"use client";
import { MmdViewerCanvas } from "../component/MmdViewerCanvas";
import { useMmdViewerStatus} from "../component/useMmdViewerStatus";

export default function Home() {
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
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      {hasError && state.detail && (
        <p style={{ color: "#b00020" }}>detail: {state.detail}</p>
        )}
      {/* <button onClick = {startLoading}>loading</button> */}
      {/* <button onClick = {setReady}>ready</button> */}
      {/* <button onClick = {() => setError(new Error("読み込み失敗テスト"))}>error</button> */}
      <button onClick = {resetStatus}>reset</button>
      <p>status: {state.status}</p>
      <p>label: {statusLabel}</p>
      {/* <p>isLoading: {String(isLoading)}</p> */}
      {/* <p>isReady: {String(isReady)}</p> */}
      {/* <p>hasError: {String(hasError)}</p> */}
      <MmdViewerCanvas onStartLoading = {startLoading} onReady = {setReady} onError={setError}/>
    </main>
  );
}
