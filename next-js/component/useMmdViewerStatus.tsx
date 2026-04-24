// 読み込み中・成功・エラー表示専用
import { useMemo, useState } from "react";

type ViewerStatus = "idle" | "loading" | "ready" | "error";

type ViewerState = {
    status: ViewerStatus;
    message:string;
    detail?: string;
};

const initialViewerState: ViewerState = {
    status: "idle",
    message:"未読み込み",
};

function formatUnknownError(error: unknown): string{
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try{
        return JSON.stringify(error);
    }catch{
        return String(error);
    }
}
export function useMmdViewerStatus(){
    const [state, setState] = useState<ViewerState>(initialViewerState);

    const startLoading = () => {
        setState({
            status: "loading",
            message:"読み込み中",
            detail: undefined,
        });
    };

    const setReady = () => {
        setState({
            status: "ready",
            message: "準備完了",
            detail: undefined,
        });
    };

    const resetStatus = () => {
        setState(initialViewerState);
    };

    const setError = (error:unknown)=>{
        const detail = formatUnknownError(error);
        console.error("MMD load error:", error);
        setState({
            status:"error",
            message:"読み込みに失敗しました",
            detail,
        })
    }

    const isLoading = state.status === "loading";
    const isReady = state.status === "ready";
    const hasError = state.status === "error";

    const statusLabel = useMemo(() => {
        switch (state.status){
            case "idle":
                return "未読み込み";
            case "loading":
                return "読み込み中";
            case "ready":
                return "準備完了";
            case "error":
                return "エラー";
            default:
                return "不明";
        }
    },[state.status]);

    return {
        state,
        startLoading,
        setReady,
        resetStatus,
        setError,
        isLoading,
        isReady,
        hasError,
        statusLabel,
    }
}
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