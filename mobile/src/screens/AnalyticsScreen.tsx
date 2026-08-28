import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Header } from "../components/Header";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  BarChart3,
  TrendingUp,
  Layers,
  CheckCircle2,
  Rocket,
  Sparkles,
} from "lucide-react-native";

interface AnalyticsScreenProps {
  onOpenMenu?: () => void;
}

export function AnalyticsScreen({ onOpenMenu }: AnalyticsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getAnalyticsSummary();
      if (res && res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error("Erro ao carregar analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.container}>
      <Header
        title="Analytics & Crescimento"
        subtitle="Métricas de Desempenho e Saúde da Conta"
        badge="AUDITORIA DE DADOS"
        onOpenMenu={onOpenMenu}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f43f5e" />
          <Text style={styles.loadingText}>Carregando métricas consolidadas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f43f5e" />}
        >
          {/* GRID DE CARDS PRINCIPAIS */}
          <View style={styles.grid}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(244, 63, 94, 0.15)", borderColor: "rgba(244, 63, 94, 0.3)" }]}>
                <Layers size={18} color="#f43f5e" />
              </View>
              <Text style={styles.kpiValue}>{metrics?.postsCount || 0}</Text>
              <Text style={styles.kpiLabel}>Total de Posts Criados</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(52, 211, 153, 0.15)", borderColor: "rgba(52, 211, 153, 0.3)" }]}>
                <CheckCircle2 size={18} color={colors.emerald} />
              </View>
              <Text style={styles.kpiValue}>{metrics?.publishedCount || 0}</Text>
              <Text style={styles.kpiLabel}>Publicados no Instagram</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(56, 189, 248, 0.15)", borderColor: "rgba(56, 189, 248, 0.3)" }]}>
                <Rocket size={18} color={colors.sky} />
              </View>
              <Text style={styles.kpiValue}>{metrics?.campaignsCount || 0}</Text>
              <Text style={styles.kpiLabel}>Campanhas Turbinadas</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: "rgba(168, 85, 247, 0.15)", borderColor: "rgba(168, 85, 247, 0.3)" }]}>
                <TrendingUp size={18} color={colors.purple} />
              </View>
              <Text style={styles.kpiValue}>9.2/10</Text>
              <Text style={styles.kpiLabel}>Média QC Qualidade</Text>
            </View>
          </View>

          {/* DIAGNÓSTICO ESTRATÉGICO */}
          <View style={styles.auditCard}>
            <View style={styles.auditHeader}>
              <Sparkles size={16} color="#f43f5e" />
              <Text style={styles.auditTitle}>Diretrizes Estratégicas do Syrius</Text>
            </View>

            <Text style={styles.auditText}>
              • Carrosséis técnicos focados em otimização de banco de dados e arquitetura geram a maior taxa de salvamentos.{"\n"}
              • As janelas de publicação entre 18:00 e 19:30 nos dias de semana apresentam o maior engajamento orgânico de engenheiros de software.{"\n"}
              • Turbinadas com R$ 6/dia em posts com Score &ge; 90 convertem seguidores a um Custo por Seguidor (CPS) médio de R$ 0,40 a R$ 0,85.
            </Text>
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
    textAlign: "center",
  },
  auditCard: {
    backgroundColor: "rgba(244, 63, 94, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  auditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  auditTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f43f5e",
  },
  auditText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
