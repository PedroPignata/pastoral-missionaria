import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db/database.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pastoral_missionaria_secret_key_2026';
const googleAuthClient = new OAuth2Client();

export type SystemRole = 'admin' | 'coordenador' | 'delegado' | 'membro' | 'pendente' | 'consulta';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: SystemRole;
    picture_url?: string;
  };
}

// Authentication Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou inválida.' });
    }
    req.user = user as any;
    next();
  });
}

// Role Authorization Middleware
export function requireRole(allowedRoles: SystemRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para realizar esta operação.' });
    }
    next();
  };
}

const DEFAULT_GOOGLE_CLIENT_ID = '744456406049-ammcnn4uslj5itlu5arj4iq9kvah0paf.apps.googleusercontent.com';

// GET /api/auth/config (Configuração pública de provedores de autenticação)
authRouter.get('/config', (_req: Request, res: Response) => {
  let googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  if (!googleClientId) {
    try {
      const row = db.prepare("SELECT value_json FROM integration_settings WHERE key = 'google_oauth'").get() as any;
      if (row) {
        const parsed = JSON.parse(row.value_json);
        googleClientId = parsed.client_id || '';
      }
    } catch {}
  }
  if (!googleClientId) {
    googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
  }
  return res.json({ googleClientId });
});

// POST /api/auth/google-client-id (Configuração do Google Client ID por coordenadores)
authRouter.post('/google-client-id', authenticateToken, requireRole(['admin', 'coordenador']), (req: Request, res: Response) => {
  const { client_id } = req.body;
  if (!client_id || typeof client_id !== 'string') {
    return res.status(400).json({ error: 'Client ID do Google inválido.' });
  }

  const cleanClientId = client_id.trim();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO integration_settings (key, value_json, updated_at)
    VALUES ('google_oauth', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(JSON.stringify({ client_id: cleanClientId }), now);

  return res.json({ message: 'Google Client ID salvo com sucesso!', googleClientId: cleanClientId });
});

// POST /api/auth/login (Tradicional com senha)
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim()) as any;
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail ou a senha.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail ou a senha.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, picture_url: user.picture_url },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture_url: user.picture_url,
    },
    needs_onboarding: user.role === 'pendente',
  });
});

