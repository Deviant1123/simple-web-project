const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../services/db');
const { passwordMeetsPolicy } = require('../utils/passwordPolicy');

const router = express.Router();

function requireUser(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Требуется вход');
    return res.redirect('/login');
  }
  if (req.session.user.is_admin) {
    return res.redirect('/admin');
  }
  next();
}

router.use(requireUser);

router.get('/', (req, res) => {
  res.render('user/dashboard', { title: 'Профиль' });
});

router.get('/change-password', async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT enforce_policy FROM users WHERE id = ?', [req.session.user.id]);
  const user = rows[0] || { enforce_policy: 0 };
  const showPolicyHint = Boolean(user.enforce_policy);
  res.render('change_password', { title: 'Смена пароля', showPolicyHint });
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
      const fallback = '/user/change-password';
      const referer = req.get('Referer');
      return res.redirect(referer && referer.startsWith(req.protocol + '://' + req.get('host')) ? referer : fallback);
    }
  } else if ((oldPassword || '') !== '') {
    req.flash('error', 'Старый пароль должен быть пустым');
    const fallback = '/user/change-password';
    const referer = req.get('Referer');
    return res.redirect(referer && referer.startsWith(req.protocol + '://' + req.get('host')) ? referer : fallback);
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Пароли не совпадают');
    const fallback = '/user/change-password';
    const referer = req.get('Referer');
    return res.redirect(referer && referer.startsWith(req.protocol + '://' + req.get('host')) ? referer : fallback);
  }

  if (user.enforce_policy && !passwordMeetsPolicy(newPassword)) {
    req.flash('error', 'Пароль не соответствует требованиям политики');
    const fallback = '/user/change-password';
    const referer = req.get('Referer');
    return res.redirect(referer && referer.startsWith(req.protocol + '://' + req.get('host')) ? referer : fallback);
  }

  const hash = newPassword ? await bcrypt.hash(newPassword, 10) : '';
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  req.flash('info', 'Пароль изменен');
  res.redirect('/user');
});

module.exports = router;


