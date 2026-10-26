'use strict';

const { prisma } = require('./task.repository');

/**
 * Finds a user by email.
 *
 * @param {string} email
 * @param {object} [db]
 */
function findByEmail(email, db = prisma) {
  return db.user.findUnique({ where: { email } });
}

/**
 * Finds a user by id.
 *
 * @param {string} id
 * @param {object} [db]
 */
function findById(id, db = prisma) {
  return db.user.findUnique({ where: { id } });
}

/**
 * Creates a new user.
 *
 * @param {{email: string, passwordHash: string}} data
 * @param {object} [db]
 */
function create(data, db = prisma) {
  return db.user.create({ data });
}

module.exports = { findByEmail, findById, create };
