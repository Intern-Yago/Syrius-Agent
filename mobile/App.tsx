import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ScheduleScreen } from "./src/screens/ScheduleScreen";
import { AgencyMeetingScreen } from "./src/screens/AgencyMeetingScreen";
import { PostsScreen } from "./src/screens/PostsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { colors } from "./src/theme/colors";
import { Calendar, Bot, Layers, Wifi } from "lucide-react-native";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"schedule" | "agency" | "posts" | "settings">("schedule");

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />

        {/* Conteúdo da Aba Ativa */}
        <View style={styles.content}>
          {currentTab === "schedule" && <ScheduleScreen />}
          {currentTab === "agency" && <AgencyMeetingScreen />}
          {currentTab === "posts" && <PostsScreen />}
          {currentTab === "settings" && <SettingsScreen />}
        </View>

        {/* Barra de Navegação Inferior (Bottom Tabs) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab("schedule")}
          >
            <Calendar
              size={20}
              color={currentTab === "schedule" ? colors.primary : colors.textDim}
            />
            <Text
              style={[
                styles.tabLabel,
                currentTab === "schedule" && styles.tabLabelActive,
              ]}
            >
              Grade
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab("agency")}
          >
            <Bot
              size={20}
              color={currentTab === "agency" ? colors.purple : colors.textDim}
            />
            <Text
              style={[
                styles.tabLabel,
                currentTab === "agency" && { color: colors.purple, fontWeight: "700" },
              ]}
            >
              Estelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab("posts")}
          >
            <Layers
              size={20}
              color={currentTab === "posts" ? colors.primary : colors.textDim}
            />
            <Text
              style={[
                styles.tabLabel,
                currentTab === "posts" && styles.tabLabelActive,
              ]}
            >
              Acervo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab("settings")}
          >
            <Wifi
              size={20}
              color={currentTab === "settings" ? colors.primary : colors.textDim}
            />
            <Text
              style={[
                styles.tabLabel,
                currentTab === "settings" && styles.tabLabelActive,
              ]}
            >
              Rede
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingVertical: 10,
    paddingBottom: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
