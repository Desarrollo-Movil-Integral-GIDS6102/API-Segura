'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
} = require('../schemas/task.schema');
const taskController = require('../controllers/task.controller');

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.use(requireAuth);

router.get(
  '/',
  validate(listTasksSchema, 'query'),
  asyncRoute(taskController.list),
);

router.post(
  '/',
  validate(createTaskSchema, 'body'),
  asyncRoute(taskController.create),
);

router.patch(
  '/:taskId',
  validate(updateTaskSchema, 'body'),
  asyncRoute(taskController.update),
);

router.delete(
  '/:taskId',
  asyncRoute(taskController.remove),
);

module.exports = router;
