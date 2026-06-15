const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC';
    let params = [req.user.id];

    if (req.user.role === 'admin') {
      query = 'SELECT * FROM tasks ORDER BY created_at DESC';
      params = [];
    }

    const [tasks] = await pool.query(query, params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks.', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, status, priority, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || '', status || 'Pending', priority || 'Medium', due_date || null]
    );

    res.status(201).json({
      message: 'Task created successfully.',
      taskId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task.', error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this task.' });
    }

    const query = req.user.role === 'admin'
      ? 'UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=? WHERE id=?'
      : 'UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=? WHERE id=? AND user_id=?';

    const params = req.user.role === 'admin'
      ? [title, description, status, priority, due_date, id]
      : [title, description, status, priority, due_date, id, req.user.id];

    await pool.query(query, params);

    res.json({ message: 'Task updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task.', error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = req.user.role === 'admin'
      ? 'DELETE FROM tasks WHERE id = ?'
      : 'DELETE FROM tasks WHERE id = ? AND user_id = ?';

    const params = req.user.role === 'admin'
      ? [id]
      : [id, req.user.id];

    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found or not authorized.' });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task.', error: error.message });
  }
});

module.exports = router;