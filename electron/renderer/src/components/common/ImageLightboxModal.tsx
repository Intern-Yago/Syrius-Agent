import React, { useState, useEffect } from "react";
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconLoader,
  IconCheck,
  IconLayers,
} from "./Icons";
import { useModal } from "../../context/ModalContext";

export interface LightboxSlide {
  number: number;
  title: string;
  text?: string;
  imagePath?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: LightboxSlide[];
  initialIndex?: number;
  postTopic?: string;
  format?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  slides,
  initialIndex = 0,
  postTopic,
  format = "CAROUSEL",
}: ImageLightboxModalProps) {
  const { toast } = useModal();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setDownloadSuccess(null);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((curr) => (curr > 0 ? curr - 1 : slides.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((curr) => (curr < slides.length - 1 ? curr + 1 : 0));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, slides.length]);

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];
  const hasMultiple = slides.length > 1;

  async function handleDownloadCurrent() {
    if (!currentSlide.imagePath) return;

    try {
      setDownloading(true);
      setDownloadSuccess(null);

      const safeTopic = postTopic
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 35);

      const defaultFilename = `${format.toLowerCase()}-${safeTopic}-slide-${currentSlide.number}.png`;

      const res = await window.electronAPI.downloadImage({
        imageUrl: currentSlide.imagePath,
        defaultFilename,
      });

      if (res.success) {
        setDownloadSuccess(`Salvo em: ${res.path}`);
        toast.success(`Imagem salva com sucesso!`);
        setTimeout(() => setDownloadSuccess(null), 3500);
      } else if (res.error && !res.error.includes("cancelado")) {
        toast.error(`Erro ao salvar imagem: ${res.error}`);
      }
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.94)",
        backdropFilter: "blur(12px)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px 24px",
        userSelect: "none",
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={onClose}
    >
      {/* BARRA SUPERIOR (HEADER) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            {format}
          </span>

          <strong style={{ fontSize: "14px", color: "#f4f4f5", maxWidth: "450px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {postTopic}
          </strong>

          {hasMultiple && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                padding: "3px 10px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#e4e4e7",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              Slide {currentIndex + 1} de {slides.length}
            </span>
          )}
        </div>

        {/* AÇÕES NO TOPO */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {downloadSuccess && (
            <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <IconCheck size={14} /> {downloadSuccess}
            </span>
          )}

          {currentSlide.imagePath && (
            <button
              type="button"
              onClick={handleDownloadCurrent}
              disabled={downloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#fafafa",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Baixar esta arte em alta resolução para editar"
            >
              {downloading ? <IconLoader size={13} /> : <IconDownload size={13} />}
              <span>Baixar Imagem</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fafafa",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Fechar Visualizador (Esc)"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>

      {/* ÁREA CENTRAL COM NAVEGAÇÃO E IMAGEM EXPANDIDA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          flex: 1,
          position: "relative",
          margin: "12px 0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* BOTÃO ANTERIOR */}
        {hasMultiple && (
          <button
            type="button"
            onClick={() => setCurrentIndex((curr) => (curr > 0 ? curr - 1 : slides.length - 1))}
            style={{
              position: "absolute",
              left: "16px",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 20,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            title="Slide Anterior (Seta Esquerda)"
          >
            <IconChevronLeft size={24} />
          </button>
        )}

        {/* IMAGEM EXPANDIDA */}
        <div
          style={{
            maxHeight: "78vh",
            maxWidth: "85vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {currentSlide.imagePath ? (
            <img
              src={currentSlide.imagePath}
              alt={currentSlide.title}
              style={{
                maxHeight: "78vh",
                maxWidth: "85vw",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                transition: "transform 0.2s ease",
              }}
            />
          ) : (
            <div
              style={{
                width: "400px",
                height: "400px",
                borderRadius: "12px",
                background: "rgba(24, 24, 27, 0.8)",
                border: "1px dashed rgba(255, 255, 255, 0.2)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                color: "#a1a1aa",
              }}
            >
              <IconLayers size={48} />
              <span>Sem imagem renderizada</span>
            </div>
          )}
        </div>

        {/* BOTÃO PRÓXIMO */}
        {hasMultiple && (
          <button
            type="button"
            onClick={() => setCurrentIndex((curr) => (curr < slides.length - 1 ? curr + 1 : 0))}
            style={{
              position: "absolute",
              right: "16px",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(24, 24, 27, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fafafa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 20,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            title="Próximo Slide (Seta Direita)"
          >
            <IconChevronRight size={24} />
          </button>
        )}
      </div>

      {/* RODAPÉ COM DETALHES DO SLIDE ATUAL E MINIATURAS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          zIndex: 10,
          background: "rgba(18, 18, 20, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
          padding: "10px 18px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ maxWidth: "60%" }}>
          <strong style={{ fontSize: "13px", color: "#f4f4f5", display: "block", marginBottom: "2px" }}>
            {currentSlide.number}. {currentSlide.title}
          </strong>
          {currentSlide.text && (
            <p style={{ fontSize: "11px", color: "#a1a1aa", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentSlide.text}
            </p>
          )}
        </div>

        {/* MINIATURAS DE NAVEGAÇÃO RÁPIDA */}
        {hasMultiple && (
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", maxWidth: "40%", padding: "2px" }}>
            {slides.map((s, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  type="button"
                  key={s.number || idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    border: isSelected ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.2)",
                    background: "#09090b",
                    padding: 0,
                    cursor: "pointer",
                    opacity: isSelected ? 1 : 0.6,
                    transform: isSelected ? "scale(1.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title={`Ir para Slide ${idx + 1}`}
                >
                  {s.imagePath ? (
                    <img src={s.imagePath} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "10px", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                      {idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
