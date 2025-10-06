const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../services/db');
const { passwordMeetsPolicy } = require('../utils/passwordPolicy');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    req.flash('error', 'Доступ запрещен');
    return res.redirect('/login');
  }
  next();
}

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.render('admin/dashboard', { title: 'Администрирование' });
});

router.get('/users', async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, username, is_locked, enforce_policy, is_admin FROM users ORDER BY username');
  res.render('admin/users', { title: 'Пользователи', users: rows });
});

router.get('/users/:id', async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, username, is_locked, enforce_policy, is_admin FROM users WHERE id = ?', [req.params.id]);
  if (rows.length === 0) {
    req.flash('error', 'Пользователь не найден');
    return res.redirect('/admin/users');
  }
  const [all] = await pool.query('SELECT id FROM users ORDER BY username');
  const index = all.findIndex((u) => u.id === Number(req.params.id));
  const prevId = index > 0 ? all[index - 1].id : null;
  const nextId = index < all.length - 1 ? all[index + 1].id : null;
  res.render('admin/user_detail', { title: 'Инфо пользователя', user: rows[0], prevId, nextId });
});

router.post('/users', async (req, res) => {
  const { username } = req.body;
  const pool = getPool();
  try {
    await pool.query('INSERT INTO users (username, password_hash, is_admin) VALUES (?, "", 0)', [username]);
    req.flash('info', 'Пользователь добавлен с пустым паролем');
  } catch (e) {
    req.flash('error', 'Не удалось добавить пользователя (возможно, имя неуникально)');
  }
  res.redirect('/admin/users');
});

router.post('/users/:id/lock', async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.params.id]);
  if (rows.length && rows[0].is_admin) {
    req.flash('error', 'Нельзя блокировать ADMIN');
    return res.redirect('/admin/users');
  }
  await pool.query('UPDATE users SET is_locked = 1 WHERE id = ?', [req.params.id]);
  res.redirect('/admin/users');
});

router.post('/users/:id/unlock', async (req, res) => {
  const pool = getPool();
  await pool.query('UPDATE users SET is_locked = 0 WHERE id = ?', [req.params.id]);
  res.redirect('/admin/users');
});

router.post('/users/:id/policy/on', async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.params.id]);
  if (rows.length && rows[0].is_admin) {
    req.flash('error', 'Нельзя применять политику к ADMIN');
    return res.redirect('/admin/users');
  }
  await pool.query('UPDATE users SET enforce_policy = 1 WHERE id = ?', [req.params.id]);
  res.redirect('/admin/users');
});

router.post('/users/:id/policy/off', async (req, res) => {
  const pool = getPool();
  await pool.query('UPDATE users SET enforce_policy = 0 WHERE id = ?', [req.params.id]);
  res.redirect('/admin/users');
});

router.get('/change-password', (req, res) => {
  res.render('change_password', { title: 'Смена пароля администратора' });
});

router.post('/change-password', async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const user = rows[0];

  const hasPassword = !!user.password_hash && user.password_hash !== '';
  if (hasPassword) {
    const ok = await bcrypt.compare(oldPassword || '', user.password_hash);
    if (!ok) {
      req.flash('error', 'Неверный старый пароль');
      return res.redirect('back');
    }
  } else if ((oldPassword || '') !== '') {
    req.flash('error', 'Старый пароль должен быть пустым');
    return res.redirect('back');
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Пароли не совпадают');
    return res.redirect('back');
  }

  // Admin may have policy enforced too
  if (user.enforce_policy && !passwordMeetsPolicy(newPassword)) {
    req.flash('error', 'Пароль не соответствует требованиям политики');
    return res.redirect('back');
  }

  const hash = newPassword ? await bcrypt.hash(newPassword, 10) : '';
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  req.flash('info', 'Пароль изменен');
  res.redirect('/admin');
});

module.exports = router;


