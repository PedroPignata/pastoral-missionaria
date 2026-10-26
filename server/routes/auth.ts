import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/database.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pastoral_missionaria_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'coordenador' | 'consulta';
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
export function requireRole(allowedRoles: ('admin' | 'coordenador' | 'consulta')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para realizar esta operação.' });
    }
    next();
  };
}

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as any;
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail ou a senha.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail ou a senha.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
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
    },
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user?.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  return res.json(user);
});

// GET /api/auth/users (admin only)
authRouter.get('/users', authenticateToken, requireRole(['admin']), (_req: Request, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY name ASC').all();
  return res.json(users);
});

// POST /api/auth/users (admin only)
authRouter.post('/users', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  if (!['admin', 'coordenador', 'consulta'].includes(role)) {
    return res.status(400).json({ error: 'Perfil de usuário inválido.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const userId = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
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
});

// PUT /api/auth/users/:id (admin only)
authRouter.put('/users/:id', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
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
});

// DELETE /api/auth/users/:id (admin only)
authRouter.delete('/users/:id', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.user?.id === id) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta conectada.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.json({ message: 'Usuário removido com sucesso.' });
});

