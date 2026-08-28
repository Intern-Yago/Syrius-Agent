import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Header } from "../components/Header";
import { getServerHost, setServerHost, api } from "../services/api";
import { colors } from "../theme/colors";
import { Server, Wifi, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react-native";

interface SettingsScreenProps {
  onOpenMenu?: () => void;
}

export function SettingsScreen({ onOpenMenu }: SettingsScreenProps) {
  const [host, setHost] = useState<string>("");
  const [testing, setTesting] = useState<boolean>(false);
  const [status, setStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    loadHost();
  }, []);

  const loadHost = async () => {
    const current = await getServerHost();
    setHost(current);
    testConnection(current);
  };

  const testConnection = async (targetHost?: string) => {
    setTesting(true);
    setStatus("checking");
    const start = Date.now();
    try {
      if (targetHost) await setServerHost(targetHost);
      const res = await api.checkHealth();
      if (res && res.status === "ok") {
        setLatency(Date.now() - start);
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    } catch (err) {
      setStatus("disconnected");
      setLatency(null);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!host.trim()) {
      Alert.alert("Erro", "O endereço do servidor não pode ficar vazio.");
      return;
    }
    await setServerHost(host);
    await testConnection(host);
    Alert.alert("Sucesso", "Endereço do servidor salvo.");
  };

  return (
    <View style={styles.container}>
      <Header
        title="Configurações de Rede"
        subtitle="Conexão com o Syrius Desktop API Gateway"
        badge="GATEWAY DE REDE"
        onOpenMenu={onOpenMenu}
      />

      <View style={styles.content}>
        {/* Status de Conexão */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            {status === "connected" ? (
              <CheckCircle2 size={24} color={colors.green} />
            ) : status === "checking" ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AlertTriangle size={24} color={colors.rose} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {status === "connected"
                  ? "Conectado ao Desktop"
                  : status === "checking"
                  ? "Testando conexão..."
                  : "Desconectado"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {status === "connected"
                  ? `Latência: ${latency}ms • Porta 3001 ativa`
                  : "Verifique se o Syrius Agent Desktop está aberto no seu PC."}
              </Text>
            </View>
          </View>
        </View>

        {/* Formulário de IP */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Endereço do Servidor (IP Local ou Túnel):</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.X:3001"
            placeholderTextColor={colors.textDim}
            value={host}
            onChangeText={setHost}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Para testar no celular físico, use o IP local do seu computador na mesma rede Wi-Fi (ex: http://192.168.1.15:3001).
          </Text>
        </View>

        {/* Botões */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => testConnection(host)}
            disabled={testing}
          >
            <RefreshCw size={16} color={colors.primary} />
            <Text style={styles.testBtnText}>Testar Ping</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar Endereço</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  statusSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontSize: 14,
  },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  testBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryBg,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  testBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#09090b",
    fontWeight: "700",
    fontSize: 14,
  },
});
