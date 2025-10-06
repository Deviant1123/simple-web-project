const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const flash = require('connect-flash');
const methodOverride = require('method-override');
const helmet = require('helmet');
const csrf = require('csurf');
require('dotenv').config();

const { getPool, initSchemaIfNeeded } = require('./services/db');
const { ensureFirstRunAdmin } = require('./services/bootstrap');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const { setupLayouts } = require('./views/_ejs-mate-setup');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
setupLayouts(app);
app.set('view layout', 'layout');

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const sessionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'labainfsec',
};

const sessionStore = new MySQLStore(sessionOptions);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

app.use(flash());

// CSRF after session
app.use(csrf());
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  // Capture flash messages once so templates don't consume them twice
  res.locals.flashError = req.flash('error');
  res.locals.flashInfo = req.flash('info');
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.get('/about', (req, res) => res.render('about', { title: 'О программе' }));

app.use((err, req, res, next) => {
  // CSRF and other errors
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Invalid CSRF token. Please try again.');
    const referer = req.get('Referer');
    const host = req.get('host');
    const base = req.protocol + '://' + host;
    const fallback = req.session && req.session.user ? '/user' : '/login';
    return res.redirect(referer && typeof referer === 'string' && referer.startsWith(base) ? referer : fallback);
  }
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Internal Server Error' });
});

const port = process.env.PORT || 3000;

(async () => {
  await initSchemaIfNeeded();
  await ensureFirstRunAdmin();
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
})();


