import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { colors } from "../theme/colors";
import { api } from "../services/api";
import {
  Zap,
  Bot,
  Activity,
  Calendar,
  TrendingUp,
  Layers,
  Rocket,
  MessageSquare,
  BarChart3,
  FlaskConical,
  Settings,
  X,
  Sparkles,
  Play,
} from "lucide-react-native";

export type MobileTab =
  | "home"
  | "agency"
  | "activities"
  | "schedule"
  | "trending"
  | "posts"
  | "ads"
  | "interactions"
  | "analytics"
  | "settings";

interface SidebarDrawerProps {
  visible: boolean;
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onClose: () => void;
}

export function SidebarDrawer({ visible, currentTab, onSelectTab, onClose }: SidebarDrawerProps) {
  const [runningPipeline, setRunningPipeline] = useState(false);

  const handleRunPipeline = async () => {
    Alert.alert(
      "Executar Pipeline Completo",
      "Deseja iniciar o ciclo de produção autônoma de conteúdo no Syrius?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar Pipeline",
          onPress: async () => {
            try {
              setRunningPipeline(true);
              const res = await api.runPipeline();
              Alert.alert("Pipeline Iniciado! 🚀", res.message || "Produção autônoma iniciada.");
              onClose();
              onSelectTab("activities");
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

  const navItems: {
    id: MobileTab;
    label: string;
    desc: string;
    icon: any;
    color: string;
    badge?: string;
  }[] = [
    {
      id: "home",
      label: "Dashboard",
      desc: "Visão geral e status do sistema",
      icon: Zap,
      color: colors.primary,
    },
    {
      id: "agency",
      label: "Sala de Reunião",
      desc: "Ideação e comando por voz com a Gestora",
      icon: Bot,
      color: "#f472b6",
      badge: "Estelar",
    },
    {
      id: "activities",
      label: "Atividades",
      desc: "Monitor de tarefas e logs em tempo real",
      icon: Activity,
      color: colors.emerald,
    },
    {
      id: "schedule",
      label: "Cronograma",
      desc: "Grade semanal de publicações e slots",
      icon: Calendar,
      color: colors.amber,
    },
    {
      id: "trending",
      label: "Temas em Alta",
      desc: "Radar de tendências, GitHub e notícias",
      icon: TrendingUp,
      color: "#10b981",
    },
    {
      id: "posts",
      label: "Publicações",
      desc: "Acervo de carrosséis, reels e posts",
      icon: Layers,
      color: colors.primary,
    },
    {
      id: "ads",
      label: "Propaganda & Ads",
      desc: "Radar de turbinamento & Meta Ads",
      icon: Rocket,
      color: colors.sky,
      badge: "Tráfego",
    },
    {
      id: "interactions",
      label: "Interações",
      desc: "Comentários, DMs e Auto-Reply",
      icon: MessageSquare,
      color: "#ec4899",
    },
    {
      id: "analytics",
      label: "Analytics & IA",
      desc: "Métricas consolidadas e auditorias",
      icon: BarChart3,
      color: "#f43f5e",
    },
    {
      id: "settings",
      label: "Configurações",
      desc: "Conexão de rede Wi-Fi e opções do app",
      icon: Settings,
      color: colors.textMuted,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />

        <View style={styles.drawer}>
          {/* TOPO DO MENU */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.brandTitle}>Syrius Agent</Text>
                <Text style={styles.brandSubtitle}>Mobile Companion</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* LISTA COMPLETA DE NAVEGAÇÃO */}
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>ECOSSISTEMA SYRIUS</Text>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isActive
                          ? `${item.color}25`
                          : "rgba(255, 255, 255, 0.04)",
                        borderColor: isActive ? item.color : colors.cardBorder,
                      },
                    ]}
                  >
                    <Icon size={17} color={isActive ? item.color : colors.textMuted} />
                  </View>

                  <View style={styles.navInfo}>
                    <View style={styles.navTitleRow}>
                      <Text style={[styles.navLabel, isActive && { color: item.color, fontWeight: "800" }]}>
                        {item.label}
                      </Text>
                      {item.badge ? (
                        <View style={[styles.miniBadge, { borderColor: `${item.color}40`, backgroundColor: `${item.color}15` }]}>
                          <Text style={[styles.miniBadgeText, { color: item.color }]}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.navDesc} numberOfLines={1}>
                      {item.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* BOTÃO: EXECUTAR PIPELINE COMPLETO */}
            <View style={styles.pipelineActionSection}>
              <Text style={styles.sectionHeader}>AÇÃO DE PRODUÇÃO</Text>

              <TouchableOpacity
                style={styles.pipelineBtn}
                onPress={handleRunPipeline}
                disabled={runningPipeline}
                activeOpacity={0.8}
              >
                {runningPipeline ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Play size={15} color="#ffffff" fill="#ffffff" />
                )}
                <Text style={styles.pipelineBtnText}>
                  {runningPipeline ? "Iniciando..." : "Executar Pipeline Completo"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* RODAPÉ DO MENU */}
          <View style={styles.drawerFooter}>
            <View style={styles.footerStatusDot} />
            <Text style={styles.footerText}>Conectado ao Syrius API Gateway</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    flexDirection: "row",
  },
  backdropTouch: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawer: {
    width: "84%",
    maxWidth: 330,
    backgroundColor: "#121215",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    display: "flex",
    flexDirection: "column",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  brandSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  menuList: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textDim,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 3,
    gap: 10,
  },
  navItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navInfo: {
    flex: 1,
  },
  navTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 8,
    fontWeight: "800",
  },
  navDesc: {
    fontSize: 10,
    color: colors.textDim,
  },
  pipelineActionSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 12,
  },
  pipelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  pipelineBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  drawerFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.emerald,
  },
  footerText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
