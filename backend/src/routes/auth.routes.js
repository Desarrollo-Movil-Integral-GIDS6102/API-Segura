'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { registerSchema, loginSchema, refreshSchema } = require('../schemas/auth.schema');
const authController = require('../controllers/auth.controller');

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const limiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    },
  });

/** Registers an account and returns its initial token pair. */
router.post(
  '/register',
  limiter(10),
  validate(registerSchema, 'body'),
  asyncRoute(authController.register),
);

/** Authenticates an account and returns its token pair. */
router.post(
  '/login',
  limiter(10),
  validate(loginSchema, 'body'),
  asyncRoute(authController.login),
);

/** Rotates a refresh token and returns the replacement pair. */
router.post(
  '/refresh',
  limiter(30),
  validate(refreshSchema, 'body'),
  asyncRoute(authController.refresh),
);

/** Revokes the refresh-token family supplied by the client. */
router.post(
  '/logout',
  limiter(30),
  validate(refreshSchema, 'body'),
  asyncRoute(authController.logout),
);

/** Revokes all refresh tokens belonging to the authenticated user. */
router.post(
  '/logout-all',
  requireAuth,
  asyncRoute(authController.logoutAll),
);

module.exports = router;