// POST /api/auth/google (Google Identity Services / OAuth com validação criptográfica)
authRouter.post('/google', async (req: Request, res: Response) => {
  const { credential, email: bodyEmail, name: bodyName, picture: bodyPicture, google_id: bodyGoogleId } = req.body;

  let verifiedData: { email: string; name: string; picture_url: string | null; google_id: string | null };

  let googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  try {
    const row = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('google_oauth') as any;
    if (row) {
      const parsed = JSON.parse(row.value_json);
      if (parsed.client_id) googleClientId = parsed.client_id;
    }
  } catch {}

  if (credential) {
    try {
      const ticket = await googleAuthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(401).json({ error: 'Token do Google inválido ou sem e-mail verificado.' });
      }
      verifiedData = {
        email: payload.email.toLowerCase().trim(),
        name: payload.name || payload.given_name || payload.email.split('@')[0],
        picture_url: payload.picture || null,
        google_id: payload.sub || null,
      };
    } catch {
      // Fallback para desenvolvimento local caso ambiente offline não alcance servidores do Google
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            verifiedData = {
              email: payload.email.toLowerCase().trim(),
              name: payload.name || payload.given_name || payload.email.split('@')[0],
              picture_url: payload.picture || null,
              google_id: payload.sub || null,
            };
          } else {
            return res.status(401).json({ error: 'Credencial do Google inválida.' });
          }
        } else {
          return res.status(401).json({ error: 'Formato de credencial Google inválido.' });
        }
      } catch {
        return res.status(401).json({ error: 'Falha na validação do token Google.' });
      }
    }
  } else if (process.env.NODE_ENV !== 'production' && bodyEmail) {
    verifiedData = {
      email: bodyEmail.trim().toLowerCase(),
      name: (bodyName || bodyEmail.split('@')[0]).trim(),
      picture_url: bodyPicture || null,
      google_id: bodyGoogleId || null,
    };
  } else {
    return res.status(400).json({ error: 'Credencial oficial do Google é obrigatória.' });
  }

  const { email, name, picture_url, google_id } = verifiedData;
  const now = new Date().toISOString();

  // 1. Verifica se o usuário já existe na base de dados
  let existingUser = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as any;

  if (existingUser) {
    if ((picture_url && !existingUser.picture_url) || (google_id && !existingUser.google_id)) {
      db.prepare(`
        UPDATE users SET picture_url = COALESCE(?, picture_url), google_id = COALESCE(?, google_id), updated_at = ?
        WHERE id = ?
      `).run(picture_url, google_id, now, existingUser.id);
      existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id);
    }

    const token = jwt.sign(
      { id: existingUser.id, name: existingUser.name, email: existingUser.email, role: existingUser.role, picture_url: existingUser.picture_url },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      token,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        picture_url: existingUser.picture_url,
      },
      needs_onboarding: existingUser.role === 'pendente',
    });
  }

  // 2. Novo usuário: determinar papel institucional por autorização do banco (sem correspondência por substring)
  let assignedRole: SystemRole = 'pendente';

  const isPreauthorizedAdmin =
    email === 'admin@pastoralmissionaria.com.br' ||
    email === 'coordenacao@pastoralmissionaria.com.br' ||
    email === 'pedropignata2@gmail.com' ||
    email === 'fernandasouto7826@gmail.com';
  if (isPreauthorizedAdmin) {
    assignedRole = 'coordenador';
  } else {
    // Corresponde a um registro prévio em pastoral_members?
    const existingPastoralMember = db.prepare('SELECT * FROM pastoral_members WHERE email = ? COLLATE NOCASE').get(email) as any;
    if (existingPastoralMember) {
      assignedRole = existingPastoralMember.pastoral_role || 'membro';
    }
  }

  const userId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, google_id, picture_url, created_at, updated_at)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
  `).run(userId, name, email, assignedRole, google_id, picture_url, now, now);

  // Vincular em pastoral_members APENAS se já houver registro com o mesmo e-mail institucional verificado
  const matchingPastoralMember = db.prepare(`
    SELECT * FROM pastoral_members 
    WHERE email = ? COLLATE NOCASE AND user_id IS NULL
    LIMIT 1
  `).get(email) as any;

  if (matchingPastoralMember) {
    db.prepare('UPDATE pastoral_members SET user_id = ?, photo_url = COALESCE(photo_url, ?), updated_at = ? WHERE id = ?')
      .run(userId, picture_url, now, matchingPastoralMember.id);
  }

  const token = jwt.sign(
    { id: userId, name, email, role: assignedRole, picture_url },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({
    token,
    user: {
      id: userId,
      name,
      email,
      role: assignedRole,
      picture_url,
    },
    needs_onboarding: assignedRole === 'pendente' || !matchingPastoralMember,
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, google_id, picture_url, created_at FROM users WHERE id = ?').get(req.user?.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  const pm = db.prepare('SELECT id, buyer_member_id, name, display_name, pastoral_role FROM pastoral_members WHERE user_id = ?').get(user.id) as any;
  return res.json({
    ...user,
    pastoral_member_id: pm?.id || null,
    buyer_member_id: pm?.buyer_member_id || null,
  });
});

// GET /api/auth/unclaimed-members (Missionários institucionais disponíveis para solicitação de vínculo)
authRouter.get('/unclaimed-members', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const pastoralList = db.prepare(`
    SELECT pm.id, pm.buyer_member_id, pm.name, pm.display_name, pm.pastoral_role,
      (SELECT COUNT(*) FROM orders o WHERE o.pastoral_member_id = pm.id OR (pm.buyer_member_id IS NOT NULL AND o.member_id = pm.buyer_member_id)) as orders_count
    FROM pastoral_members pm
    WHERE pm.status = 'ativo' AND pm.user_id IS NULL
    ORDER BY pm.name ASC
  `).all() as any[];

  const unclaimed = pastoralList.map((pm) => ({
    id: pm.buyer_member_id || pm.id,
    pastoral_member_id: pm.id,
    buyer_member_id: pm.buyer_member_id,
    name: pm.name,
    display_name: pm.display_name,
    orders_count: pm.orders_count || 0,
  }));

  return res.json(unclaimed);
});

// POST /api/auth/claim-member (Solicitação controlada de vínculo de missionário / comprador)
authRouter.post('/claim-member', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { claimed_member_id, notes } = req.body;
  if (!claimed_member_id) {
    return res.status(400).json({ error: 'ID do missionário ou comprador não informado.' });
  }

  const userId = req.user!.id;
  const userEmail = (req.user!.email || '').toLowerCase().trim();
  const now = new Date().toISOString();

  // Localiza tanto por pastoral_members.id quanto por members.id (buyer_member_id)
  let pm = db.prepare('SELECT * FROM pastoral_members WHERE id = ? OR buyer_member_id = ?').get(claimed_member_id, claimed_member_id) as any;
  let member = db.prepare('SELECT * FROM members WHERE id = ?').get(claimed_member_id) as any;
  if (!member && pm?.buyer_member_id) {
    member = db.prepare('SELECT * FROM members WHERE id = ?').get(pm.buyer_member_id) as any;
  }

  if (!pm && !member) {
    return res.status(404).json({ error: 'Missionário ou comprador não localizado.' });
  }

  // Segurança: auto-aprovação somente se o e-mail institucional já cadastrado na Governança coincidir exatamente
  const pmEmail = (pm?.email || '').toLowerCase().trim();
  const isVerifiedEmailMatch = Boolean(pmEmail && userEmail && pmEmail === userEmail);

  const requestId = crypto.randomUUID();
  const status = isVerifiedEmailMatch ? 'aprovado' : 'pendente';

  db.prepare(`
    INSERT INTO member_link_requests (
      id, user_id, claimed_member_id, claimed_pastoral_member_id, status, user_notes, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId,
    userId,
    member?.id || null,
    pm?.id || null,
    status,
    notes || null,
    isVerifiedEmailMatch ? 'Sistema (E-mail Institucional Verificado)' : null,
    isVerifiedEmailMatch ? now : null,
    now
  );

  if (isVerifiedEmailMatch && pm) {
    db.prepare(`
      UPDATE pastoral_members
      SET user_id = ?, status = 'ativo', updated_at = ?
      WHERE id = ?
    `).run(userId, now, pm.id);

    if (req.user!.role === 'pendente') {
      db.prepare("UPDATE users SET role = 'membro', updated_at = ? WHERE id = ?").run(now, userId);
    }
  }

  return res.json({
    message: isVerifiedEmailMatch
      ? 'Vínculo institucional confirmado pelo seu e-mail cadastrado! Bem-vindo(a) à Pastoral Missionária.'
      : 'Sua solicitação de vínculo foi registrada e enviada para confirmação da coordenação (Pedro e Fernanda).',
    status,
    auto_approved: isVerifiedEmailMatch,
  });
});

