import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUserAdd,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineUserCircle,
} from 'react-icons/hi';
import { getUsers, createUser, updateUser, deleteUser } from '../api/userService';

/* ── Role & Status Colors ── */
const roleColor = {
  Admin: '#6366f1',
  Operator: '#0ea5e9',
  Viewer: '#a78bfa',
};

const statusColor = {
  active: '#34d399',
  inactive: '#fb7185',
};

/* ── Format date helper ── */
const formatLastLogin = (lastLogin) => {
  if (!lastLogin) return 'Never';
  try {
    const d = new Date(lastLogin);
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Never';
  }
};

/* ── Single User Row Component ── */
const UserRow = ({ user, onEdit, onDelete }) => {
  const roleName = user.Role || 'Viewer';
  const isActive = Boolean(user.IsActive);
  const statusKey = isActive ? 'active' : 'inactive';

  const rc = roleColor[roleName] || '#6b7e99';
  const sc = statusColor[statusKey] || '#6b7e99';

  const initials = (user.Username || 'U').slice(0, 2).toUpperCase();

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="border-b transition-colors hover:bg-white/[0.02]"
      style={{ borderColor: 'rgba(99,102,241,0.06)' }}
    >
      {/* Avatar + Username & Email */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${rc}, ${rc}99)` }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.Username}</p>
            <p
              className="text-sm font-medium text-dark-100 truncate px-2 py-1 rounded-md max-w-full"
              style={{ background: 'rgba(56,189,248,0.08)' }}
            >
              {user.Email || <span className="italic">No email provided</span>}
            </p>
          </div>
        </div>
      </td>

      {/* Phone Number */}
      <td className="py-3.5 px-4">
        <p className="text-xs text-dark-200 font-mono">
          {user.PhoneNumber || <span className="text-dark-500 italic">No phone</span>}
        </p>
      </td>

      {/* Role Badge */}
      <td className="py-3.5 px-4">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ color: rc, background: `${rc}15`, border: `1px solid ${rc}30` }}
        >
          {roleName}
        </span>
      </td>

      {/* Status Badge */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: sc, boxShadow: `0 0 6px ${sc}80` }}
          />
          <span className="text-xs font-medium capitalize" style={{ color: sc }}>
            {statusKey}
          </span>
        </div>
      </td>

      {/* Last Login */}
      <td className="py-3.5 px-4 hidden xl:table-cell">
        <p className="text-xs text-dark-400 font-mono">{formatLastLogin(user.LastLogin)}</p>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(user)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            title="Edit User"
          >
            <HiOutlinePencil className="text-sm" />
          </button>
          <button
            onClick={() => onDelete(user.UserId, user.Username)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete User"
          >
            <HiOutlineTrash className="text-sm" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

/* ═══════════════════════════════════════════════
   Main Users Page
═══════════════════════════════════════════════ */
const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form State
  const blankForm = {
    username: '',
    password: '',
    email: '',
    phoneNumber: '',
    role: 'Viewer',
    isActive: true,
  };
  const [formData, setFormData] = useState(blankForm);

  // Fetch Users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getUsers();
      const raw = Array.isArray(res) ? res : res?.data || [];
      setUsers(raw);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Add Modal
  const openAddModal = () => {
    setModalMode('add');
    setSelectedUserId(null);
    setFormData(blankForm);
    setModalError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUserId(user.UserId);
    setFormData({
      username: user.Username || '',
      password: '', // Leave empty for edit
      email: user.Email || '',
      phoneNumber: user.PhoneNumber || '',
      role: user.Role || 'Viewer',
      isActive: Boolean(user.IsActive),
    });
    setModalError(null);
    setShowModal(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (modalMode === 'add') {
      if (!formData.username.trim()) {
        setModalError('Username is required');
        return;
      }
      if (!formData.password) {
        setModalError('Password is required for new accounts');
        return;
      }
      if (formData.password.length < 8) {
        setModalError('Password must be at least 8 characters');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        setModalError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (modalMode === 'add') {
        await createUser({
          username: formData.username.trim(),
          password: formData.password,
          email: formData.email.trim() || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          role: formData.role,
          isActive: formData.isActive ? 1 : 0,
        });
        notify(`User "${formData.username.trim()}" created successfully!`);
      } else {
        await updateUser(selectedUserId, {
          username: formData.username.trim() || undefined,
          email: formData.email.trim() || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          role: formData.role,
          isActive: formData.isActive ? 1 : 0,
        });
        notify(`User updated successfully!`);
      }

      setShowModal(false);
      await fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        'Failed to save user.';
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.UserId !== userId));
      notify(`User "${username}" deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete user:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete user.';
      alert(msg);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      (u.Username || '').toLowerCase().includes(q) ||
      (u.Email || '').toLowerCase().includes(q) ||
      (u.PhoneNumber || '').toLowerCase().includes(q) ||
      (u.Role || '').toLowerCase().includes(q);

    const matchRole = roleFilter === 'ALL' || u.Role === roleFilter;
    const isActive = Boolean(u.IsActive);
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchSearch && matchRole && matchStatus;
  });

  const totals = {
    total: users.length,
    active: users.filter((u) => Boolean(u.IsActive)).length,
    inactive: users.filter((u) => !Boolean(u.IsActive)).length,
    admins: users.filter((u) => u.Role === 'Admin').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <HiOutlineUserGroup className="text-xl" />
            </span>
            User Management
          </h1>
          <p className="text-xs text-dark-300 mt-1">
            Manage system users, access credentials, contact information, and role permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition-all shadow-sm"
            title="Edit your personal account profile & security credentials"
          >
            <HiOutlineUserCircle className="text-base text-indigo-400" />
            My Profile
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 border border-dark-600/60 transition-all"
            title="Reload users from API"
          >
            <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-lg cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
            }}
          >
            <HiOutlineUserAdd className="text-base" />
            Add User
          </button>
        </div>
      </div>

      {/* ── Notification Banner ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg"
            style={{
              background:
                notification.type === 'error' ? 'rgba(244,63,94,0.12)' : 'rgba(52,211,153,0.12)',
              border:
                notification.type === 'error'
                  ? '1px solid rgba(244,63,94,0.3)'
                  : '1px solid rgba(52,211,153,0.3)',
            }}
          >
            {notification.type === 'error' ? (
              <HiOutlineExclamationCircle className="text-rose-400 text-xl shrink-0" />
            ) : (
              <HiOutlineCheck className="text-emerald-400 text-xl shrink-0" />
            )}
            <p
              className="text-xs font-semibold"
              style={{ color: notification.type === 'error' ? '#fb7185' : '#34d399' }}
            >
              {notification.msg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <HiOutlineExclamationCircle className="text-lg text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchUsers}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Summary Cards Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { lbl: 'Total Accounts', val: totals.total, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { lbl: 'Active Users', val: totals.active, color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
          { lbl: 'Inactive Users', val: totals.inactive, color: '#fb7185', bg: 'rgba(251,113,133,0.08)' },
          { lbl: 'Administrators', val: totals.admins, color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
        ].map(({ lbl, val, color, bg }) => (
          <div
            key={lbl}
            className="glass-card px-4 py-3.5 flex items-center justify-between rounded-xl border border-dark-600/30"
            style={{ background: bg }}
          >
            <div>
              <p className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider">{lbl}</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color }}>
                {val}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: `${color}20`, color }}
            >
              <HiOutlineShieldCheck />
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar & Filter Bar ── */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400 text-base" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, email, phone..."
            className="form-input pl-10 text-xs py-2 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input text-xs py-1.5 px-3 rounded-lg"
              style={{ minWidth: '110px' }}
            >
              <option value="ALL">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Operator">Operator</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input text-xs py-1.5 px-3 rounded-lg"
              style={{ minWidth: '110px' }}
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearch('');
              setRoleFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="btn-ghost text-xs py-1.5 px-3 ml-auto"
            title="Reset filters"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(99,102,241,0.1)',
                  background: 'rgba(26,35,64,0.5)',
                }}
              >
                {['User', 'Phone', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`py-3 px-4 text-left text-[11px] font-bold text-dark-300 uppercase tracking-wider ${h === 'Last Login' ? 'hidden xl:table-cell' : ''
                      }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <HiOutlineRefresh className="animate-spin text-2xl text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs text-dark-300">Loading user accounts...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-dark-400 text-xs">
                    {search ? `No users matching "${search}"` : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <UserRow
                    key={u.UserId}
                    user={u}
                    onEdit={openEditModal}
                    onDelete={handleDeleteUser}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ Add / Edit User Modal (Centered Strictly in Viewport) ══ */}
      {createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Full-screen Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
              />

              {/* Viewport Centered Dialog */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
                transition={{ duration: 0.15 }}
                className="glass-card p-6 w-full max-w-lg shadow-2xl z-50 overflow-y-auto max-h-[90vh]"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#111827',
                  border: '1px solid rgba(99,102,241,0.25)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                }}
              >
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-dark-600/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      {modalMode === 'add' ? <HiOutlineUserAdd className="text-lg" /> : <HiOutlinePencil className="text-lg" />}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {modalMode === 'add' ? 'Add New User' : `Edit User: ${formData.username}`}
                      </h2>
                      <p className="text-xs text-dark-300">
                        {modalMode === 'add'
                          ? 'Create a new account in elliance_mks.Users'
                          : 'Update account details & permissions'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-dark-300 hover:text-white text-lg px-2"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Error Banner */}
                {modalError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <HiOutlineExclamationCircle className="text-rose-400 text-base shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Username (Only editable on Add) */}
                  <div>
                    <label className="text-xs font-semibold text-dark-200 block mb-1">
                      Username * {modalMode === 'edit' && <span className="text-dark-400">(Read-only)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={modalMode === 'edit'}
                      placeholder="e.g. jsmith"
                      required={modalMode === 'add'}
                      className="form-input text-xs py-2 w-full disabled:opacity-50 disabled:bg-dark-800"
                    />
                  </div>

                  {/* Password (Required for Add only) */}
                  {modalMode === 'add' && (
                    <div>
                      <label className="text-xs font-semibold text-dark-200 block mb-1">
                        Password * <span className="text-dark-400 text-[10px]">(Min 8 chars, uppercase, lowercase, number)</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Create strong password"
                        required
                        className="form-input text-xs py-2 w-full font-mono"
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-dark-200 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      className="form-input text-xs py-2 w-full"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-semibold text-dark-200 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+601110085984"
                      className="form-input text-xs py-2 w-full font-mono"
                    />
                  </div>

                  {/* Role & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-dark-200 block mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="form-input text-xs py-2 w-full font-semibold"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Operator">Operator</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-dark-200 block mb-1">Account Status</label>
                      <select
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                        className="form-input text-xs py-2 w-full font-semibold"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-dark-600/40">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={submitting}
                      className="btn-ghost text-xs py-2 px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <HiOutlineRefresh className="animate-spin text-sm" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineCheck className="text-base" />
                          <span>{modalMode === 'add' ? 'Create User' : 'Save Changes'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default Users;
