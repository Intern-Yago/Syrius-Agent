import React, { useEffect, useState } from "react";

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.isWindowMaximized) {
      window.electronAPI.isWindowMaximized().then(setIsMaximized).catch(() => {});
    }

    if (window.electronAPI?.onWindowMaximizedChange) {
      const unsub = window.electronAPI.onWindowMaximizedChange((max) => {
        setIsMaximized(max);
      });
      return () => unsub();
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleToggleMaximize = async () => {
    if (window.electronAPI?.maximizeWindow) {
      const state = await window.electronAPI.maximizeWindow();
      setIsMaximized(state);
    }
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  return (
    <div className="custom-window-controls" style={{ WebkitAppRegion: "no-drag" as any }}>
      <button
        type="button"
        className="win-ctrl-btn"
        onClick={handleMinimize}
        title="Minimizar para a barra de tarefas"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>

      <button
        type="button"
        className="win-ctrl-btn"
        onClick={handleToggleMaximize}
        title={isMaximized ? "Restaurar tamanho" : "Maximizar janela"}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M2.5 1.5h6v6h-6z" />
            <path d="M1.5 3.5h-1v6h6v-1" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="win-ctrl-btn win-ctrl-close"
        onClick={handleClose}
        title="Ocultar janela (Continua rodando em segundo plano no Tray)"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M1 1l8 8M9 1l-8 8" />
        </svg>
      </button>
    </div>
  );
}
