import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/database.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pastoral_missionaria_secret_key_2026';

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

// POST /api/auth/google (Google Identity Services / OAuth)
authRouter.post('/google', (req: Request, res: Response) => {
  const { credential, email: bodyEmail, name: bodyName, picture: bodyPicture, google_id: bodyGoogleId } = req.body;

  let email = '';
  let name = '';
  let picture_url: string | null = null;
  let google_id: string | null = null;

  if (credential) {
    try {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        email = payload.email || '';
        name = payload.name || payload.given_name || '';
        picture_url = payload.picture || null;
        google_id = payload.sub || null;
      }
    } catch {
      // Ignora erro no parse e usa fallback
    }
  }

  if (!email && bodyEmail) {
    email = bodyEmail;
    name = bodyName || email.split('@')[0];
    picture_url = bodyPicture || null;
    google_id = bodyGoogleId || null;
  }

  if (!email) {
    return res.status(400).json({ error: 'E-mail do Google não informado ou inválido.' });
  }

  email = email.trim().toLowerCase();
  name = (name || email.split('@')[0]).trim();
  const now = new Date().toISOString();

  // Verifica se o usuário já existe
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

  // Novo usuário Google: determinar papel institucional
  let assignedRole: SystemRole = 'pendente';

  // 1. Coordenadores natos (Pedro e Fernanda)
  const isNamedCoordinator =
    email.includes('pedropignata') ||
    email.includes('fernanda') ||
    email === 'admin@pastoralmissionaria.com.br';

  if (isNamedCoordinator) {
    assignedRole = 'coordenador';
  } else {
    // 2. Corresponde a um registro existente em pastoral_members?
    const existingPastoralMember = db.prepare('SELECT * FROM pastoral_members WHERE email = ? COLLATE NOCASE').get(email) as any;
    if (existingPastoralMember) {
      assignedRole = existingPastoralMember.pastoral_role || 'membro';
    } else {
      // 3. Corresponde por nome a um missionário cadastrado
      const nameMatch = db.prepare('SELECT * FROM pastoral_members WHERE name = ? COLLATE NOCASE OR display_name = ? COLLATE NOCASE').get(name, name) as any;
      if (nameMatch) {
        assignedRole = nameMatch.pastoral_role || 'membro';
      }
    }
  }

  const userId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, google_id, picture_url, created_at, updated_at)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
  `).run(userId, name, email, assignedRole, google_id, picture_url, now, now);

  // Vincular em pastoral_members se já houver registro com mesmo nome/email
  const matchingPastoralMember = db.prepare(`
    SELECT * FROM pastoral_members 
    WHERE (email = ? COLLATE NOCASE OR name = ? COLLATE NOCASE) AND user_id IS NULL
    LIMIT 1
  `).get(email, name) as any;

  if (matchingPastoralMember) {
    db.prepare('UPDATE pastoral_members SET user_id = ?, email = COALESCE(email, ?), photo_url = COALESCE(photo_url, ?), updated_at = ? WHERE id = ?')
      .run(userId, email, picture_url, now, matchingPastoralMember.id);
  } else {
    const pmemId = `pmem_${crypto.randomBytes(6).toString('hex')}`;
    db.prepare(`
      INSERT INTO pastoral_members (id, user_id, name, display_name, email, photo_url, status, pastoral_role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pmemId,
      userId,
      name,
      name.split(' ')[0],
      email,
      picture_url,
      assignedRole === 'pendente' ? 'pendente' : 'ativo',
      assignedRole === 'coordenador' ? 'coordenador' : 'membro',
      now,
      now
    );
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
    needs_onboarding: assignedRole === 'pendente',
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, google_id, picture_url, created_at FROM users WHERE id = ?').get(req.user?.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  return res.json(user);
});

