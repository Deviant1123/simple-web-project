const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../services/db');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.is_admin ? '/admin' : '/user');
  }
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.render('login', { title: 'Вход' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  if (rows.length === 0) {
    req.flash('error', 'Пользователь не найден');
    return res.redirect('/login');
  }

  const user = rows[0];
  if (user.is_locked) {
    req.flash('error', 'вы были заблокированны');
    return res.redirect('/login');
  }

  let ok = false;
  if (!user.password_hash || user.password_hash === '') {
    ok = password === '';
  } else {
    ok = await bcrypt.compare(password, user.password_hash);
  }

  if (!ok) {
    const newAttempts = (user.failed_attempts || 0) + 1;
    await pool.query('UPDATE users SET failed_attempts = ? WHERE id = ?', [newAttempts, user.id]);
    if (newAttempts >= 3) {
      return res.render('terminated', { title: 'Завершение', reason: 'Три неверных попытки ввода пароля. Работа завершена.' });
    }
    req.flash('error', 'Неверный пароль');
    return res.redirect('/login');
  }

  await pool.query('UPDATE users SET failed_attempts = 0 WHERE id = ?', [user.id]);

  req.session.user = {
    id: user.id,
    username: user.username,
    is_admin: !!user.is_admin,
    enforce_policy: !!user.enforce_policy,
  };

  // Force password setup if empty
  if (!user.password_hash || user.password_hash === '') {
    if (user.is_admin) return res.redirect('/admin/change-password');
    return res.redirect('/user/change-password');
  }

  res.redirect(user.is_admin ? '/admin' : '/user');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;


