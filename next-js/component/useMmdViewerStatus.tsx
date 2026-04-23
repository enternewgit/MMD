// 読み込み中・成功・エラー表示専用
//
// TODO: このファイルで実装する機能
// 1) MMDビューアの状態を一元管理する
//    - status: "idle" | "loading" | "ready" | "error"
//    - message: UIに表示する短い文言
//    - detail: 任意の詳細エラー(文字列)
//
// 2) Canvas側から呼ぶ状態更新APIを提供する
//    - startLoading(): 読み込み開始
//    - setReady(): 読み込み成功
//    - setError(error): 読み込み失敗
//    - resetStatus(): 初期状態に戻す(再読込用)
//
// 3) Panel側で使いやすい派生値を返す
//    - isLoading, isReady, hasError
//    - statusLabel (例: "読み込み中", "準備完了", "エラー")
//
// 4) エラーメッセージを安全に整形する
//    - unknown を受けても文字列化できるようにする
//    - 開発時は console 用の詳細、UIには短い文言を分ける
//
// 5) 将来の拡張を見据えた構造にする
//    - 進捗率(progress 0-100)を後から追加しやすい形
//    - modelUrlや再試行回数の管理を追加しやすい形