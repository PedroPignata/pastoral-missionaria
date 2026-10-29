import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Link as LinkIcon,
  Send,
  MoreVertical,
  Trash2,
  Bookmark,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Video,
  ExternalLink,
  Users,
} from 'lucide-react';

const CATEGORIES = [
  'Todas',
  'Partilha',
  'Missão',
  'Formação',
  'Meditação',
  'Fotografia',
  'Indicação',
  'Convivência',
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  Partilha: { bg: 'bg-amber-50', text: 'text-amber-800' },
  Missão: { bg: 'bg-rose-50', text: 'text-rose-800' },
  Formação: { bg: 'bg-blue-50', text: 'text-blue-800' },
  Meditação: { bg: 'bg-purple-50', text: 'text-purple-800' },
  Fotografia: { bg: 'bg-emerald-50', text: 'text-emerald-800' },
  Indicação: { bg: 'bg-cyan-50', text: 'text-cyan-800' },
  Convivência: { bg: 'bg-pink-50', text: 'text-pink-800' },
};

export const ComunidadeMissionariaView: React.FC = () => {
  const { user } = useAuth();
  const canModerate = user?.role === 'admin' || user?.role === 'coordenador';

  const [posts, setPosts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // New Post Form State
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Partilha');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Post Comments
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getCommunityPosts(selectedCategory);
      setPosts(data);
    } catch (e) {
      console.error('Erro ao carregar publicações:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createCommunityPost({
        content: newContent.trim(),
        category: newCategory,
        image_url: newImageUrl.trim() || undefined,
        link_url: newLinkUrl.trim() || undefined,
      });

      setNewContent('');
      setNewImageUrl('');
      setNewLinkUrl('');
      setShowImageInput(false);
      setShowLinkInput(false);
      setFeedback('Publicação compartilhada com a comunidade!');
      loadPosts();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao publicar: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await api.toggleLikePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: res.liked, likes_count: res.likes_count }
            : p
        )
      );
    } catch (err) {
      console.error('Erro ao curtir post:', err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    setActiveCommentsPostId(postId);
    try {
      const comments = await api.getPostComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: comments }));
    } catch (err) {
      console.error('Erro ao carregar comentários:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentInput.trim()) return;
    try {
      const newComment = await api.addPostComment(postId, commentInput.trim());
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
        )
      );
      setCommentInput('');
    } catch (err: any) {
      alert('Erro ao enviar comentário: ' + err.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja realmente excluir esta publicação?')) return;
    try {
      await api.deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setFeedback('Publicação removida com sucesso!');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleCopyPostLink = (post: any) => {
    const text = `🕊️ *Comunidade da Pastoral Missionária*\n\n"${post.content}"\n— Por ${post.author_name}\n\nhttps://pastoral-missionaria.onrender.com/`;
    navigator.clipboard.writeText(text);
    alert('Texto da publicação copiado para a área de transferência!');
  };

  // YouTube embed helper
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const term = searchQuery.trim().toLowerCase();
    return posts.filter(
      (p) =>
        p.content?.toLowerCase().includes(term) ||
        p.author_name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
    );
  }, [posts, searchQuery]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-pastoral-dourado font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Fraternidade & Convivência Pastoral</span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-pastoral-cafe mt-0.5">
            Comunidade Missionária
          </h2>
          <p className="text-xs text-zinc-500">
            Espaço de partilha, oração, meditações, fotos de missões e convivência fraterna
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar publicações..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 w-full sm:w-56"
          />
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 34. Editor de Nova Publicação */}
      <form
        onSubmit={handleCreatePost}
        className="bg-white p-5 rounded-3xl border border-pastoral-dourado/40 shadow-xs space-y-3 relative overflow-hidden"
      >
        <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
          <div className="w-8 h-8 rounded-full bg-pastoral-dourado text-pastoral-profundo font-bold text-xs flex items-center justify-center shadow-2xs">
            {user?.name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div>
            <p className="text-xs font-bold text-pastoral-cafe leading-tight">
              {user?.name || 'Missionário(a)'}
            </p>
            <p className="text-[10px] text-zinc-400">O que Deus tem colocado em seu coração para partilhar?</p>
          </div>
        </div>

        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Escreva uma reflexão, meditação, passagem bíblica, testemunho ou registro de missão..."
          rows={3}
          className="w-full text-xs p-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado resize-none"
          required
        />

        {showImageInput && (
          <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
            <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Cole o link da imagem/foto (ex: https://...)"
              className="w-full text-xs bg-transparent border-none focus:outline-none"
            />
          </div>
        )}

        {showLinkInput && (
          <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
            <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="Cole o link (YouTube, artigo, livro ou documento...)"
              className="w-full text-xs bg-transparent border-none focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-zinc-50 text-pastoral-cafe"
            >
              {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                showImageInput
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-zinc-500 hover:bg-zinc-100 border-zinc-200'
              }`}
              title="Inserir foto/imagem"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                showLinkInput
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-zinc-500 hover:bg-zinc-100 border-zinc-200'
              }`}
              title="Inserir link ou vídeo"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newContent.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-gold transition-all disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar</span>
          </button>
        </div>
      </form>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-pastoral-cafe text-white font-bold shadow-2xs'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 33. Feed de Publicações */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200/80 shadow-xs text-center text-zinc-400 text-xs space-y-1">
          <p>Nenhuma publicação encontrada nesta categoria.</p>
          <p className="text-[11px] text-zinc-400">Seja o primeiro a partilhar uma mensagem com os missionários!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const catStyle = CATEGORY_STYLES[post.category] || { bg: 'bg-zinc-100', text: 'text-zinc-700' };
            const youtubeEmbed = getYouTubeEmbedUrl(post.link_url);
            const isAuthor = post.author_id === user?.id;
            const comments = commentsMap[post.id] || [];

            return (
              <div
                key={post.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-3.5"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pastoral-dourado/20 text-pastoral-cafe font-bold text-xs flex items-center justify-center border border-pastoral-dourado/30">
                      {post.author_name?.[0]?.toUpperCase() || 'M'}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-pastoral-cafe leading-tight">
                        {post.author_name}
                      </h4>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}>
                          {post.category}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(post.created_at).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(isAuthor || canModerate) && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Excluir publicação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs sm:text-sm text-pastoral-grafite leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Optional Image */}
                {post.image_url && (
                  <div className="rounded-2xl overflow-hidden border border-zinc-100 max-h-96 bg-zinc-50 flex items-center justify-center">
                    <img
                      src={post.image_url}
                      alt="Anexo da publicação"
                      className="w-full h-full object-cover hover:scale-101 transition-transform"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* YouTube Video Embed Preview */}
                {youtubeEmbed && (
                  <div className="rounded-2xl overflow-hidden border border-zinc-200 aspect-video">
                    <iframe
                      src={youtubeEmbed}
                      title="Vídeo compartilhado"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Other external link */}
                {post.link_url && !youtubeEmbed && (
                  <a
                    href={post.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center justify-between gap-3 text-xs text-blue-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{post.link_url}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">Abrir link</span>
                  </a>
                )}

                {/* 35. Interações: Curtir, Comentar, Compartilhar */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                        post.liked_by_me
                          ? 'text-rose-600 bg-rose-50'
                          : 'text-zinc-500 hover:text-rose-600 hover:bg-zinc-50'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          post.liked_by_me ? 'fill-rose-600 text-rose-600' : ''
                        }`}
                      />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-500 hover:text-pastoral-cafe hover:bg-zinc-50 font-semibold transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments_count || 0}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleCopyPostLink(post)}
                    className="p-2 text-zinc-400 hover:text-pastoral-cafe hover:bg-zinc-50 rounded-xl transition-colors"
                    title="Copiar texto / Compartilhar"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentsPostId === post.id && (
                  <div className="pt-3 border-t border-zinc-100 space-y-3">
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {comments.length === 0 ? (
                        <p className="text-[11px] text-zinc-400 text-center py-2">
                          Nenhum comentário ainda. Seja o primeiro a comentar!
                        </p>
                      ) : (
                        comments.map((cmt) => (
                          <div
                            key={cmt.id}
                            className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-0.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-pastoral-cafe">
                                {cmt.author_name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {new Date(cmt.created_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-zinc-700">{cmt.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Escreva um comentário fraterno..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-200"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddComment(post.id))}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        className="px-3 py-1.5 rounded-xl bg-pastoral-cafe hover:bg-pastoral-profundo text-white font-bold text-xs"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
