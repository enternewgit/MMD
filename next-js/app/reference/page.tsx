import Link from "next/link";

type ParamDoc = {
  name: string;
  default: string;
  note?: string;
};

type CommandDoc = {
  name: string;
  args: ParamDoc[];
  description: string;
};

const bulletCommands: CommandDoc[] = [
  {
    name: "single",
    args: [
      { name: "speed", default: "600" },
      { name: "life", default: "5" },
      { name: "size", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description: "弾を1発だけ、正面(-Z方向)に発射する。",
  },
  {
    name: "ring",
    args: [
      { name: "count", default: "12" },
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "size", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description: "水平面(XZ平面)で全方位に均等に広がるリング状の弾幕。",
  },
  {
    name: "ring3d",
    args: [
      { name: "count", default: "12" },
      { name: "pitchDeg", default: "15", note: "上向き角度" },
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "size", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description: "ringを上方向にpitchDeg分だけ傾けた、円錐状に広がる3Dリング。",
  },
  {
    name: "fan",
    args: [
      { name: "count", default: "9" },
      { name: "spreadDeg", default: "30", note: "扇の開き角" },
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "size", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description: "正面(-Z方向)を中心に扇状に広がる弾幕。count=1の場合は正面へ1発のみ。",
  },
  {
    name: "aimingShot",
    args: [
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "size", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description: "発射した瞬間の自機(カメラ)座標を狙って1発だけ発射する（追尾はしない）。",
  },
  {
    name: "avoidingShot",
    args: [
      { name: "count", default: "12" },
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description:
      "リング状に発射するが、自機側を向く半分は間引かれる（自機の反対側だけに壁を作るイメージ）。sizeは指定不可（常に4）。",
  },
  {
    name: "nway",
    args: [
      { name: "count", default: "3" },
      { name: "angleGapDeg", default: "45", note: "弾同士の角度差" },
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description: "自機方向を中心にangleGapDeg間隔でcount本の弾を扇状に発射する。sizeは指定不可。",
  },
  {
    name: "scatter",
    args: [
      { name: "count", default: "12" },
      { name: "speed", default: "600" },
      { name: "life", default: "4" },
      { name: "color", default: "0xff0000" },
    ],
    description:
      "3D空間のランダムな方向(水平360°・上下±45°)へ弾をばら撒く。sizeは指定不可。",
  },
];

const laserCommands: CommandDoc[] = [
  {
    name: "laser",
    args: [
      { name: "width", default: "10" },
      { name: "length", default: "500" },
      { name: "life", default: "3" },
      { name: "color", default: "0xff0000" },
    ],
    description: "正面(-Z方向)へまっすぐ伸びるレーザー。",
  },
  {
    name: "laserSpin",
    args: [
      { name: "width", default: "10" },
      { name: "length", default: "500" },
      { name: "angularVel", default: "π (約3.14)", note: "rad/秒" },
      { name: "life", default: "3" },
      { name: "color", default: "0xff0000" },
    ],
    description: "Y軸を中心にangularVelの速さで回転し続けるレーザー。",
  },
  {
    name: "laserSweep",
    args: [
      { name: "width", default: "10" },
      { name: "length", default: "500" },
      { name: "sweepSpeedDeg", default: "90", note: "deg/秒" },
      { name: "totalSweepDeg", default: "90", note: "往復する総角度" },
      { name: "life", default: "3" },
      { name: "color", default: "0xff0000" },
    ],
    description: "totalSweepDegの範囲をsweepSpeedDegの速さで左右に往復し続けるレーザー。",
  },
  {
    name: "laserAiming",
    args: [
      { name: "width", default: "10" },
      { name: "length", default: "500" },
      { name: "life", default: "3" },
      { name: "color", default: "0xff0000" },
    ],
    description: "発射した瞬間の自機(カメラ)座標を狙って1本だけ発射する（追尾はしない）。",
  },
];

const controlCommands: CommandDoc[] = [
  {
    name: "delay",
    args: [{ name: "seconds", default: "-" }],
    description: "以降のコマンドの実行タイミングをseconds秒だけ後ろにずらす。",
  },
  {
    name: "wait",
    args: [{ name: "seconds", default: "-" }],
    description: "delayと同じ効果（別名）。",
  },
  {
    name: "loop",
    args: [
      { name: "delay", default: "-", note: "初回発射までの遅延(秒)" },
      { name: "period", default: "-", note: "繰り返し間隔(秒)" },
      { name: "count", default: "無限", note: "省略すると無限リピート" },
    ],
    description:
      "次の行に書かれたコマンド(1つ目)を、period秒間隔でcount回繰り返す。書式: loop(delay, period[, count]) の次の行にパターンを1つだけ書く。",
  },
];

function ArgTable({ command }: { command: CommandDoc }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "14px 16px",
        display: "grid",
        gap: "8px",
        background: "#ffffff",
      }}
    >
      <code
        style={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: "15px",
          color: "#0f172a",
        }}
      >
        {command.name}({command.args.map((a) => a.name).join(", ")})
      </code>
      <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>
        {command.description}
      </p>
      {command.args.length > 0 && (
        <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={thStyle}>引数</th>
              <th style={thStyle}>デフォルト</th>
              <th style={thStyle}>備考</th>
            </tr>
          </thead>
          <tbody>
            {command.args.map((a) => (
              <tr key={a.name}>
                <td style={tdStyle}>
                  <code>{a.name}</code>
                </td>
                <td style={tdStyle}>{a.default}</td>
                <td style={{ ...tdStyle, color: "#64748b" }}>{a.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "4px 10px 4px 0",
  color: "#64748b",
  fontWeight: 600,
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "4px 10px 4px 0",
  color: "#111827",
};

export default function ReferencePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      <div style={{ width: "min(880px, 100%)", display: "grid", gap: "24px" }}>
        <div>
          <Link href="/" style={{ color: "#2563eb", fontSize: "14px" }}>
            ← 弾幕ビューアーに戻る
          </Link>
          <h1 style={{ margin: "8px 0 4px", fontSize: "24px", color: "#0f172a" }}>
            弾幕コマンド リファレンス
          </h1>
          <p style={{ margin: 0, color: "#4b5563" }}>
            ビューアーの「弾幕コマンド」欄に入力するパターン言語の仕様一覧。
          </p>
        </div>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px 20px",
            background: "#ffffff",
            display: "grid",
            gap: "8px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>構文</h2>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155", fontSize: "14px", display: "grid", gap: "4px" }}>
            <li>
              <strong>改行</strong> = 順次実行。行が変わるごとに自動で0.1秒の間隔が入る。
            </li>
            <li>
              <strong>セミコロン(;)</strong> = 同時実行。同じ行に並べたコマンドは同じタイミングで発射される。
            </li>
            <li>
              コマンド名の後の丸カッコは省略可能。引数を省略すると右のデフォルト値が使われる（例:
              <code> ring() </code> は <code>ring(12, 600, 4, 4, 0xff0000)</code> と同じ）。
            </li>
            <li>
              色は <code>0xRRGGBB</code> 形式の数値で指定する（10進数でも可）。よく使う色:
              赤 <code>0xff0000</code>／緑 <code>0x00ff00</code>／青 <code>0x0000ff</code>／黄
              <code>0xffff00</code>／白 <code>0xffffff</code>。
            </li>
          </ul>
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px 20px",
            background: "#ffffff",
            display: "grid",
            gap: "8px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>発生源・照準について</h2>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155", fontSize: "14px", display: "grid", gap: "4px" }}>
            <li>
              すべての弾・レーザーは、選択中の「敵」モデルの手のボーン(既定は右手先→右手首→右手→右腕の順で見つかったもの)のワールド座標から発射される。「発射位置」トグルで右手/左手を切り替え可能。
              該当ボーンが無いモデルではモデル自体の座標にフォールバックし、敵が未登録の場合は座標(0, 200, 0)にフォールバックする。
            </li>
            <li>
              <code>aimingShot</code> / <code>nway</code> / <code>avoidingShot</code> /{" "}
              <code>laserAiming</code> の「自機」は、現在のカメラ座標を指す。発射した瞬間の位置を狙うだけで、発射後に追尾はしない。
            </li>
            <li>被弾判定は自機から半径18+弾サイズ以内、かすり判定は半径45+弾サイズ以内で発生する（1発につきかすりは1回だけカウント）。</li>
          </ul>
        </section>

        <section style={{ display: "grid", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>弾幕パターン</h2>
          {bulletCommands.map((c) => (
            <ArgTable key={c.name} command={c} />
          ))}
        </section>

        <section style={{ display: "grid", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>レーザー</h2>
          {laserCommands.map((c) => (
            <ArgTable key={c.name} command={c} />
          ))}
        </section>

        <section style={{ display: "grid", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>制御コマンド</h2>
          {controlCommands.map((c) => (
            <ArgTable key={c.name} command={c} />
          ))}
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px 20px",
            background: "#ffffff",
            display: "grid",
            gap: "10px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>サンプル</h2>
          {[
            ["ring(12); fan(9, 30)", "リングと扇を同時発射"],
            ["ring(16, 400, 5)\nring3d(16, 30, 400, 5)", "水平リングの0.1秒後に傾いたリングを追い打ち"],
            ["loop(0, 0.5, 10)\naimingShot(700)", "0.5秒間隔で自機狙いを10連射"],
            ["laserSweep(12, 600, 60, 120, 4)", "左右に往復するレーザー"],
          ].map(([code, label]) => (
            <div key={code} style={{ display: "grid", gap: "4px" }}>
              <pre
                style={{
                  margin: 0,
                  background: "#0f172a",
                  color: "#e2e8f0",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  overflowX: "auto",
                }}
              >
                {code}
              </pre>
              <span style={{ color: "#64748b", fontSize: "13px" }}>{label}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
