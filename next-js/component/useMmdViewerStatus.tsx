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
