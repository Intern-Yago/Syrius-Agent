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
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
} from "lucide-react-native";

interface TestsScreenProps {
  onOpenMenu?: () => void;
}

export function TestsScreen({ onOpenMenu }: TestsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getTestsHealth();
      if (res && res.tests) {
        setTests(res.tests);
      }
    } catch (err) {
      console.error("Erro ao carregar testes:", err);
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
        title="Central de Testes"
        subtitle="Auditoria de Provedores & Integridade de APIs"
        badge="DIAGNÓSTICO"
        onOpenMenu={onOpenMenu}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={styles.loadingText}>Executando testes de conectividade de APIs...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
        >
          <View style={styles.sectionHeader}>
            <Cpu size={16} color={colors.amber} />
            <Text style={styles.sectionTitle}>Status dos Provedores & Infraestrutura</Text>
          </View>

          {tests.map((t, idx) => (
            <View key={idx} style={styles.testCard}>
              <View style={styles.testLeft}>
                <View style={styles.iconBox}>
                  <CheckCircle2 size={16} color={colors.emerald} />
                </View>
                <View>
                  <Text style={styles.testName}>{t.name}</Text>
                  <Text style={styles.latencyText}>Latência: {t.latency}</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{t.status}</Text>
              </View>
            </View>
          ))}
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
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  testCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  testLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  testName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  latencyText: {
    fontSize: 11,
    color: colors.textDim,
  },
  statusBadge: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderColor: colors.emerald,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.emerald,
  },
});
