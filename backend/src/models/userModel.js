'use strict';

const db = require('../config/database');

class UserModel {
  /**
   * Helper to format database row values to clean numbers
   */
  _format(row) {
    if (!row) return null;
    const formatted = { ...row };
    if (formatted.IsActive !== undefined && formatted.IsActive !== null) {
      formatted.IsActive = Buffer.isBuffer(formatted.IsActive)
        ? formatted.IsActive[0]
        : (formatted.IsActive ? 1 : 0);
    }
    return formatted;
  }

  /**
   * Find user by ID (excludes password)
   */
  async findById(userId) {
    const [rows] = await db.query(
      `SELECT UserId, Username, Email, PhoneNumber, Role, IsActive, LastLogin, CreatedAt
       FROM Users WHERE UserId = ?`,
      [userId]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Find user by ID including password (for authentication/password changes)
   */
  async findByIdWithPassword(userId) {
    const [rows] = await db.query(
      `SELECT UserId, Username, Password, Email, PhoneNumber, Role, IsActive, LastLogin, CreatedAt
       FROM Users WHERE UserId = ?`,
      [userId]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Find user by username (includes password for login verification)
   */
  async findByUsername(username) {
    const [rows] = await db.query(
      `SELECT UserId, Username, Password, Email, PhoneNumber, Role, IsActive, LastLogin, CreatedAt
       FROM Users WHERE Username = ?`,
      [username]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT UserId, Username, Email, PhoneNumber, Role, IsActive, LastLogin, CreatedAt
       FROM Users WHERE Email = ?`,
      [email]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Find user by email including password (for login with email)
   */
  async findByEmailWithPassword(email) {
    const [rows] = await db.query(
      `SELECT UserId, Username, Password, Email, PhoneNumber, Role, IsActive, LastLogin, CreatedAt
       FROM Users WHERE Email = ?`,
      [email]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll({ page, limit, role, isActive, search } = {}) {
    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('Role = ?');
      params.push(role);
    }
    if (isActive !== undefined) {
      conditions.push('IsActive = ?');
      params.push(isActive ? 1 : 0);
    }
    if (search) {
      conditions.push('(Username LIKE ? OR Email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT UserId, Username, Email, PhoneNumber, Role, IsActive, LastLogin, CreatedAt
      FROM Users
      ${whereClause}
      ORDER BY CreatedAt DESC
    `;
    const countQuery = `SELECT COUNT(*) as total FROM Users ${whereClause}`;

    const result = await db.paginatedQuery(baseQuery, countQuery, params, page, limit);
    result.data = result.data.map(row => this._format(row));
    return result;
  }

  /**
   * Create a new user
   */
  async create({ username, password, email = null, phoneNumber = null, role = 'Viewer', isActive = 1 }) {
    const [result] = await db.query(
      `INSERT INTO Users (Username, Password, Email, PhoneNumber, Role, IsActive, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [username, password, email, phoneNumber, role, isActive]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update user details
   */
  async update(userId, updates) {
    const fields = [];
    const values = [];

    if (updates.username !== undefined) { fields.push('Username = ?'); values.push(updates.username); }
    if (updates.email !== undefined) { fields.push('Email = ?'); values.push(updates.email); }
    if (updates.phoneNumber !== undefined) { fields.push('PhoneNumber = ?'); values.push(updates.phoneNumber); }
    if (updates.role !== undefined) { fields.push('Role = ?'); values.push(updates.role); }
    if (updates.isActive !== undefined) { fields.push('IsActive = ?'); values.push(updates.isActive ? 1 : 0); }
    if (updates.password !== undefined) { fields.push('Password = ?'); values.push(updates.password); }

    if (fields.length === 0) return this.findById(userId);

    values.push(userId);
    await db.query(`UPDATE Users SET ${fields.join(', ')} WHERE UserId = ?`, values);
    return this.findById(userId);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    await db.query('UPDATE Users SET LastLogin = NOW() WHERE UserId = ?', [userId]);
  }

  /**
   * Delete user by ID
   */
  async delete(userId) {
    const [result] = await db.query('DELETE FROM Users WHERE UserId = ?', [userId]);
    return result.affectedRows > 0;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username, excludeId = null) {
    const query = excludeId
      ? 'SELECT 1 FROM Users WHERE Username = ? AND UserId != ?'
      : 'SELECT 1 FROM Users WHERE Username = ?';
    const params = excludeId ? [username, excludeId] : [username];
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email, excludeId = null) {
    const query = excludeId
      ? 'SELECT 1 FROM Users WHERE Email = ? AND UserId != ?'
      : 'SELECT 1 FROM Users WHERE Email = ?';
    const params = excludeId ? [email, excludeId] : [email];
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }
}

module.exports = new UserModel();