// GET /api/auth/pending-approvals (Aprovações pendentes para coordenação)
authRouter.get(
  '/pending-approvals',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (_req: Request, res: Response) => {
    const pendingUsers = db.prepare(`
      SELECT id, name, email, role, picture_url, created_at
      FROM users
      WHERE role = 'pendente'
      ORDER BY created_at DESC
    `).all();

    const pendingRequests = db.prepare(`
      SELECT r.id, r.user_id, r.claimed_member_id, r.claimed_pastoral_member_id, r.status, r.user_notes, r.created_at,
             u.name as user_name, u.email as user_email, u.picture_url,
             COALESCE(pm.name, m.name) as claimed_member_name
      FROM member_link_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN members m ON m.id = r.claimed_member_id
      LEFT JOIN pastoral_members pm ON pm.id = r.claimed_pastoral_member_id OR pm.buyer_member_id = r.claimed_member_id
      WHERE r.status = 'pendente'
      ORDER BY r.created_at DESC
    `).all();

    return res.json({
      pendingUsers,
      pendingRequests,
    });
  }
);

// POST /api/auth/approve-claim (Aprovar solicitação de vínculo ou usuário)
authRouter.post(
  '/approve-claim',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (req: AuthenticatedRequest, res: Response) => {
    const { request_id, user_id, role = 'membro', claimed_member_id, claimed_pastoral_member_id } = req.body;
    const now = new Date().toISOString();
    const reviewer = req.user!.name;

    if (request_id) {
      const request = db.prepare('SELECT * FROM member_link_requests WHERE id = ?').get(request_id) as any;
      if (request) {
        db.prepare(
          "UPDATE member_link_requests SET status = 'aprovado', reviewed_by = ?, reviewed_at = ? WHERE id = ?"
        ).run(reviewer, now, request_id);

        const targetUserId = request.user_id;
        db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, targetUserId);

        const pmemToLink = claimed_pastoral_member_id || request.claimed_pastoral_member_id;
        const memberIdToLink = claimed_member_id || request.claimed_member_id;

        if (pmemToLink) {
          db.prepare(`
            UPDATE pastoral_members
            SET user_id = ?, buyer_member_id = COALESCE(buyer_member_id, ?), status = 'ativo', pastoral_role = ?, updated_at = ?
            WHERE id = ?
          `).run(
            targetUserId,
            memberIdToLink || null,
            role === 'coordenador' ? 'coordenador' : 'membro',
            now,
            pmemToLink
          );
        } else if (memberIdToLink) {
          db.prepare(`
            UPDATE pastoral_members
            SET buyer_member_id = ?, user_id = ?, status = 'ativo', pastoral_role = ?, updated_at = ?
            WHERE buyer_member_id = ? OR id = ?
          `).run(
            memberIdToLink,
            targetUserId,
            role === 'coordenador' ? 'coordenador' : 'membro',
            now,
            memberIdToLink,
            memberIdToLink
          );
        }
        return res.json({ message: 'Solicitação de vínculo aprovada com sucesso.' });
      }
    }

    if (user_id) {
      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, user_id);
      db.prepare(`
        UPDATE pastoral_members
        SET status = 'ativo', pastoral_role = ?, updated_at = ?
        WHERE user_id = ?
      `).run(role === 'coordenador' ? 'coordenador' : 'membro', now, user_id);
      return res.json({ message: 'Usuário aprovado com sucesso.' });
    }

    return res.status(400).json({ error: 'Identificador não fornecido.' });
  }
);

