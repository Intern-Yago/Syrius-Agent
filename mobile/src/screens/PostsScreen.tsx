import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Header } from "../components/Header";
import { Post } from "../types";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import {
  Layers,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Send,
  Sparkles,
} from "lucide-react-native";

export function PostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await api.getPosts();
      if (res && res.posts) {
        setPosts(res.posts);
      }
    } catch (err) {
      console.error("Erro ao carregar posts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePublish = (post: Post) => {
    Alert.alert(
      "Publicar no Instagram",
      `Deseja despachar "${post.topic}" para o Instagram agora via Meta Graph API?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Publicar Agora",
          onPress: async () => {
            try {
              setPublishingId(post.id);
              const res = await api.publishPost(post.id);
              if (res.success) {
                Alert.alert("Sucesso!", "Publicação realizada no Instagram com sucesso!");
                fetchPosts();
              } else {
                Alert.alert("Erro", res.error || "Falha ao publicar.");
              }
            } catch (err) {
              Alert.alert("Erro", "Erro ao conectar com a Meta Graph API.");
            } finally {
              setPublishingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Acervo de Publicações"
        subtitle="Posts gerados, aprovados e publicados"
        badge="ACERVO DE MÍDIA"
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando acervo...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPosts();
              }}
              tintColor={colors.primary}
            />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Layers size={36} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Nenhum post gerado ainda</Text>
              <Text style={styles.emptySubtitle}>
                Inicie a produção de um slot no Cronograma ou converse com a Estelar.
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const isPublished = post.status === "PUBLISHED";
              const isReady = post.status === "READY" || post.status === "APPROVED";
              const isPublishing = publishingId === post.id;

              return (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.badgeRow}>
                      <View style={styles.formatBadge}>
                        <Text style={styles.formatBadgeText}>{post.format}</Text>
                      </View>
                      <Text style={styles.slidesCount}>
                        {post.slides?.length || 0} slides / cenas
                      </Text>
                    </View>

                    {isPublished ? (
                      <View style={styles.publishedBadge}>
                        <CheckCircle2 size={12} color={colors.green} />
                        <Text style={styles.publishedText}>Publicado</Text>
                      </View>
                    ) : isReady ? (
                      <View style={styles.readyBadge}>
                        <Sparkles size={12} color={colors.primary} />
                        <Text style={styles.readyText}>Pronto</Text>
                      </View>
                    ) : (
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftText}>{post.status}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.topic}>{post.topic}</Text>

                  {post.caption ? (
                    <Text style={styles.caption} numberOfLines={3}>
                      {post.caption}
                    </Text>
                  ) : null}

                  <View style={styles.footer}>
                    {isPublished && post.instagramUrl ? (
                      <TouchableOpacity
                        style={styles.viewOnInstaBtn}
                        onPress={() => Alert.alert("Link Instagram", post.instagramUrl)}
                      >
                        <ExternalLink size={14} color={colors.green} />
                        <Text style={styles.viewOnInstaText}>Ver no Instagram</Text>
                      </TouchableOpacity>
                    ) : isReady ? (
                      <TouchableOpacity
                        style={styles.publishBtn}
                        onPress={() => handlePublish(post)}
                        disabled={isPublishing}
                      >
                        {isPublishing ? (
                          <ActivityIndicator size="small" color="#09090b" />
                        ) : (
                          <>
                            <Send size={14} color="#09090b" />
                            <Text style={styles.publishBtnText}>Publicar Agora</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
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
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formatBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  formatBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  slidesCount: {
    color: colors.textDim,
    fontSize: 12,
  },
  publishedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  publishedText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "700",
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readyText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  draftBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  draftText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  topic: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  caption: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  publishBtnText: {
    color: "#09090b",
    fontSize: 12,
    fontWeight: "700",
  },
  viewOnInstaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.greenBg,
    borderRadius: 8,
  },
  viewOnInstaText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "700",
  },
});
