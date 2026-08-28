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
  TextInput,
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
  Search,
  Clock,
  AlertTriangle,
} from "lucide-react-native";

interface PostsScreenProps {
  onOpenMenu?: () => void;
}

type FilterType = "all" | "published" | "generated" | "ready" | "draft";

export function PostsScreen({ onOpenMenu }: PostsScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
                Alert.alert("Sucesso! 🚀", "Publicação realizada no Instagram com sucesso!");
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

  // Contadores para cada categoria
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED" || p.instagramMediaId).length;
  const generatedCount = posts.filter((p) => (p.slides && p.slides.length > 0) && p.status !== "PUBLISHED").length;
  const readyCount = posts.filter((p) => p.status === "READY" || (!p.slides || p.slides.length === 0)).length;
  const draftCount = posts.filter((p) => p.status === "DRAFT").length;

  // Filtragem dos posts
  const filteredPosts = posts.filter((p) => {
    const isPublished = p.status === "PUBLISHED" || Boolean(p.instagramMediaId);
    const hasSlides = Boolean(p.slides && p.slides.length > 0);

    if (activeFilter === "published" && !isPublished) return false;
    if (activeFilter === "generated" && (!hasSlides || isPublished)) return false;
    if (activeFilter === "ready" && (p.status !== "READY" && hasSlides)) return false;
    if (activeFilter === "draft" && p.status !== "DRAFT") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = p.topic.toLowerCase().includes(q);
      const matchFormat = p.format?.toLowerCase().includes(q);
      if (!matchTopic && !matchFormat) return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Acervo de Publicações"
        subtitle="Biblioteca de conteúdos técnicos produzidos"
        badge="CONTEÚDO"
        onOpenMenu={onOpenMenu}
      />

      {/* CAMPO DE BUSCA */}
      <View style={styles.searchContainer}>
        <Search size={14} color={colors.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tema ou formato..."
          placeholderTextColor={colors.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.clearSearchText}>Limpar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* BARRA HORIZONTAL DE FILTROS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
          onPress={() => setActiveFilter("all")}
        >
          <Text style={[styles.filterPillText, activeFilter === "all" && styles.filterPillTextActive]}>
            Todos ({posts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === "published" && [styles.filterPillActive, { borderColor: colors.emerald }],
          ]}
          onPress={() => setActiveFilter("published")}
        >
          <Text
            style={[
              styles.filterPillText,
              activeFilter === "published" && { color: colors.emerald, fontWeight: "800" },
            ]}
          >
            Publicados ({publishedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === "generated" && [styles.filterPillActive, { borderColor: colors.primary }],
          ]}
          onPress={() => setActiveFilter("generated")}
        >
          <Text
            style={[
              styles.filterPillText,
              activeFilter === "generated" && { color: colors.primary, fontWeight: "800" },
            ]}
          >
            Gerados ({generatedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === "ready" && [styles.filterPillActive, { borderColor: colors.amber }],
          ]}
          onPress={() => setActiveFilter("ready")}
        >
          <Text
            style={[
              styles.filterPillText,
              activeFilter === "ready" && { color: colors.amber, fontWeight: "800" },
            ]}
          >
            Prontos / Pautas ({readyCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === "draft" && [styles.filterPillActive, { borderColor: colors.rose }],
          ]}
          onPress={() => setActiveFilter("draft")}
        >
          <Text
            style={[
              styles.filterPillText,
              activeFilter === "draft" && { color: colors.rose, fontWeight: "800" },
            ]}
          >
            Rascunhos ({draftCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Layers size={36} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Nenhum post encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Não há publicações correspondentes ao filtro "{activeFilter}".
              </Text>
            </View>
          ) : (
            filteredPosts.map((post) => {
              const isPublished = post.status === "PUBLISHED" || Boolean(post.instagramMediaId);
              const isPublishing = publishingId === post.id;
              const slidesCount = post.slides?.length || 0;

              return (
                <View key={post.id} style={styles.postCard}>
                  {/* CABEÇALHO DO CARD */}
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeGroup}>
                      <View style={styles.formatBadge}>
                        {post.format === "REEL" || post.format === "REEL_SCRIPT" ? (
                          <Video size={12} color={colors.primary} />
                        ) : (
                          <ImageIcon size={12} color={colors.primary} />
                        )}
                        <Text style={styles.formatText}>{post.format}</Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isPublished
                              ? "rgba(52, 211, 153, 0.15)"
                              : slidesCount > 0
                              ? "rgba(99, 102, 241, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                            borderColor: isPublished
                              ? colors.emerald
                              : slidesCount > 0
                              ? colors.primary
                              : colors.amber,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: isPublished
                                ? colors.emerald
                                : slidesCount > 0
                                ? colors.primary
                                : colors.amber,
                            },
                          ]}
                        >
                          {isPublished ? "PUBLICADO" : slidesCount > 0 ? "GERADO" : post.status}
                        </Text>
                      </View>
                    </View>

                    {slidesCount > 0 && (
                      <Text style={styles.slideCountText}>{slidesCount} slides</Text>
                    )}
                  </View>

                  {/* TÍTULO DO POST */}
                  <Text style={styles.topicText}>{post.topic}</Text>

                  {/* LEGENDA / RESUMO */}
                  {post.caption ? (
                    <Text style={styles.captionText} numberOfLines={2}>
                      {post.caption}
                    </Text>
                  ) : null}

                  {/* RODAPÉ DO CARD */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>
                      {new Date(post.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Text>

                    {isPublished ? (
                      <View style={styles.publishedBadge}>
                        <CheckCircle2 size={13} color={colors.emerald} />
                        <Text style={styles.publishedText}>No Instagram</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.publishBtn}
                        onPress={() => handlePublish(post)}
                        disabled={isPublishing}
                        activeOpacity={0.8}
                      >
                        {isPublishing ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Send size={12} color="#ffffff" />
                        )}
                        <Text style={styles.publishBtnText}>
                          {isPublishing ? "Publicando..." : "Publicar Agora"}
                        </Text>
                      </TouchableOpacity>
                    )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    color: colors.text,
    fontSize: 12,
  },
  clearSearchText: {
    color: colors.textDim,
    fontSize: 11,
  },
  filtersScroll: {
    maxHeight: 44,
    marginBottom: 4,
  },
  filtersContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    color: colors.textDim,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  formatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  formatText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  slideCountText: {
    fontSize: 11,
    color: colors.textDim,
  },
  topicText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  captionText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  dateText: {
    color: colors.textDim,
    fontSize: 11,
  },
  publishedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  publishedText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: "700",
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  publishBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
