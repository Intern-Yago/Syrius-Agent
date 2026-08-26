import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Header } from "../components/Header";
import { AgencyMessage } from "../types";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Mic,
  Send,
  Volume2,
  Square,
  Sparkles,
  Trash2,
  Play,
  Pause,
  Bot,
  User,
  CheckCircle2,
} from "lucide-react-native";

export function AgencyMeetingScreen() {
  const [messages, setMessages] = useState<AgencyMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  
  // Gravação de Áudio
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reprodução de Áudio
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchHistory();
    return () => {
      if (sound) sound.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.getAgencyMessages();
      if (res && res.history) {
        setMessages(res.history);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens da Estelar:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputText.trim();
    if (!content || sending) return;

    setInputText("");
    setSending(true);

    // Mensagem otimista do usuário
    const optimisticMsg: AgencyMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await api.sendAgencyMessage(content);
      if (res && res.reply) {
        setMessages((prev) => [...prev, res.reply]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        // Se a resposta vier com áudio, reproduz automaticamente
        if (res.reply.audioUrl) {
          playAudio(res.reply.id, res.reply.audioUrl);
        }
      }
    } catch (err) {
      Alert.alert("Erro", "Falha ao enviar mensagem para a Estelar.");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permissão Necessária", "Permita o acesso ao microfone nas configurações do celular.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert("Erro", "Falha ao iniciar gravação de áudio.");
    }
  };

  const stopAndSendRecording = async () => {
    if (!recording) return;

    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      // Envia aviso que áudio foi recebido
      handleSendMessage("🎙️ [Áudio gravado via Mobile]");
    } catch (err) {
      Alert.alert("Erro", "Falha ao processar áudio gravado.");
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
    } catch (err) {
      console.error("Erro ao cancelar gravação:", err);
    }
  };

  const playAudio = async (msgId: string, audioUrl: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (playingAudioId === msgId) {
        setPlayingAudioId(null);
        return;
      }

      const fullUrl = await api.getMediaUrl(audioUrl);
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: fullUrl });
      setSound(newSound);
      setPlayingAudioId(msgId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudioId(null);
        }
      });

      await newSound.playAsync();
    } catch (err) {
      console.error("Erro ao reproduzir voz:", err);
      setPlayingAudioId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <Header
        title="Estelar (Head Editorial)"
        subtitle="Sala de Reunião & Ideação por Voz"
        badge="REUNIÃO ESTRATÉGICA"
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={styles.loadingText}>Conectando com a Estelar...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isPlaying = playingAudioId === msg.id;

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowBot,
                ]}
              >
                {!isUser && (
                  <View style={styles.botAvatar}>
                    <Sparkles size={14} color={colors.purple} />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleBot,
                  ]}
                >
                  <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                    {msg.content}
                  </Text>

                  {/* Player de Voz Neural da Estelar */}
                  {msg.audioUrl ? (
                    <TouchableOpacity
                      style={styles.voicePlayerBtn}
                      onPress={() => playAudio(msg.id, msg.audioUrl!)}
                    >
                      {isPlaying ? (
                        <Pause size={14} color={colors.purple} />
                      ) : (
                        <Play size={14} color={colors.purple} />
                      )}
                      <Text style={styles.voicePlayerText}>
                        {isPlaying ? "Pausar Voz Neural" : "Ouvir Estelar"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Opções Interativas de Pauta */}
                  {msg.options && msg.options.length > 0 ? (
                    <View style={styles.optionsContainer}>
                      {msg.options.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          style={styles.optionCard}
                          onPress={() =>
                            handleSendMessage(`Gostei da Opção: "${opt.title}". Pode aprovar e agendar!`)
                          }
                        >
                          <Text style={styles.optionTitle}>{opt.title}</Text>
                          {opt.description ? (
                            <Text style={styles.optionDesc} numberOfLines={2}>
                              {opt.description}
                            </Text>
                          ) : null}
                          <View style={styles.optionActionRow}>
                            <Sparkles size={11} color={colors.primary} />
                            <Text style={styles.optionActionText}>Aprovar e Agendar</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}

          {sending && (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color={colors.purple} />
              <Text style={styles.thinkingText}>Estelar está analisando e elaborando a resposta...</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Barra de Entrada Estilo WhatsApp */}
      <View style={styles.inputBar}>
        {isRecording ? (
          <View style={styles.recordingRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording}>
              <Trash2 size={20} color={colors.rose} />
            </TouchableOpacity>

            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
            </View>

            <TouchableOpacity style={styles.sendRecordBtn} onPress={stopAndSendRecording}>
              <Send size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.input}
              placeholder="Diga uma ideia técnica ou dúvida..."
              placeholderTextColor={colors.textDim}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />

            {inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleSendMessage()}
                disabled={sending}
              >
                <Send size={18} color="#09090b" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                <Mic size={20} color={colors.purple} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 16,
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
  messageRow: {
    flexDirection: "row",
    gap: 10,
    maxWidth: "88%",
  },
  messageRowUser: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  messageRowBot: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.purpleBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.purpleBorder,
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#09090b",
    fontWeight: "600",
  },
  voicePlayerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.purpleBg,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  voicePlayerText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: "700",
  },
  optionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  optionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  optionDesc: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  optionActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  optionActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
  },
  thinkingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  inputBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  textInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purpleBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.purpleBorder,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  cancelBtn: {
    padding: 8,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.rose,
  },
  recordingTime: {
    color: colors.rose,
    fontSize: 16,
    fontWeight: "700",
  },
  sendRecordBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
});
