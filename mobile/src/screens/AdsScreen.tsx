import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Header } from "../components/Header";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Rocket,
  Sparkles,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  Zap,
  X,
  Layers,
} from "lucide-react-native";

interface AdsScreenProps {
  onOpenMenu?: () => void;
  onNavigate?: (tab: any) => void;
}

export function AdsScreen({ onOpenMenu, onNavigate }: AdsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<any>(null);
  const [boostingPostId, setBoostingPostId] = useState<string | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<any[]>([]);

  // Modal de Turbinada Customizada
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [dailyBudget, setDailyBudget] = useState<string>("6");
  const [durationMode, setDurationMode] = useState<"BUDGET_CAP" | "FIXED_DAYS" | "UNTIL_PAUSED">("FIXED_DAYS");
  const [durationDays, setDurationDays] = useState<string>("3");
  const [budgetCap, setBudgetCap] = useState<string>("18");
  const [searchPostQuery, setSearchPostQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppRes, budgetRes, postsRes] = await Promise.allSettled([
        api.getAdsOpportunities(),
        api.getAdsBudget(),
        api.getPosts(),
      ]);

      if (oppRes.status === "fulfilled" && oppRes.value?.candidates) {
        setOpportunities(oppRes.value.candidates);
      }
      if (budgetRes.status === "fulfilled" && budgetRes.value?.summary) {
        setBudgetSummary(budgetRes.value.summary);
      }
      if (postsRes.status === "fulfilled" && postsRes.value?.posts) {
        const published = postsRes.value.posts.filter(
          (p: any) => p.status === "PUBLISHED" || p.instagramMediaId
        );
        setPublishedPosts(published);
        if (published.length > 0) {
          setSelectedPostId(published[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados de ads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBoost = async (opp: any) => {
    Alert.alert(
      "Confirmar Turbinada com Apolo",
      `Deseja ativar a campanha para "${opp.topic}" com R$ ${opp.recommendedDailyBudget || 6}/dia no Instagram?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Ativar na Meta API",
          onPress: async () => {
            try {
              setBoostingPostId(opp.postId);
              const res = await api.dispatchBoost({
                postId: opp.postId,
                dailyBudget: opp.recommendedDailyBudget || 6,
                durationDays: opp.recommendedDurationDays || 1,
              });
              if (res && res.success) {
                Alert.alert("Turbinada Ativada! 🚀", res.message || "Campanha criada com sucesso na Meta API!");
                loadData();
              } else {
                Alert.alert("Erro", res?.error || "Falha ao ativar campanha.");
              }
            } catch (err: any) {
              Alert.alert("Erro", err?.message || "Falha de conexão com a Meta API.");
            } finally {
              setBoostingPostId(null);
            }
          },
        },
      ]
    );
  };

  const handleCustomBoostSubmit = async () => {
    if (!selectedPostId) {
      Alert.alert("Aviso", "Selecione uma publicação publicada para turbinar.");
      return;
    }

    const effectiveDays =
      durationMode === "BUDGET_CAP"
        ? Math.max(1, Math.ceil((Number(budgetCap) || 18) / (Number(dailyBudget) || 6)))
        : durationMode === "UNTIL_PAUSED"
        ? 30
        : Number(durationDays) || 1;

    try {
      setBoostingPostId(selectedPostId);
      const res = await api.dispatchBoost({
        postId: selectedPostId,
        dailyBudget: Number(dailyBudget) || 6,
        durationDays: effectiveDays,
        durationMode,
        budgetCap: durationMode === "BUDGET_CAP" ? Number(budgetCap) : undefined,
      });

      if (res && res.success) {
        Alert.alert("Turbinada Ativada! 🚀", res.message || "Campanha ativada na Meta API com sucesso!");
        setIsModalOpen(false);
        loadData();
      } else {
        Alert.alert("Erro", res?.error || "Falha ao ativar campanha.");
      }
    } catch (err: any) {
      Alert.alert("Erro", err?.message || "Falha ao comunicar com a Meta API.");
    } finally {
      setBoostingPostId(null);
    }
  };

  const filteredModalPosts = publishedPosts.filter((p) =>
    !searchPostQuery.trim() || p.topic.toLowerCase().includes(searchPostQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header
        title="Gestor de Tráfego AI"
        subtitle="Apolo • Radar de Turbinamento & Meta Ads"
        badge="PILOTO AUTOMÁTICO"
        onOpenMenu={onOpenMenu}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sky} />
          <Text style={styles.loadingText}>Apolo está avaliando o catálogo de posts...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* CARTEIRA DE ORÇAMENTO */}
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetIconBox}>
                <Wallet size={16} color={colors.sky} />
              </View>
              <View>
                <Text style={styles.budgetLabel}>Saldo Disponível na Meta</Text>
                <Text style={styles.budgetValue}>
                  R$ {budgetSummary?.remainingBudget?.toFixed(2) || "7.99"} BRL
                </Text>
              </View>
            </View>
            <View style={styles.budgetStatsRow}>
              <Text style={styles.budgetStatText}>
                Gasto no Mês: <Text style={{ color: "#fafafa" }}>R$ {(budgetSummary?.totalSpentThisMonth || 0).toFixed(2)}</Text>
              </Text>
              <Text style={styles.budgetStatText}>
                Modo: <Text style={{ color: colors.emerald, fontWeight: "700" }}>{budgetSummary?.strategyMode || "OPPORTUNISTIC"}</Text>
              </Text>
            </View>
          </View>

          {/* BOTÃO PARA TURBINAR QUALQUER POST DO ACERVO */}
          <TouchableOpacity
            style={styles.openBoostModalBtn}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Rocket size={16} color="#ffffff" />
            <Text style={styles.openBoostModalBtnText}>Turbinar Publicação do Acervo</Text>
          </TouchableOpacity>

          {/* LISTA DE OPORTUNIDADES DO RADAR */}
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={16} color={colors.sky} />
            <Text style={styles.sectionTitle}>Recomendações do Radar ({opportunities.length})</Text>
          </View>

          {opportunities.map((opp, idx) => (
            <View key={idx} style={styles.oppCard}>
              <View style={styles.oppTopRow}>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>Score: {opp.opportunityScore}/100</Text>
                </View>
                <Text style={styles.formatText}>{opp.format}</Text>
              </View>

              <Text style={styles.oppTopic}>{opp.topic}</Text>

              <View style={styles.windowBox}>
                <Clock size={12} color={colors.sky} />
                <Text style={styles.windowText}>
                  Janela: <Text style={{ color: "#fafafa", fontWeight: "700" }}>{opp.bestDayTimeWindow || "Terça-feira às 18:30"}</Text>
                </Text>
              </View>

              <Text style={styles.whyText} numberOfLines={3}>
                {opp.whyBoostNow}
              </Text>

              <View style={styles.budgetEstRow}>
                <Text style={styles.estText}>
                  Orçamento: <Text style={{ color: colors.sky, fontWeight: "700" }}>R$ {opp.recommendedDailyBudget || 6}/dia</Text>
                </Text>
                <Text style={styles.estText}>
                  Estimativa: <Text style={{ color: colors.emerald, fontWeight: "700" }}>{opp.estimatedNewFollowers || "15 a 35 devs"}</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.boostBtn}
                onPress={() => handleBoost(opp)}
                disabled={boostingPostId === opp.postId}
                activeOpacity={0.8}
              >
                {boostingPostId === opp.postId ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Rocket size={14} color="#ffffff" />
                )}
                <Text style={styles.boostBtnText}>
                  {boostingPostId === opp.postId ? "Ativando na Meta..." : `Turbinar com Apolo (R$ ${opp.recommendedDailyBudget || 6}/dia)`}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* MODAL DE TURBINADA CUSTOMIZADA DE QUALQUER POST */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalBadge}>
                <Text style={styles.modalBadgeText}>META MARKETING API</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Turbinar Publicação com Apolo</Text>
            <Text style={styles.modalSubtitle}>
              Selecione o post publicado e defina o orçamento diário em reais.
            </Text>

            {/* SELEÇÃO DO POST */}
            <Text style={styles.inputLabel}>1. Selecione a Publicação Publicada ({publishedPosts.length}):</Text>
            
            <TextInput
              style={styles.searchModalInput}
              placeholder="Filtrar por título..."
              placeholderTextColor={colors.textDim}
              value={searchPostQuery}
              onChangeText={setSearchPostQuery}
            />

            <ScrollView style={styles.postsListScroll}>
              {filteredModalPosts.length === 0 ? (
                <Text style={styles.emptySearchText}>Nenhum post publicado encontrado.</Text>
              ) : (
                filteredModalPosts.map((p) => {
                  const isSelected = selectedPostId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.postItemCard, isSelected && styles.postItemCardActive]}
                      onPress={() => setSelectedPostId(p.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.postItemFormat}>{p.format}</Text>
                        <Text style={styles.postItemTitle} numberOfLines={1}>{p.topic}</Text>
                      </View>
                      {isSelected ? <CheckCircle2 size={16} color={colors.sky} /> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* 3 MODOS DE TÉRMINO / DURAÇÃO */}
            <Text style={[styles.inputLabel, { marginTop: 4, marginBottom: 8 }]}>2. Orçamento & Modo de Término:</Text>

            {/* OPÇÃO 1: TETO DE ORÇAMENTO */}
            <TouchableOpacity
              style={[
                styles.modeOptionCard,
                durationMode === "BUDGET_CAP" && styles.modeOptionCardActive,
              ]}
              onPress={() => setDurationMode("BUDGET_CAP")}
            >
              <View style={styles.modeHeaderRow}>
                <Text style={[styles.modeTitle, durationMode === "BUDGET_CAP" && styles.modeTitleActive]}>
                  💰 Teto de Orçamento (Valor Máximo)
                </Text>
              </View>
              <Text style={styles.modeSubtitle}>
                O anúncio roda até consumir o valor definido, independente dos dias. Apolo pausa automaticamente.
              </Text>

              {durationMode === "BUDGET_CAP" && (
                <View style={styles.modeInputBlock}>
                  <Text style={styles.modeInputLabel}>Valor Máximo do Teto (R$):</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={budgetCap}
                    onChangeText={setBudgetCap}
                  />
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {budgetSummary?.remainingBudget ? (
                      <TouchableOpacity
                        style={styles.modeQuickPill}
                        onPress={() => setBudgetCap(budgetSummary.remainingBudget.toFixed(2))}
                      >
                        <Text style={styles.modeQuickPillText}>
                          💡 Saldo em conta (R$ {budgetSummary.remainingBudget.toFixed(2)})
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.modeQuickPill}
                      onPress={() => setBudgetCap("6")}
                    >
                      <Text style={styles.modeQuickPillText}>💡 R$ 6,00</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modeQuickPill}
                      onPress={() => setBudgetCap("18")}
                    >
                      <Text style={styles.modeQuickPillText}>💡 R$ 18,00</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* OPÇÃO 2: POR TEMPO */}
            <TouchableOpacity
              style={[
                styles.modeOptionCard,
                durationMode === "FIXED_DAYS" && styles.modeOptionCardActive,
              ]}
              onPress={() => setDurationMode("FIXED_DAYS")}
            >
              <View style={styles.modeHeaderRow}>
                <Text style={[styles.modeTitle, durationMode === "FIXED_DAYS" && styles.modeTitleActive]}>
                  ⏱️ Por Tempo (Duração Fixa em Dias)
                </Text>
              </View>
              <Text style={styles.modeSubtitle}>
                Define o número de dias. Encerra ao final do prazo (limite de segurança de R$ 6/dia).
              </Text>

              {durationMode === "FIXED_DAYS" && (
                <View style={styles.modeInputBlock}>
                  <Text style={styles.modeInputLabel}>Quantidade de Dias:</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={durationDays}
                    onChangeText={setDurationDays}
                  />
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                    <TouchableOpacity
                      style={styles.modeQuickPill}
                      onPress={() => setDurationDays("3")}
                    >
                      <Text style={styles.modeQuickPillText}>💡 Sugestão: 3 dias</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modeQuickPill}
                      onPress={() => setDurationDays("1")}
                    >
                      <Text style={styles.modeQuickPillText}>💡 1 dia</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modeQuickPill}
                      onPress={() => setDurationDays("5")}
                    >
                      <Text style={styles.modeQuickPillText}>💡 5 dias</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* OPÇÃO 3: ATÉ SER PAUSADO (SEM NENHUM INPUT) */}
            <TouchableOpacity
              style={[
                styles.modeOptionCard,
                durationMode === "UNTIL_PAUSED" && styles.modeOptionCardActive,
              ]}
              onPress={() => setDurationMode("UNTIL_PAUSED")}
            >
              <View style={styles.modeHeaderRow}>
                <Text style={[styles.modeTitle, durationMode === "UNTIL_PAUSED" && styles.modeTitleActive]}>
                  ⚡ Até ser pausado (Veiculação Contínua)
                </Text>
              </View>
              <Text style={styles.modeSubtitle}>
                Veicula continuamente no leilão com limite de R$ 6/dia até você pausar.
              </Text>
            </TouchableOpacity>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCustomBoostSubmit}
                disabled={Boolean(boostingPostId) || !selectedPostId}
              >
                {boostingPostId ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Rocket size={14} color="#ffffff" />
                )}
                <Text style={styles.modalSubmitText}>
                  {boostingPostId
                    ? "Ativando..."
                    : durationMode === "BUDGET_CAP"
                    ? `Disparar (Teto R$ ${Number(budgetCap || 6).toFixed(2)})`
                    : durationMode === "UNTIL_PAUSED"
                    ? "Disparar Contínuo"
                    : `Disparar (${durationDays}d)`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 16,
  },
  budgetCard: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: 14,
    padding: 16,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  budgetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  budgetLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#38bdf8",
  },
  budgetStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  budgetStatText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  openBoostModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.skyBorder,
  },
  openBoostModalBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  oppCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  oppTopRow: {
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
  scoreText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: "800",
  },
  formatText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  oppTopic: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  windowBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.06)",
    padding: 8,
    borderRadius: 8,
  },
  windowText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  whyText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  budgetEstRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  estText: {
    fontSize: 11,
    color: colors.textDim,
  },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 4,
  },
  boostBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalBadgeText: {
    color: colors.sky,
    fontSize: 10,
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textDim,
    marginBottom: 6,
  },
  searchModalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    color: colors.text,
    fontSize: 12,
    marginBottom: 8,
  },
  postsListScroll: {
    maxHeight: 140,
    marginBottom: 12,
  },
  emptySearchText: {
    fontSize: 12,
    color: colors.textDim,
    padding: 10,
    textAlign: "center",
  },
  postItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 6,
  },
  postItemCardActive: {
    borderColor: colors.sky,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  postItemFormat: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.sky,
    marginBottom: 2,
  },
  postItemTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  inputsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
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
  modalSubmitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  modeOptionCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  modeOptionCardActive: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderColor: colors.sky,
  },
  modeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  modeTitleActive: {
    color: colors.sky,
  },
  modeSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  modeInputBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  modeInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textDim,
    marginBottom: 4,
  },
  modeQuickPill: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    alignSelf: "flex-start",
  },
  modeQuickPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.sky,
  },
});
