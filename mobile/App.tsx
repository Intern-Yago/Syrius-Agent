import React, { useState } from "react";
import { View, StyleSheet, StatusBar, LogBox } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

LogBox.ignoreLogs([
  "Expo AV has been deprecated",
  "[expo-av]",
  "SafeAreaView has been deprecated",
  "Each child in a list should have a unique",
]);
LogBox.ignoreAllLogs(true);

import { DashboardScreen } from "./src/screens/DashboardScreen";
import { AgencyMeetingScreen } from "./src/screens/AgencyMeetingScreen";
import { ActivitiesScreen } from "./src/screens/ActivitiesScreen";
import { ScheduleScreen } from "./src/screens/ScheduleScreen";
import { TrendingScreen } from "./src/screens/TrendingScreen";
import { PostsScreen } from "./src/screens/PostsScreen";
import { AdsScreen } from "./src/screens/AdsScreen";
import { InteractionsScreen } from "./src/screens/InteractionsScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SidebarDrawer, MobileTab } from "./src/components/SidebarDrawer";
import { colors } from "./src/theme/colors";

function MainApp() {
  const [currentTab, setCurrentTab] = useState<MobileTab>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={true} />

      {/* Conteúdo da Tela Ativa (100% Espelho do Electron) */}
      <View style={styles.content}>
        {currentTab === "home" && (
          <DashboardScreen
            onOpenMenu={() => setDrawerOpen(true)}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}
        {currentTab === "agency" && <AgencyMeetingScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "activities" && <ActivitiesScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "schedule" && <ScheduleScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "trending" && <TrendingScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "posts" && <PostsScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "ads" && <AdsScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "interactions" && <InteractionsScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "analytics" && <AnalyticsScreen onOpenMenu={() => setDrawerOpen(true)} />}
        {currentTab === "settings" && <SettingsScreen onOpenMenu={() => setDrawerOpen(true)} />}
      </View>

      {/* Menu Lateral Deslizante com todas as opções do Electron */}
      <SidebarDrawer
        visible={drawerOpen}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
