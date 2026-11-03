import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Heart,
  Share2,
  Image as ImageIcon,
  Link as LinkIcon,
  Send,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  Video,
  ExternalLink,
  X,
  UploadCloud,
  FileVideo,
} from 'lucide-react';

export const ComunidadeMissionariaView: React.FC = () => {
  const { user } = useAuth();
  const canModerate = user?.role === 'admin' || user?.role === 'coordenador';

  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // New Post Form State
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File Upload State (Fotos e Vídeos direto do celular ou computador)
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mediaType: 'image' | 'video';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Post Comments
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getCommunityPosts();
      setPosts(data);
    } catch (e) {
      console.error('Erro ao carregar publicações:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      alert('Por favor, selecione uma imagem ou um vídeo válido.');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      alert('O arquivo selecionado deve ter no máximo 30MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const previewUrl = URL.createObjectURL(file);
      setAttachedFile({
        file,
        previewUrl,
        base64,
        mediaType: isVid ? 'video' : 'image',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    if (attachedFile?.previewUrl) {
      URL.revokeObjectURL(attachedFile.previewUrl);
    }
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerFilePicker = (type: 'image' | 'video') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed && !attachedFile && !newImageUrl.trim()) {
      alert('Escreva uma mensagem ou anexe uma foto/vídeo para publicar.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = newImageUrl.trim() || undefined;
      let finalVideoUrl: string | undefined = undefined;

      if (attachedFile) {
        setIsUploading(true);
        const uploaded = await api.uploadMedia(
          attachedFile.base64,
          attachedFile.file.name,
          attachedFile.file.type
        );
        if (uploaded.media_type === 'video') {
          finalVideoUrl = uploaded.url;
        } else {
          finalImageUrl = uploaded.url;
        }
      }

      await api.createCommunityPost({
        content: trimmed,
        category: 'Geral',
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
        link_url: newLinkUrl.trim() || undefined,
      });

      setNewContent('');
      setNewImageUrl('');
      setNewLinkUrl('');
      handleRemoveAttachment();
      setShowLinkInput(false);
      setFeedback('Publicação compartilhada com a comunidade pastoral!');
      loadPosts();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao publicar: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
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
              Compartilhe algo com a Pastoral
            </p>
            <p className="text-[10px] text-zinc-400">
              Partilhe uma reflexão, oração, fotos de uma missão, pedido de intercessão ou aviso fraterno...
            </p>
          </div>
        </div>

        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Escreva sua mensagem (ou anexe diretamente uma foto/vídeo)..."
          rows={3}
          className="w-full text-xs p-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado resize-none"
        />

        {/* Input Oculto de Arquivo */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Pré-visualização do Anexo Local */}
        {attachedFile && (
          <div className="relative p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900/10 flex-shrink-0 flex items-center justify-center border border-zinc-200">
              {attachedFile.mediaType === 'image' ? (
                <img
                  src={attachedFile.previewUrl}
                  alt="Pré-visualização"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600">
                  <FileVideo className="w-6 h-6 text-pastoral-dourado" />
                  <span className="text-[8px] font-bold uppercase mt-0.5">Vídeo</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-pastoral-cafe truncate">
                {attachedFile.file.name}
              </p>
              <p className="text-[10px] text-zinc-400">
                {(attachedFile.file.size / (1024 * 1024)).toFixed(1)} MB • Pronto para envio
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveAttachment}
              className="p-1.5 rounded-lg bg-zinc-200 hover:bg-rose-100 text-zinc-500 hover:text-rose-600 transition-colors"
              title="Remover anexo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showLinkInput && (
          <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
            <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="Cole o link (YouTube, artigo, oração...)"
              className="w-full text-xs bg-transparent border-none focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTriggerFilePicker('image')}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors"
              title="Anexar foto do celular ou computador"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Foto</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerFilePicker('video')}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors"
              title="Anexar vídeo do celular ou computador"
            >
              <Video className="w-3.5 h-3.5 text-rose-600" />
              <span>Vídeo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 transition-colors ${
                showLinkInput
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50 border-zinc-200'
              }`}
              title="Inserir link externo ou YouTube"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!newContent.trim() && !attachedFile && !newImageUrl.trim())}
            className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-gold transition-all disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
          >
            {isUploading ? (
              <>
                <UploadCloud className="w-3.5 h-3.5 animate-pulse" />
                <span>Enviando mídia...</span>
              </>
            ) : isSubmitting ? (
              <span>Publicando...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publicar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 33. Feed de Publicações */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200/80 shadow-xs text-center text-zinc-400 text-xs space-y-1">
          <p>Nenhuma publicação encontrada.</p>
          <p className="text-[11px] text-zinc-400">Seja o primeiro a partilhar uma mensagem com os missionários!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
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
                        {post.category && post.category !== 'Geral' && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700`}>
                            {post.category}
                          </span>
                        )}
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
                {post.content && (
                  <p className="text-xs sm:text-sm text-pastoral-grafite leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                )}

                {/* Optional Direct Video Upload */}
                {post.video_url && (
                  <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-black aspect-video flex items-center justify-center max-h-96">
                    <video
                      src={post.video_url}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

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