// GET /api/auth/unclaimed-members (Membros/compradores disponíveis para vínculo de onboarding)
authRouter.get('/unclaimed-members', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const membersList = db.prepare(`
    SELECT m.id, m.name, m.display_name,
      (SELECT COUNT(*) FROM orders o WHERE o.member_id = m.id) as orders_count,
      (SELECT pm.id FROM pastoral_members pm WHERE pm.buyer_member_id = m.id AND pm.user_id IS NOT NULL) as claimed_by_user
    FROM members m
    WHERE m.active = 1
    ORDER BY m.name ASC
  `).all() as any[];

  const unclaimed = membersList.filter((m) => !m.claimed_by_user).map((m) => ({
    id: m.id,
    name: m.name,
    display_name: m.display_name,
    orders_count: m.orders_count,
  }));

  return res.json(unclaimed);
});

// POST /api/auth/claim-member (Solicitação de vínculo de missionário / comprador)
authRouter.post('/claim-member', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { claimed_member_id, notes } = req.body;
  if (!claimed_member_id) {
    return res.status(400).json({ error: 'ID do comprador ou membro não informado.' });
  }

  const userId = req.user!.id;
  const now = new Date().toISOString();

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(claimed_member_id) as any;
  if (!member) {
    return res.status(404).json({ error: 'Membro ou comprador não localizado.' });
  }

  // Verifica se há correspondência de nome exato/parcial (auto-aprovação assistida)
  const userNameNorm = req.user!.name.toLowerCase().trim();
  const memberNameNorm = member.name.toLowerCase().trim();
  const isAutoApprovable =
    userNameNorm === memberNameNorm ||
    memberNameNorm.includes(userNameNorm) ||
    userNameNorm.includes(memberNameNorm);

  const requestId = crypto.randomUUID();
  const status = isAutoApprovable ? 'aprovado' : 'pendente';

  db.prepare(`
    INSERT INTO member_link_requests (id, user_id, claimed_member_id, status, user_notes, reviewed_by, reviewed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId,
    userId,
    claimed_member_id,
    status,
    notes || null,
    isAutoApprovable ? 'Sistema (Correspondência de Nome)' : null,
    isAutoApprovable ? now : null,
    now
  );

  if (isAutoApprovable) {
    db.prepare(`
      UPDATE pastoral_members
      SET buyer_member_id = ?, user_id = ?, status = 'ativo', updated_at = ?
      WHERE buyer_member_id = ? OR name = ? COLLATE NOCASE
    `).run(claimed_member_id, userId, now, claimed_member_id, member.name);

    if (req.user!.role === 'pendente') {
      db.prepare("UPDATE users SET role = 'membro', updated_at = ? WHERE id = ?").run(now, userId);
    }
  }

  return res.json({
    message: isAutoApprovable
      ? 'Vínculo confirmado com sucesso! Bem-vindo(a) à Pastoral Missionária.'
      : 'Sua solicitação de vínculo foi registrada e enviada à coordenação (Pedro e Fernanda).',
    status,
    auto_approved: isAutoApprovable,
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
      SELECT r.id, r.user_id, r.claimed_member_id, r.status, r.user_notes, r.created_at,
             u.name as user_name, u.email as user_email, u.picture_url,
             m.name as claimed_member_name
      FROM member_link_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN members m ON m.id = r.claimed_member_id
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
    const { request_id, user_id, role = 'membro', claimed_member_id } = req.body;
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

        const memberIdToLink = claimed_member_id || request.claimed_member_id;
        if (memberIdToLink) {
          db.prepare(`
            UPDATE pastoral_members
            SET buyer_member_id = ?, user_id = ?, status = 'ativo', pastoral_role = ?, updated_at = ?
            WHERE buyer_member_id = ? OR id = (SELECT id FROM pastoral_members WHERE user_id = ?)
          `).run(
            memberIdToLink,
            targetUserId,
            role === 'coordenador' ? 'coordenador' : 'membro',
            now,
            memberIdToLink,
            targetUserId
          );
        }
        return res.json({ message: 'Solicitação aprovada com sucesso.' });
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
