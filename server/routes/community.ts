import { Router, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from './auth.js';

export const communityRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../data/uploads');

// POST /api/community/upload (Upload de fotos e vídeos direto do dispositivo)
communityRouter.post('/upload', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { file_base64, file_name, mime_type } = req.body;

  if (!file_base64 || !mime_type) {
    return res.status(400).json({ error: 'Arquivo e tipo de mídia são obrigatórios.' });
  }

  const isImage = mime_type.startsWith('image/');
  const isVideo = mime_type.startsWith('video/');

  if (!isImage && !isVideo) {
    return res.status(400).json({ error: 'Formato de arquivo não suportado. Envie uma foto ou vídeo.' });
  }

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Remove prefixo data se enviado (ex: data:image/png;base64,...)
    const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 30 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo excede o limite máximo de 30MB.' });
    }

    const ext = path.extname(file_name || '') || (isImage ? '.jpg' : '.mp4');
    const safeName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, buffer);

    return res.status(201).json({
      url: `/uploads/${safeName}`,
      media_type: isVideo ? 'video' : 'image',
      file_name: safeName,
    });
  } catch (err: any) {
    console.error('Erro ao salvar upload:', err);
    return res.status(500).json({ error: 'Falha ao salvar anexo no servidor.' });
  }
});

// GET /api/community/posts
communityRouter.get('/posts', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { category } = req.query;

  let query = 'SELECT * FROM community_posts WHERE is_hidden = 0';
  const params: any[] = [];

  if (category && category !== 'Todas') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY pinned DESC, created_at DESC LIMIT 50';

  const posts = db.prepare(query).all(...params) as any[];

  // Attach liked_by_me boolean for the current user
  const currentUserId = req.user?.id;
  const postsWithLikes = posts.map((p) => {
    let likedByMe = false;
    if (currentUserId) {
      const like = db
        .prepare('SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?')
        .get(p.id, currentUserId);
      likedByMe = !!like;
    }
    return {
      ...p,
      liked_by_me: likedByMe,
    };
  });

  return res.json(postsWithLikes);
});

// POST /api/community/posts
communityRouter.post('/posts', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { content, category = 'Geral', image_url, video_url, link_url } = req.body;

  const trimmedContent = content?.trim() || '';

  if (!trimmedContent && !image_url && !video_url) {
    return res.status(400).json({ error: 'A publicação precisa ter ao menos um texto, fotografia ou vídeo.' });
  }

  const postId = 'post_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const authorId = req.user?.id || 'anon';
  const authorName = req.user?.name || 'Missionário';
  const authorAvatar = req.user?.picture_url || null;

  db.prepare(`
    INSERT INTO community_posts (
      id, author_id, author_name, author_avatar, content, category,
      image_url, video_url, link_url, likes_count, comments_count, is_pinned,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
  `).run(
    postId,
    authorId,
    authorName,
    authorAvatar,
    trimmedContent,
    category || 'Geral',
    image_url || null,
    video_url || null,
    link_url || null,
    now,
    now
  );

  return res.status(201).json({
    id: postId,
    author_id: authorId,
    author_name: authorName,
    author_avatar: authorAvatar,
    content: trimmedContent,
    category: category || 'Geral',
    image_url: image_url || null,
    video_url: video_url || null,
    link_url: link_url || null,
    is_pinned: 0,
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    created_at: now,
  });
});

// POST /api/community/posts/:id/like
communityRouter.post('/posts/:id/like', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Faça login para curtir.' });
  }

  const post = db.prepare('SELECT id, likes_count FROM community_posts WHERE id = ?').get(id) as any;
  if (!post) {
    return res.status(404).json({ error: 'Publicação não encontrada.' });
  }

  const existingLike = db
    .prepare('SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?')
    .get(id, userId) as any;

  let liked = false;
  let newCount = post.likes_count || 0;

  if (existingLike) {
    db.prepare('DELETE FROM community_likes WHERE id = ?').run(existingLike.id);
    newCount = Math.max(0, newCount - 1);
    liked = false;
  } else {
    const likeId = 'like_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO community_likes (id, post_id, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(likeId, id, userId, new Date().toISOString());
    newCount += 1;
    liked = true;
  }

  db.prepare('UPDATE community_posts SET likes_count = ? WHERE id = ?').run(newCount, id);

  return res.json({ liked, likes_count: newCount });
});

// GET /api/community/posts/:id/comments
communityRouter.get('/posts/:id/comments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const comments = db
    .prepare('SELECT * FROM community_comments WHERE post_id = ? ORDER BY created_at ASC')
    .all(id);
  return res.json(comments);
});

// POST /api/community/posts/:id/comments
communityRouter.post('/posts/:id/comments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'O comentário não pode estar vazio.' });
  }

  const post = db.prepare('SELECT id, comments_count FROM community_posts WHERE id = ?').get(id) as any;
  if (!post) {
    return res.status(404).json({ error: 'Publicação não encontrada.' });
  }

  const commentId = 'cmt_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const authorId = req.user?.id || 'anon';
  const authorName = req.user?.name || 'Missionário';

  db.prepare(`
    INSERT INTO community_comments (id, post_id, author_id, author_name, author_photo, content, created_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?)
  `).run(commentId, id, authorId, authorName, content.trim(), now);

  const newCount = (post.comments_count || 0) + 1;
  db.prepare('UPDATE community_posts SET comments_count = ? WHERE id = ?').run(newCount, id);

  return res.status(201).json({
    id: commentId,
    post_id: id,
    author_id: authorId,
    author_name: authorName,
    content: content.trim(),
    created_at: now,
  });
});

// DELETE /api/community/posts/:id
communityRouter.delete('/posts/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(id) as any;

  if (!post) {
    return res.status(404).json({ error: 'Publicação não encontrada.' });
  }

  const isCoord = req.user?.role === 'admin' || req.user?.role === 'coordenador';
  if (post.author_id !== req.user?.id && !isCoord) {
    return res.status(403).json({ error: 'Você não tem permissão para remover esta publicação.' });
  }

  db.prepare('DELETE FROM community_comments WHERE post_id = ?').run(id);
  db.prepare('DELETE FROM community_likes WHERE post_id = ?').run(id);
  db.prepare('DELETE FROM community_posts WHERE id = ?').run(id);

  return res.json({ message: 'Publicação removida com sucesso.' });
});
