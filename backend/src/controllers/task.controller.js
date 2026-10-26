'use strict';

const { TaskService } = require('../services/task.service');

const taskService = new TaskService();

async function list(req, res) {
  const result = await taskService.list(req.user.id, req.query);
  res.json(result);
}

async function create(req, res) {
  const item = await taskService.create(req.user.id, req.body);
  res.status(201).json({ item });
}

async function update(req, res) {
  const item = await taskService.update(req.user.id, req.params.taskId, req.body);
  res.json({ item });
}

async function remove(req, res) {
  await taskService.delete(req.user.id, req.params.taskId);
  res.status(204).end();
}

module.exports = { list, create, update, remove };
