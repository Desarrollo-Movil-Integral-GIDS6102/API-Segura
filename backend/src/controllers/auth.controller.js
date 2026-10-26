'use strict';

const authService = require('../services/auth.service');

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

async function refresh(req, res) {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
}

async function logout(req, res) {
  await authService.logout(req.body.refreshToken);
  res.status(204).end();
}

async function logoutAll(req, res) {
  await authService.logoutAll(req.user.id);
  res.status(204).end();
}

module.exports = { register, login, refresh, logout, logoutAll };
