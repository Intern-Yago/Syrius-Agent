import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Header } from "../components/Header";
import { SlotCard } from "../components/SlotCard";
import { ScheduleSlot } from "../types";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { Calendar, ChevronLeft, ChevronRight, Zap, Sparkles, RefreshCw } from "lucide-react-native";

export function ScheduleScreen() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await api.getSchedule(weekOffset);
      if (res && res.slots) {
        setSlots(res.slots);
      }
      const autoRes = await api.getAutoplay();
      setAutoPublish(autoRes.autoPublish);
    } catch (err) {
      console.error("Erro ao carregar cronograma:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    setLoading(true);
    fetchSchedule();
  }, [fetchSchedule]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const handleToggleAutoplay = async (value: boolean) => {
    try {
      setAutoPublish(value);
      await api.setAutoplay(value);
      Alert.alert(
        value ? "Autoplay Ativado" : "Autoplay Desativado",
        value
          ? "O Syrius Agent publicará automaticamente nos horários programados."
          : "Publicação automática desativada. Aprovação manual necessária."
      );
    } catch (err) {
      setAutoPublish(!value);
      Alert.alert("Erro", "Não foi possível alterar a configuração de Autoplay.");
    }
  };

  const handleProduce = (slot: ScheduleSlot) => {
    Alert.alert(
      "Produzir com IA",
      `Deseja iniciar a produção autônoma de "${slot.topic}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar Produção",
          onPress: async () => {
            try {
              await api.produceSlot({
                slotId: slot.id,
                topic: slot.topic,
                format: slot.format,
                objective: slot.objective,
                reasoning: slot.reasoning,
                baseCopyPrompt: slot.baseCopyPrompt,
                baseVisualPrompt: slot.baseVisualPrompt,
              });
              Alert.alert("Produção Iniciada", "O pipeline está gerando o post em segundo plano no desktop.");
              fetchSchedule();
            } catch (err) {
              Alert.alert("Erro", "Falha ao iniciar produção do post.");
            }
          },
        },
      ]
    );
  };

  const handleUnmark = (slot: ScheduleSlot) => {
    Alert.alert(
      "Desmarcar Publicado",
      `Deseja restaurar "${slot.topic}" para a grade ativa?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, Desmarcar",
          onPress: async () => {
            try {
              await api.unmarkPublished(slot.id);
              fetchSchedule();
            } catch (err) {
              Alert.alert("Erro", "Falha ao desmarcar publicação.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Cronograma Editorial"
        subtitle="Grade balanceada para autoridade e engajamento"
        badge="TIMELINE EDITORIAL"
      />

      {/* Barra de Controles: Seletor de Semana e Autoplay */}
      <View style={styles.controlsBar}>
        {/* Seletor de Semanas */}
        <View style={styles.weekSelector}>
          <TouchableOpacity
            style={[styles.weekBtn, weekOffset === 0 && styles.weekBtnActive]}
            onPress={() => setWeekOffset(0)}
          >
            <Text style={[styles.weekBtnText, weekOffset === 0 && styles.weekBtnTextActive]}>
              Semana Atual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.weekBtn, weekOffset === 1 && styles.weekBtnActive]}
            onPress={() => setWeekOffset(1)}
          >
            <Text style={[styles.weekBtnText, weekOffset === 1 && styles.weekBtnTextActive]}>
              Próxima (+1)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toggle de Autoplay */}
        <View style={styles.autoplayRow}>
          <Zap size={14} color={autoPublish ? colors.green : colors.textDim} />
          <Text style={[styles.autoplayText, autoPublish && { color: colors.green }]}>
            {autoPublish ? "Autoplay ON" : "Manual"}
          </Text>
          <Switch
            value={autoPublish}
            onValueChange={handleToggleAutoplay}
            trackColor={{ false: "#27272a", true: colors.greenBg }}
            thumbColor={autoPublish ? colors.green : "#71717a"}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>

      {/* Lista de Slots do Cronograma */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando grade semanal...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {slots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={36} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Nenhum post agendado</Text>
              <Text style={styles.emptySubtitle}>
                Abra a Sala da Gestora ou o Desktop para planejar sua semana.
              </Text>
            </View>
          ) : (
            slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onProduce={handleProduce}
                onUnmark={handleUnmark}
              />
            ))
          )}
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
  controlsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  weekSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 3,
  },
  weekBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  weekBtnActive: {
    backgroundColor: colors.primary,
  },
  weekBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  weekBtnTextActive: {
    color: "#09090b",
    fontWeight: "700",
  },
  autoplayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  autoplayText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
  },
});
