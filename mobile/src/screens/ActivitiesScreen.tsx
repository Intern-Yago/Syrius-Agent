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
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Rocket,
  Sparkles,
  RefreshCw,
} from "lucide-react-native";

interface ActivitiesScreenProps {
  onOpenMenu?: () => void;
}

export function ActivitiesScreen({ onOpenMenu }: ActivitiesScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getActivities();
      if (res && res.success) {
        setLogs(res.logs || []);
        setActiveCampaigns(res.activeCampaigns || []);
      }
    } catch (err) {
      console.error("Erro ao carregar atividades:", err);
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
        title="Atividades em Andamento"
        subtitle="Monitor de IA, Gerações e Publicações"
        badge="MONITOR CENTRAL"
        onOpenMenu={onOpenMenu}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.emerald} />
          <Text style={styles.loadingText}>Carregando atividades em tempo real...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />}
        >
          {/* CAMPANHAS ATIVAS NO INSTAGRAM */}
          {activeCampaigns.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Rocket size={16} color={colors.sky} />
                <Text style={styles.sectionTitle}>Turbinadas Ativas no Meta Ads ({activeCampaigns.length})</Text>
              </View>

              {activeCampaigns.map((camp) => (
                <View key={camp.id} style={styles.campaignCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.activeBadge}>
                      <View style={styles.pulsingDot} />
                      <Text style={styles.activeBadgeText}>EM VEICULAÇÃO</Text>
                    </View>
                    <Text style={styles.campBudgetText}>R$ {camp.dailyBudget?.toFixed(2)}/dia</Text>
                  </View>

                  <Text style={styles.campTopic}>{camp.postTopic}</Text>
                  <Text style={styles.campNotes} numberOfLines={2}>
                    {camp.notes}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* HISTÓRICO DE LOGS E GERAÇÕES DE IA */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity size={16} color={colors.emerald} />
              <Text style={styles.sectionTitle}>Últimas Execuções de IA ({logs.length})</Text>
            </View>

            {logs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Nenhuma atividade recente registrada.</Text>
              </View>
            ) : (
              logs.map((log) => {
                const isSuccess = log.status === "SUCCESS" || log.status === "COMPLETED";
                const isWarning = log.status === "WARNING";

                return (
                  <View key={log.id} style={styles.logCard}>
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isSuccess
                              ? "rgba(52, 211, 153, 0.15)"
                              : isWarning
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            borderColor: isSuccess ? colors.emerald : isWarning ? colors.amber : colors.rose,
                          },
                        ]}
                      >
                        {isSuccess ? (
                          <CheckCircle2 size={12} color={colors.emerald} />
                        ) : isWarning ? (
                          <AlertTriangle size={12} color={colors.amber} />
                        ) : (
                          <AlertTriangle size={12} color={colors.rose} />
                        )}
                        <Text
                          style={[
                            styles.statusText,
                            { color: isSuccess ? colors.emerald : isWarning ? colors.amber : colors.rose },
                          ]}
                        >
                          {log.provider || log.model || "IA Execution"}
                        </Text>
                      </View>

                      <Text style={styles.timeText}>
                        {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>

                    <Text style={styles.logPrompt} numberOfLines={3}>
                      {log.prompt}
                    </Text>

                    {log.post?.topic ? (
                      <Text style={styles.logPostTag}>
                        Post: <Text style={{ color: colors.text }}>{log.post.topic}</Text>
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
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
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  campaignCard: {
    backgroundColor: "rgba(56, 189, 248, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sky,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.sky,
  },
  campBudgetText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#38bdf8",
  },
  campTopic: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  campNotes: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  timeText: {
    fontSize: 11,
    color: colors.textDim,
  },
  logPrompt: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  logPostTag: {
    fontSize: 11,
    color: colors.textDim,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