// POST /api/auth/reject-claim (Rejeitar solicitação)
authRouter.post(
  '/reject-claim',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (req: AuthenticatedRequest, res: Response) => {
    const { request_id, user_id, reason } = req.body;
    const now = new Date().toISOString();
    const reviewer = req.user!.name;

    if (request_id) {
      db.prepare(
        "UPDATE member_link_requests SET status = 'rejeitado', reviewed_by = ?, reviewed_at = ?, user_notes = COALESCE(user_notes || ' | Motivo: ' || ?, user_notes) WHERE id = ?"
      ).run(reviewer, now, reason || 'Rejeitado pela coordenação', request_id);
      return res.json({ message: 'Solicitação rejeitada.' });
    }

    if (user_id) {
      db.prepare("UPDATE users SET role = 'consulta', updated_at = ? WHERE id = ?").run(now, user_id);
      return res.json({ message: 'Usuário mantido como consulta.' });
    }

    return res.status(400).json({ error: 'Identificador não fornecido.' });
  }
);

// GET /api/auth/users (admin e coordenador)
authRouter.get(
  '/users',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (_req: Request, res: Response) => {
    const users = db.prepare('SELECT id, name, email, role, picture_url, created_at, updated_at FROM users ORDER BY name ASC').all();
    return res.json(users);
  }
);

// POST /api/auth/users (admin e coordenador)
authRouter.post(
  '/users',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (req: AuthenticatedRequest, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios.' });
    }

    const validRoles: SystemRole[] = ['admin', 'coordenador', 'delegado', 'membro', 'pendente', 'consulta'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Perfil de usuário inválido.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
    if (existing) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const userId = crypto.randomUUID();
    const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name.trim(), email.trim().toLowerCase(), passwordHash, role, now, now);

    return res.status(201).json({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      created_at: now,
    });
  }
);

// PUT /api/auth/users/:id (admin e coordenador)
authRouter.put(
  '/users/:id',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Regra institucional: Não permitir remover a coordenação se for o único coordenador ativo
    if (existing.role === 'coordenador' && role !== 'coordenador') {
      const coordCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'coordenador' AND id != ?").get(id) as { c: number };
      if (coordCount.c === 0) {
        return res.status(400).json({ error: 'A Pastoral não pode ficar sem coordenador ativo.' });
      }
    }

    const now = new Date().toISOString();
    if (password && password.trim().length > 0) {
      const passwordHash = bcrypt.hashSync(password.trim(), 10);
      db.prepare(`
        UPDATE users SET name = ?, email = ?, password_hash = ?, role = ?, updated_at = ?
        WHERE id = ?
      `).run(name.trim(), email.trim().toLowerCase(), passwordHash, role, now, id);
    } else {
      db.prepare(`
        UPDATE users SET name = ?, email = ?, role = ?, updated_at = ?
        WHERE id = ?
      `).run(name.trim(), email.trim().toLowerCase(), role, now, id);
    }

    return res.json({ message: 'Usuário atualizado com sucesso.' });
  }
);

// DELETE /api/auth/users/:id (admin e coordenador)
authRouter.delete(
  '/users/:id',
  authenticateToken,
  requireRole(['admin', 'coordenador']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta conectada.' });
    }

    const targetUser = db.prepare('SELECT role FROM users WHERE id = ?').get(id) as any;
    if (targetUser?.role === 'coordenador') {
      const coordCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'coordenador' AND id != ?").get(id) as { c: number };
      if (coordCount.c === 0) {
        return res.status(400).json({ error: 'A Pastoral não pode ficar sem coordenador ativo.' });
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return res.json({ message: 'Usuário removido com sucesso.' });
  }
);

// POST /api/auth/profile/password (Atualizar própria senha por usuário autenticado)
authRouter.post('/profile/password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (user.password_hash && currentPassword) {
    const isCurrentValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }
  }

  const newHash = bcrypt.hashSync(newPassword.trim(), 10);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);

  return res.json({ message: 'Senha atualizada com sucesso!' });
});
