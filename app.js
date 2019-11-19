require('dotenv').config();

const path = require('path');
// const favicon = require('serve-favicon');
const axios = require('axios');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const session = require('express-session');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const { isAuthenticated, isNotAuthenticated } = require('./auth/auth-guard');

const strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);

passport.use(strategy);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// serve static
app.use('/assets', express.static(path.join(__dirname, '/public')));

// serve favicon
// app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));

const sess = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {}
};

if (app.get('env') === 'production') {
  sess.cookie.secure = true; // serve secure cookies, requires https
}

app.use(session(sess));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.user) {
    res.locals.username = req.user.displayName;
    res.locals.avatarURL = req.user.picture;
  }
  next();
});

app.get('/', isNotAuthenticated, (req, res) => {
  res.render('index');
});

app.get(
  '/login',
  isNotAuthenticated,
  passport.authenticate('auth0', { scope: 'openid email profile' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get(
  '/callback',
  passport.authenticate('auth0', { failureRedirect: '/login' }),
  function(req, res) {
    if (!req.user) {
      throw new Error('user null');
    }
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', isAuthenticated, (req, res) => {
  console.log(req.user);
  res.render('loggedIn/dashboard');
});

app.get('/logout', isAuthenticated, function(req, res) {
  req.logout();
  const returnTo = `http%3A%2F%2F${req.hostname}:${PORT}`;
  res.redirect(
    `https://${process.env.AUTH0_DOMAIN}/v2/logout?returnTo=${returnTo}`
  );
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
