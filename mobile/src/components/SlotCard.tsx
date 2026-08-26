import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { ScheduleSlot } from "../types";
import { colors } from "../theme/colors";
import {
  Clock,
  Layers,
  Video,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react-native";

interface SlotCardProps {
  slot: ScheduleSlot;
  onProduce: (slot: ScheduleSlot) => void;
  onUnmark: (slot: ScheduleSlot) => void;
  onPress?: (slot: ScheduleSlot) => void;
}

export function SlotCard({ slot, onProduce, onUnmark, onPress }: SlotCardProps) {
  const isPublished = slot.status === "PUBLISHED";
  const isReady = slot.status === "READY" || slot.status === "SCHEDULED";

  // Ícone e Cor do Formato
  const getFormatDetails = () => {
    switch (slot.format) {
      case "REEL":
      case "REEL_SCRIPT":
        return { label: "Reels 9:16", color: colors.purple, bg: colors.purpleBg, border: colors.purpleBorder, icon: Video };
      case "STORY":
      case "STORIES":
      case "STORY_PHOTO":
        return { label: "Story", color: colors.amber, bg: colors.amberBg, border: colors.amberBorder, icon: MessageSquare };
      case "SINGLE_IMAGE":
        return { label: "Post Solo", color: colors.primary, bg: colors.primaryBg, border: colors.primaryBorder, icon: ImageIcon };
      default:
        return { label: "Carrossel", color: colors.primary, bg: colors.primaryBg, border: colors.primaryBorder, icon: Layers };
    }
  };

  const fmt = getFormatDetails();
  const FormatIcon = fmt.icon;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.card,
        isPublished && styles.cardPublished,
        isReady && styles.cardReady,
      ]}
      onPress={() => onPress?.(slot)}
    >
      {/* Header do Card */}
      <View style={styles.cardHeader}>
        <View style={styles.timeBadge}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={styles.timeText}>
            {slot.dayOfWeek} às {slot.timeSlot}
          </Text>
        </View>

        {/* Status Badge */}
        {isPublished ? (
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}
            onPress={() => onUnmark(slot)}
          >
            <CheckCircle2 size={11} color={colors.green} />
            <Text style={[styles.statusText, { color: colors.green }]}>Publicado</Text>
          </TouchableOpacity>
        ) : isReady ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}>
            <Sparkles size={11} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.primary }]}>Pronto</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.cardBorder }]}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>Planejado</Text>
          </View>
        )}
      </View>

      {/* Título / Tema */}
      <Text style={styles.topicText} numberOfLines={2}>
        {slot.topic}
      </Text>

      {/* Raciocínio / Briefing */}
      {slot.reasoning ? (
        <Text style={styles.reasoningText} numberOfLines={2}>
          {slot.reasoning}
        </Text>
      ) : null}

      {/* Footer com Tags e Ações */}
      <View style={styles.cardFooter}>
        <View style={styles.tagsRow}>
          <View style={[styles.formatTag, { backgroundColor: fmt.bg, borderColor: fmt.border }]}>
            <FormatIcon size={11} color={fmt.color} />
            <Text style={[styles.formatText, { color: fmt.color }]}>{fmt.label}</Text>
          </View>

          {slot.editorialPillar ? (
            <View style={styles.pillarTag}>
              <Text style={styles.pillarText}>{slot.editorialPillar}</Text>
            </View>
          ) : null}
        </View>

        {/* Botão de Ação */}
        {!isPublished && !isReady ? (
          <TouchableOpacity
            style={styles.produceBtn}
            onPress={() => onProduce(slot)}
          >
            <Sparkles size={12} color="#ffffff" />
            <Text style={styles.produceBtnText}>Produzir</Text>
          </TouchableOpacity>
        ) : isPublished && slot.instagramUrl ? (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Alert.alert("Link Instagram", slot.instagramUrl)}
          >
            <ExternalLink size={12} color={colors.green} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardPublished: {
    borderColor: "rgba(16, 185, 129, 0.2)",
    backgroundColor: "rgba(16, 185, 129, 0.03)",
  },
  cardReady: {
    borderColor: "rgba(56, 189, 248, 0.2)",
    backgroundColor: "rgba(56, 189, 248, 0.03)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  topicText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },
  reasoningText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 12,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  formatTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pillarTag: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillarText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "600",
  },
  produceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  produceBtnText: {
    color: "#09090b",
    fontSize: 12,
    fontWeight: "700",
  },
  linkBtn: {
    padding: 6,
    backgroundColor: colors.greenBg,
    borderRadius: 6,
  },
});
