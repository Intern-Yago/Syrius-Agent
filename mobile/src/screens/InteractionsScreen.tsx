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
  MessageSquare,
  Bot,
  CheckCircle2,
  Clock,
  Send,
  User,
} from "lucide-react-native";

interface InteractionsScreenProps {
  onOpenMenu?: () => void;
}

export function InteractionsScreen({ onOpenMenu }: InteractionsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interactions, setInteractions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getInteractions();
      if (res && res.interactions) {
        setInteractions(res.interactions);
      }
    } catch (err) {
      console.error("Erro ao carregar interações:", err);
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
        title="Interações da Comunidade"
        subtitle="Comentários, DMs & Auto-Reply Inteligente"
        badge="COMMUNITY AI"
        onOpenMenu={onOpenMenu}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Carregando interações do Instagram...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ec4899" />}
        >
          {interactions.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.userRow}>
                  <View style={styles.avatarBox}>
                    <User size={14} color="#ec4899" />
                  </View>
                  <Text style={styles.username}>@{item.username}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={styles.timeText}>{item.timeAgo}</Text>
              </View>

              <Text style={styles.msgText}>{item.text}</Text>

              {item.reply ? (
                <View style={styles.replyBox}>
                  <View style={styles.replyHeader}>
                    <Bot size={12} color={colors.primary} />
                    <Text style={styles.replyTitle}>Resposta Autônoma do Syrius:</Text>
                  </View>
                  <Text style={styles.replyText}>{item.reply}</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.answerBtn} activeOpacity={0.8}>
                  <Send size={12} color="#ffffff" />
                  <Text style={styles.answerBtnText}>Gerar Resposta com IA</Text>
                </TouchableOpacity>
              )}
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
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  typeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textDim,
  },
  timeText: {
    fontSize: 10,
    color: colors.textDim,
  },
  msgText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  replyBox: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  replyText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  answerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ec4899",
    paddingVertical: 8,
    borderRadius: 8,
  },
  answerBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
