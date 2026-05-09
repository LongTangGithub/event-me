import { Router } from 'express';
import db from '../db.js';

const router = Router();

const ALLOWED_COLS = new Set(['username', 'name', 'email']);

export const getUser = (userId) => {
  const byId = db.prepare('SELECT * FROM users WHERE id = @userId');
  return byId.get({ userId });
}

router.get('/', (_req, res) => {
  const listUsers = db.prepare(`SELECT * FROM users`)
  const users = listUsers.all();
  res.json(users);
});

router.post('/new', (req, res) => {
  const data = req.body;
  const safeCols = Object.keys(data).filter(c => ALLOWED_COLS.has(c));
  const colStr = safeCols.join(', ');
  const paramStr = safeCols.map(c => `@${c}`).join(', ');
  const insertUser = db.prepare(`INSERT INTO users (${colStr}) VALUES (${paramStr})`);
  const { lastInsertRowid: id } = insertUser.run(data);
  const user = getUser(id);
  res.json(user);
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const user = getUser(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

router.patch('/:id', (req, res) => {
  const userId = req.params.id;
  const patch = req.body;

  const updateUser = db.transaction((patch) => {
    for (const [col, val] of Object.entries(patch)) {
      if (!ALLOWED_COLS.has(col)) continue;
      db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(val, userId);
    }
  });

  updateUser(patch);
  const updated = getUser(userId);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const deleteUser = db.prepare(`DELETE FROM users WHERE id = @userId`)
  const userId = parseInt(req.params.id);
  const user = getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  deleteUser.run({ userId });
  res.json(user);
});

export default router;
