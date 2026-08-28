import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Header } from "../components/Header";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Zap,
  Play,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Activity,
  Calendar,
} from "lucide-react-native";

interface DashboardScreenProps {
  onOpenMenu?: () => void;
  onNavigate?: (tab: any) => void;
}

export function DashboardScreen({ onOpenMenu, onNavigate }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getDashboardStats();
      if (res && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRunPipeline = async () => {
    Alert.alert(
      "Executar Pipeline Completo",
      "Deseja iniciar o ciclo autônomo de produção (Estratégia -> Redação -> Artes -> QC -> Finalização)?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar Agora",
          onPress: async () => {
            try {
              setRunningPipeline(true);
              const res = await api.runPipeline();
              Alert.alert("Pipeline Iniciado! 🚀", res.message || "Produção autônoma em andamento.");
              if (onNavigate) onNavigate("activities");
            } catch (err: any) {
              Alert.alert("Erro", err?.message || "Falha ao iniciar pipeline.");
            } finally {
              setRunningPipeline(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard Central"
        subtitle="Syrius Agent • Automação Multi-Agente"
        badge="SISTEMA ATIVO"
        onOpenMenu={onOpenMenu}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando estado do sistema...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* BOTÃO PRINCIPAL: EXECUTAR PIPELINE COMPLETO */}
          <View style={styles.pipelineCard}>
            <View style={styles.pipelineInfo}>
              <View style={styles.zapIconBox}>
                <Zap size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pipelineTitle}>Pipeline de Produção Autônoma</Text>
                <Text style={styles.pipelineDesc}>
                  Dispara a esteira completa de 7 agentes com controle de qualidade QC &ge; 8.5.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.runPipelineBtn}
              onPress={handleRunPipeline}
              disabled={runningPipeline}
              activeOpacity={0.8}
            >
              {runningPipeline ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Play size={16} color="#ffffff" fill="#ffffff" />
              )}
              <Text style={styles.runPipelineBtnText}>
                {runningPipeline ? "Iniciando Pipeline..." : "Executar Pipeline Completo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* GRID DE STATUS */}
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => onNavigate && onNavigate("posts")}
              activeOpacity={0.7}
            >
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(56, 189, 248, 0.15)", borderColor: "rgba(56, 189, 248, 0.3)" }]}>
                <Layers size={18} color={colors.sky} />
              </View>
              <Text style={styles.kpiValue}>{stats?.totalPosts || 0}</Text>
              <Text style={styles.kpiLabel}>Total de Posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => onNavigate && onNavigate("posts")}
              activeOpacity={0.7}
            >
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(52, 211, 153, 0.15)", borderColor: "rgba(52, 211, 153, 0.3)" }]}>
                <CheckCircle2 size={18} color={colors.emerald} />
              </View>
              <Text style={styles.kpiValue}>{stats?.publishedPosts || 0}</Text>
              <Text style={styles.kpiLabel}>Publicados</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => onNavigate && onNavigate("schedule")}
              activeOpacity={0.7}
            >
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(245, 158, 11, 0.3)" }]}>
                <Clock size={18} color={colors.amber} />
              </View>
              <Text style={styles.kpiValue}>{stats?.readyPosts || 0}</Text>
              <Text style={styles.kpiLabel}>Prontos na Grade</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => onNavigate && onNavigate("agency")}
              activeOpacity={0.7}
            >
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(168, 85, 247, 0.15)", borderColor: "rgba(168, 85, 247, 0.3)" }]}>
                <Bot size={18} color={colors.purple} />
              </View>
              <Text style={styles.kpiValue}>Online</Text>
              <Text style={styles.kpiLabel}>Gestora Estelar</Text>
            </TouchableOpacity>
          </View>

          {/* ÚLTIMO TEMA GERADO */}
          <View style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={styles.latestTitle}>ÚLTIMA PAUTA GERADA</Text>
            </View>
            <Text style={styles.latestTopic}>{stats?.latestTopic || "Nenhum post registrado ainda."}</Text>
          </View>
        </ScrollView>
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
    gap: 16,
  },
  pipelineCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.15)",
  },
  pipelineInfo: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  zapIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  pipelineDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  runPipelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  runPipelineBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  latestCard: {
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  latestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  latestTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1,
  },
  latestTopic: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
});
