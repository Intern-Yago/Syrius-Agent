import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { Header } from "../components/Header";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  TrendingUp,
  Flame,
  Globe,
  Sparkles,
  Play,
  Layers,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react-native";

interface TrendingScreenProps {
  onOpenMenu?: () => void;
  onNavigate?: (tab: any) => void;
}

export function TrendingScreen({ onOpenMenu, onNavigate }: TrendingScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [producingTopic, setProducingTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getTrending();
      if (res && res.data) {
        setTopics(res.data);
      }
    } catch (err) {
      console.error("Erro ao carregar tendências:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await api.scanTrending();
      if (res && res.data) {
        setTopics(res.data);
        Alert.alert("Radar Atualizado! 📡", "Novas tendências e notícias do ecossistema tech foram capturadas.");
      }
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao escanear tendências.");
    } finally {
      setScanning(false);
    }
  };

  const handleProduce = async (t: any) => {
    const topicTitle = t.topic || t.title;
    Alert.alert(
      "Produzir Post com IA",
      `Deseja enviar a pauta "${topicTitle}" diretamente para a esteira autônoma de produção?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Produzir Agora",
          onPress: async () => {
            try {
              setProducingTopic(topicTitle);
              const res = await api.produceTrendingPost({
                topic: topicTitle,
                category: t.category,
                format: "CAROUSEL",
              });
              Alert.alert("Produção Iniciada! 🚀", res.message || "A esteira autônoma está gerando o post.");
              if (selectedTopic) setSelectedTopic(null);
              if (onNavigate) onNavigate("activities");
            } catch (err: any) {
              Alert.alert("Erro", err?.message || "Falha ao iniciar produção.");
            } finally {
              setProducingTopic(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Temas em Alta"
        subtitle="Radar de Tendências, Notícias & GitHub"
        badge="RADAR TECH"
        onOpenMenu={onOpenMenu}
        rightAction={
          <TouchableOpacity
            style={styles.scanHeaderBtn}
            onPress={handleScan}
            disabled={scanning}
            activeOpacity={0.7}
          >
            {scanning ? (
              <ActivityIndicator size="small" color={colors.emerald} />
            ) : (
              <RefreshCw size={14} color={colors.emerald} />
            )}
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.emerald} />
          <Text style={styles.loadingText}>Coletando temas em alta no ecossistema tech...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />}
        >
          {/* BOTÃO PRINCIPAL DE ESCANEAR */}
          <TouchableOpacity
            style={styles.scanMainBtn}
            onPress={handleScan}
            disabled={scanning}
            activeOpacity={0.8}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Sparkles size={16} color="#ffffff" />
            )}
            <Text style={styles.scanMainBtnText}>
              {scanning ? "Varrendo Notícias & GitHub..." : "Escanear Novas Tendências com IA"}
            </Text>
          </TouchableOpacity>

          <View style={styles.headerInfoRow}>
            <Flame size={16} color={colors.amber} />
            <Text style={styles.headerInfoText}>
              Tendências Ativas ({topics.length})
            </Text>
          </View>

          {topics.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nenhuma tendência ativa no momento.</Text>
              <Text style={styles.emptySubtext}>Clique no botão acima para fazer uma varredura com a IA.</Text>
            </View>
          ) : (
            topics.map((t, idx) => {
              const topicTitle = t.topic || t.title;
              const isProducing = producingTopic === topicTitle;

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.topicCard}
                  onPress={() => setSelectedTopic(t)}
                  activeOpacity={0.85}
                >
                  <View style={styles.topicHeaderRow}>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>Relevância: {t.relevanceScore || 95}%</Text>
                    </View>
                    <Text style={styles.categoryText}>{t.category || "Engenharia"}</Text>
                  </View>

                  <Text style={styles.topicTitle}>{topicTitle}</Text>
                  <Text style={styles.topicDesc} numberOfLines={2}>
                    {t.description || t.summary || "Pauta técnica de alto impacto identificada pelo radar."}
                  </Text>

                  <View style={styles.cardActionRow}>
                    <Text style={styles.tapToViewText}>Toque para ver detalhes</Text>
                    <TouchableOpacity
                      style={styles.produceBtn}
                      onPress={() => handleProduce(t)}
                      disabled={isProducing}
                      activeOpacity={0.8}
                    >
                      {isProducing ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Play size={12} color="#ffffff" fill="#ffffff" />
                      )}
                      <Text style={styles.produceBtnText}>
                        {isProducing ? "Iniciando..." : "Produzir Post"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* MODAL DE DETALHES DA TENDÊNCIA */}
      {selectedTopic && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setSelectedTopic(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>Score: {selectedTopic.relevanceScore || 95}%</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTopic(null)} style={styles.modalCloseBtn}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalCategory}>{selectedTopic.category || "Engenharia de Software"}</Text>
              <Text style={styles.modalTitle}>{selectedTopic.topic || selectedTopic.title}</Text>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalDescHeader}>RESUMO & CONTEXTO DA PAUTA:</Text>
                <Text style={styles.modalDesc}>
                  {selectedTopic.description || selectedTopic.summary || "Pauta técnica de alto engajamento no ecossistema."}
                </Text>

                {selectedTopic.sourceUrl ? (
                  <View style={styles.modalSourceBox}>
                    <Globe size={12} color={colors.sky} />
                    <Text style={styles.modalSourceText} numberOfLines={1}>{selectedTopic.sourceUrl}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedTopic(null)}
                >
                  <Text style={styles.modalCancelText}>Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalProduceBtn}
                  onPress={() => handleProduce(selectedTopic)}
                  activeOpacity={0.8}
                >
                  <Play size={14} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.modalProduceText}>Produzir com Syrius</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  scanHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.emerald,
    paddingVertical: 12,
    borderRadius: 10,
  },
  scanMainBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  headerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  headerInfoText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  topicCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  topicHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreBadge: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderColor: "rgba(52, 211, 153, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.emerald,
  },
  categoryText: {
    fontSize: 11,
    color: colors.textDim,
    fontWeight: "600",
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 19,
  },
  topicDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  cardActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 2,
  },
  tapToViewText: {
    fontSize: 11,
    color: colors.textDim,
  },
  produceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  produceBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "700",
  },
  emptySubtext: {
    fontSize: 11,
    color: colors.textDim,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCategory: {
    fontSize: 11,
    color: colors.emerald,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  modalDescHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalSourceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  modalSourceText: {
    fontSize: 11,
    color: colors.sky,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  modalProduceBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalProduceText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
