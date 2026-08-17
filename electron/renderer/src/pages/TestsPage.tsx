import React, { useState, useEffect, useRef } from "react";
import { TestModuleInfo } from "../types";
import {
  IconFlask,
  IconPlay,
  IconLoader,
  IconCheck,
  IconX,
  IconRotateCcw,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
  IconTerminal,
  IconCopy,
  IconTrash2,
} from "../components/common/Icons";

interface TestsPageProps {
  onTriggerRun: (stage?: string) => void;
}

interface TestLogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp?: string;
}

interface TestRunState {
  status: "idle" | "running" | "success" | "error";
  duration?: string;
  errorMessage?: string;
  startTime?: number;
  logs: TestLogEntry[];
}

export function TestsPage({ onTriggerRun }: TestsPageProps) {
  const [tests, setTests] = useState<TestModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStates, setTestStates] = useState<Record<string, TestRunState>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [selectedTestForModal, setSelectedTestForModal] = useState<string | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [activeTabModal, setActiveTabModal] = useState<"TERMINAL" | "JSON">("TERMINAL");

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const TESTS_PER_PAGE = 6;

  async function loadTests() {
    try {
      setLoading(true);
      if (!window.electronAPI?.getTests) {
        console.warn("window.electronAPI.getTests não disponível.");
        setTests([]);
        return;
      }
      const list = await window.electronAPI.getTests();
      setTests(list);
    } catch (err) {
      console.error("Erro ao carregar testes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();

    // Listener de logs em tempo real
    if (window.electronAPI?.onTestLog) {
      const unsub = window.electronAPI.onTestLog((log) => {
        setTestStates((prev) => {
          const current = prev[log.filename] || { status: "running", logs: [] };
          const newLogs = [...(current.logs || []), { type: log.type, message: log.message, timestamp: log.timestamp || new Date().toLocaleTimeString("pt-BR") }];
          return {
            ...prev,
            [log.filename]: {
              ...current,
              logs: newLogs,
            },
          };
        });
      });
      return () => unsub();
    }
  }, []);

  // Auto-scroll do terminal quando logs chegam
  useEffect(() => {
    if (selectedTestForModal) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [testStates, selectedTestForModal]);

  const categories = Array.from(new Set(["all", ...tests.map((t) => t.category)])).filter(Boolean);

  const filteredTests = activeCategory === "all"
    ? tests
    : tests.filter((t) => t.category === activeCategory);

  const runningTests = Object.entries(testStates).filter(([_, state]) => state.status === "running");
  const runningCount = runningTests.length;

  async function executeTest(test: TestModuleInfo) {
    const filename = test.filename;

    setTestStates((curr) => ({
      ...curr,
      [filename]: { status: "running", startTime: Date.now(), logs: [{ type: "info", message: `🚀 Iniciando execução de ${filename}...`, timestamp: new Date().toLocaleTimeString("pt-BR") }] },
    }));

    try {
      const result = await window.electronAPI.runTest(filename);

      if (result.success) {
        setTestStates((curr) => ({
          ...curr,
          [filename]: {
            ...curr[filename],
            status: "success",
            duration: result.duration,
          },
        }));
      } else {
        setTestStates((curr) => ({
          ...curr,
          [filename]: {
            ...curr[filename],
            status: "error",
            duration: result.duration,
            errorMessage: result.message || "Falha na execução do teste.",
          },
        }));
      }
    } catch (err) {
      setTestStates((curr) => ({
        ...curr,
        [filename]: {
          ...curr[filename],
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido ao executar teste.",
        },
      }));
    }
  }

  async function handleCancelTest(filename: string) {
    try {
      if (window.electronAPI?.cancelTest) {
        await window.electronAPI.cancelTest(filename);
      }
      setTestStates((curr) => ({
        ...curr,
        [filename]: {
          ...curr[filename],
          status: "error",
          errorMessage: "Execução cancelada pelo usuário.",
        },
      }));
    } catch (err) {
      console.error("Erro ao cancelar teste:", err);
    }
  }

  function handleCopyLogs(logs: TestLogEntry[]) {
    const text = logs.map((l) => `[${l.timestamp || ""}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  }

  function extractJsonFromLogs(logs: TestLogEntry[]): any[] {
    const jsonObjects: any[] = [];
    const fullText = logs.map((l) => l.message).join("\n");

    const jsonMatches = fullText.match(/\{[\s\S]*?\}/g) || [];
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match);
        if (typeof parsed === "object" && parsed !== null && Object.keys(parsed).length > 0) {
          jsonObjects.push(parsed);
        }
      } catch {}
    }
    return jsonObjects;
  }

  const selectedLogs = selectedTestForModal ? testStates[selectedTestForModal]?.logs || [] : [];
  const selectedJsonPayloads = extractJsonFromLogs(selectedLogs);

  return (
    <div className="tests-page-container">
      {/* FLOATING STATUS WIDGET: TESTES RODANDO EM BACKGROUND */}
      {runningCount > 0 && (
        <div
          onClick={() => {
            if (runningTests[0]) setSelectedTestForModal(runningTests[0][0]);
          }}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(168, 85, 247, 0.95))",
            color: "#ffffff",
            padding: "12px 18px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            animation: "pulse 2s infinite ease-in-out",
          }}
          title="Clique para abrir o terminal de execução em tempo real"
        >
          <IconLoader size={16} color="#ffffff" />
          <div>
            <strong style={{ fontSize: "12px", display: "block", lineHeight: "1.2" }}>
              {runningCount} {runningCount === 1 ? "Teste em Execução..." : "Testes em Execução..."}
            </strong>
            <span style={{ fontSize: "10px", opacity: 0.9 }}>
              {runningTests[0]?.[0]} (Clique para ver logs)
            </span>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="page-header">
        <div>
          <div className="section-tag">
            <span className="section-dot" />
            <span>AUTO-DISCOVERY TEST ENGINE</span>
          </div>
          <h2>Central de Testes Unitários & Diagnósticos</h2>
          <p>
            Módulos detectados automaticamente em <code>src/tests/</code> com execução isolada, streaming de logs e inspeção de respostas de APIs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {runningCount > 0 && (
            <span style={{ fontSize: "11px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "6px 12px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700" }}>
              <IconLoader size={12} />
              <span>{runningCount} RODANDO AGORA</span>
            </span>
          )}

          <button className="primary-button" onClick={loadTests} disabled={loading}>
            <IconRotateCcw size={13} />
            <span>Atualizar Testes</span>
          </button>
        </div>
      </div>

      {/* BARRA DE CATEGORIAS */}
      {categories.length > 2 && (
        <div className="test-categories-bar" style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === "all" ? `Todos (${tests.length})` : cat}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconLoader size={24} />
          </div>
          <h2>Escaneando diretório de testes...</h2>
          <p>Lendo arquivos e extraindo descritivos de <code>src/tests/</code>.</p>
        </div>
      )}

      {!loading && tests.length === 0 && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconFlask size={28} />
          </div>
          <h2>Nenhum teste encontrado</h2>
          <p>Crie arquivos como <code>src/tests/test-exemplo.ts</code> com docstrings para aparecerem aqui automaticamente.</p>
          <button className="primary-button" onClick={loadTests}>
            <IconRotateCcw size={12} />
            <span>Verificar novamente</span>
          </button>
        </div>
      )}

      {!loading && tests.length > 0 && (
        <>
          <div className="tests-grid">
            {filteredTests
              .slice((currentPageNum - 1) * TESTS_PER_PAGE, currentPageNum * TESTS_PER_PAGE)
              .map((test) => {
                const state = testStates[test.filename] || { status: "idle", logs: [] };
                const isRunning = state.status === "running";
                const hasLogs = state.logs && state.logs.length > 0;

                return (
                  <div
                    key={test.id}
                    className={`test-module-card state-${state.status}`}
                    style={{
                      border: isRunning ? "1px solid #38bdf8" : undefined,
                      boxShadow: isRunning ? "0 0 20px rgba(56, 189, 248, 0.25)" : undefined,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div className="test-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="test-card-icon" style={{ color: isRunning ? "#38bdf8" : undefined }}>
                        <IconFlask size={20} />
                      </div>

                      <span className={`badge-pill badge-${state.status === "success" ? "success" : state.status === "error" ? "error" : state.status === "running" ? "running" : "pending"}`}>
                        {state.status === "running" && <><IconLoader size={11} /> Teste sendo executado...</>}
                        {state.status === "success" && <><IconCheck size={11} /> Concluído ({state.duration})</>}
                        {state.status === "error" && <><IconX size={11} /> Falhou</>}
                        {state.status === "idle" && "Pronto"}
                      </span>
                    </div>

                    <h3>{test.title}</h3>
                    <p>{test.description}</p>

                    <div className="test-card-meta">
                      <span>Arquivo: <code>{test.filename}</code></span>
                    </div>

                    {state.errorMessage && (
                      <div className="kanban-error-box" style={{ marginBottom: "12px" }}>
                        <div className="kanban-error-title">
                          <IconX size={12} />
                          <span>Falha na Execução</span>
                        </div>
                        <p className="kanban-error-msg">{state.errorMessage}</p>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "12px" }}>
                      <button
                        className="btn-test-action"
                        onClick={() => executeTest(test)}
                        disabled={isRunning}
                        style={{ flex: 1 }}
                      >
                        {isRunning ? (
                          <>
                            <IconLoader size={12} />
                            <span>Executando...</span>
                          </>
                        ) : (
                          <>
                            <IconPlay size={12} />
                            <span>{state.status === "success" ? "Rodar Novamente" : "Executar Teste"}</span>
                          </>
                        )}
                      </button>

                      {/* BOTÃO PARA VER LOGS & RESPOSTA DE API */}
                      {hasLogs && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setSelectedTestForModal(test.filename)}
                          style={{ padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          title="Abrir Terminal de Logs e Respostas de API"
                        >
                          <IconTerminal size={13} />
                          <span>Logs</span>
                        </button>
                      )}

                      {/* BOTÃO DE CANCELAR SE ESTIVER RODANDO */}
                      {isRunning && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleCancelTest(test.filename)}
                          style={{ padding: "0 10px", fontSize: "11px", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                          title="Interromper execução deste teste"
                        >
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {Math.ceil(filteredTests.length / TESTS_PER_PAGE) > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "24px" }}>
              <button
                className="slide-nav-button"
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(p - 1, 1))}
              >
                <IconChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <span style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: "600" }}>
                Página {currentPageNum} de {Math.ceil(filteredTests.length / TESTS_PER_PAGE)}
              </span>

              <button
                className="slide-nav-button"
                disabled={currentPageNum === Math.ceil(filteredTests.length / TESTS_PER_PAGE)}
                onClick={() => setCurrentPageNum((p) => Math.min(p + 1, Math.ceil(filteredTests.length / TESTS_PER_PAGE)))}
              >
                <span>Próximo</span>
                <IconChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL / TERMINAL DE LOGS & RESPOSTAS DE API */}
      {selectedTestForModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setSelectedTestForModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "880px",
              maxHeight: "85vh",
              background: "#09090b",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "16px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO TERMINAL */}
            <div
              style={{
                padding: "16px 20px",
                background: "#111114",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
                </div>
                <strong style={{ fontSize: "13px", color: "#fafafa", fontFamily: "monospace" }}>
                  {selectedTestForModal}
                </strong>
                {testStates[selectedTestForModal]?.status === "running" && (
                  <span style={{ fontSize: "10px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                    EXECUTANDO EM TEMPO REAL...
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* ABAS DO MODAL */}
                <div style={{ display: "flex", background: "#09090b", borderRadius: "6px", padding: "2px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <button
                    type="button"
                    onClick={() => setActiveTabModal("TERMINAL")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      background: activeTabModal === "TERMINAL" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                      color: activeTabModal === "TERMINAL" ? "#38bdf8" : "#71717a",
                    }}
                  >
                    Console ({selectedLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabModal("JSON")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      borderRadius: "5px",
                      border: "none",
                      cursor: "pointer",
                      background: activeTabModal === "JSON" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                      color: activeTabModal === "JSON" ? "#c084fc" : "#71717a",
                    }}
                  >
                    Respostas JSON ({selectedJsonPayloads.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyLogs(selectedLogs)}
                  className="secondary-button"
                  style={{ padding: "6px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  title="Copiar logs completos"
                >
                  <IconCopy size={12} />
                  <span>{copiedLogs ? "Copiado!" : "Copiar"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTestForModal(null)}
                  style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "4px" }}
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>

            {/* CORPO DO TERMINAL */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "1.6",
                background: "#09090b",
              }}
            >
              {activeTabModal === "TERMINAL" && (
                <div>
                  {selectedLogs.length === 0 ? (
                    <div style={{ color: "#71717a", textAlign: "center", padding: "40px 0" }}>
                      Nenhum log registrado para este teste ainda.
                    </div>
                  ) : (
                    selectedLogs.map((entry, idx) => {
                      let color = "#d4d4d8";
                      if (entry.type === "success") color = "#34d399";
                      if (entry.type === "error") color = "#f87171";
                      if (entry.type === "warning") color = "#fbbf24";

                      return (
                        <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "4px", wordBreak: "break-word" }}>
                          <span style={{ color: "#52525b", userSelect: "none", minWidth: "65px", fontSize: "11px" }}>
                            {entry.timestamp || ""}
                          </span>
                          <span style={{ color, flex: 1, whiteSpace: "pre-wrap" }}>
                            {entry.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={terminalEndRef} />
                </div>
              )}

              {activeTabModal === "JSON" && (
                <div>
                  {selectedJsonPayloads.length === 0 ? (
                    <div style={{ color: "#71717a", textAlign: "center", padding: "40px 0" }}>
                      Nenhum payload JSON retornado pela API neste teste.
                    </div>
                  ) : (
                    selectedJsonPayloads.map((payload, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#111114",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          padding: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", color: "#c084fc", fontWeight: "700" }}>
                            Payload / Resposta da API #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(payload, null, 2))}
                            className="secondary-button"
                            style={{ padding: "2px 8px", fontSize: "10px" }}
                          >
                            Copiar JSON
                          </button>
                        </div>
                        <pre style={{ margin: 0, color: "#38bdf8", overflowX: "auto", fontSize: "11px" }}>
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* RODAPÉ DO MODAL */}
            <div
              style={{
                padding: "12px 20px",
                background: "#111114",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                color: "#71717a",
              }}
            >
              <span>Total de linhas de log: {selectedLogs.length}</span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedTestForModal(null)}
                style={{ padding: "6px 14px", fontSize: "11px" }}
              >
                Fechar Terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
