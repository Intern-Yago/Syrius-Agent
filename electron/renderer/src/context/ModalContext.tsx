import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconShieldCheck,
} from "../components/common/Icons";

export type ModalType = "primary" | "danger" | "warning" | "success" | "info";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
}

export interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  type?: "info" | "success" | "error" | "warning";
}

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration: number;
}

interface ModalContextValue {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return ctx;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // 1. Estado do Modal de Confirmação / Alerta
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    isConfirm: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type: ModalType;
    resolve?: (val: any) => void;
  } | null>(null);

  // 2. Estado dos Toasts Flutuantes
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimeoutMap = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = toastTimeoutMap.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimeoutMap.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: "success" | "error" | "info" | "warning", message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      toastTimeoutMap.current.set(id, timer);
    },
    [removeToast]
  );

  const toast = useRef({
    success: (msg: string, dur?: number) => addToast("success", msg, dur),
    error: (msg: string, dur?: number) => addToast("error", msg, dur),
    info: (msg: string, dur?: number) => addToast("info", msg, dur),
    warning: (msg: string, dur?: number) => addToast("warning", msg, dur),
  }).current;

  // Mostra um diálogo de Confirmação (Retorna Promise<boolean>)
  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        isConfirm: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "Confirmar",
        cancelText: options.cancelText || "Cancelar",
        type: options.type || "primary",
        resolve,
      });
    });
  }, []);

  // Mostra um diálogo de Alerta Estilizado (Retorna Promise<void>)
  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      const typeMap: Record<string, ModalType> = {
        error: "danger",
        warning: "warning",
        success: "success",
        info: "info",
      };
      setModalState({
        isOpen: true,
        isConfirm: false,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "Entendido",
        type: typeMap[options.type || "info"] || "info",
        resolve,
      });
    });
  }, []);

  function handleConfirm() {
    if (modalState?.resolve) {
      modalState.resolve(true);
    }
    setModalState(null);
  }

  function handleCancel() {
    if (modalState?.resolve) {
      modalState.resolve(false);
    }
    setModalState(null);
  }

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert, toast }}>
      {children}

      {/* MODAL GLOBAL ESTILIZADO */}
      {modalState?.isOpen && (
        <div
          className="custom-modal-backdrop"
          onClick={modalState.isConfirm ? handleCancel : handleConfirm}
        >
          <div
            className="custom-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderColor:
                modalState.type === "danger"
                  ? "rgba(239, 68, 68, 0.4)"
                  : modalState.type === "warning"
                  ? "rgba(234, 179, 8, 0.4)"
                  : modalState.type === "success"
                  ? "rgba(34, 197, 94, 0.4)"
                  : "rgba(56, 189, 248, 0.4)",
            }}
          >
            <div className="custom-modal-header">
              <div
                className={`custom-modal-icon custom-modal-icon-${modalState.type}`}
              >
                {modalState.type === "danger" ? (
                  <IconAlertTriangle size={22} />
                ) : modalState.type === "warning" ? (
                  <IconAlertTriangle size={22} />
                ) : modalState.type === "success" ? (
                  <IconCheck size={22} />
                ) : (
                  <IconShieldCheck size={22} />
                )}
              </div>
              <div className="custom-modal-title-box">
                <h3>{modalState.title}</h3>
              </div>
            </div>

            <div className="custom-modal-body">
              <p>{modalState.message}</p>
            </div>

            <div className="custom-modal-actions">
              {modalState.isConfirm && (
                <button
                  type="button"
                  className="btn-custom-modal btn-custom-cancel"
                  onClick={handleCancel}
                >
                  {modalState.cancelText || "Cancelar"}
                </button>
              )}

              <button
                type="button"
                className={`btn-custom-modal btn-custom-${modalState.type}`}
                onClick={handleConfirm}
                autoFocus
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS FLUTUANTES NO CANTO INFERIOR DIREITO */}
      {toasts.length > 0 && (
        <div className="custom-toast-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`custom-toast-item custom-toast-${t.type}`}
              onClick={() => removeToast(t.id)}
            >
              <div className="custom-toast-icon">
                {t.type === "success" && <IconCheck size={16} />}
                {t.type === "error" && <IconAlertTriangle size={16} />}
                {t.type === "warning" && <IconAlertTriangle size={16} />}
                {t.type === "info" && <IconShieldCheck size={16} />}
              </div>
              <div className="custom-toast-message">{t.message}</div>
              <button
                type="button"
                className="custom-toast-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalContext.Provider>
  );
}
