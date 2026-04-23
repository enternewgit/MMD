import { MmdViewerCanvas } from "../component/MmdViewerCanvas";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <MmdViewerCanvas />
    </main>
  );
}
