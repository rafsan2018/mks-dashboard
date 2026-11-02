import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineExclamationCircle,
  HiOutlineIdentification,
  HiOutlineClock,
  HiOutlineBadgeCheck,
} from 'react-icons/hi';
import { getCurrentUser, getProfile, updateProfile, changePassword } from '../api/authService';

/* ── Role Theme Colors ── */
const roleColors = {
  Admin: { text: '#818cf8', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.35)' },
  Operator: { text: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.35)' },
  Viewer: { text: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)' },
};

/* ── Format date helper ── */
const formatDate = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
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

const Profile = () => {
  // Current user state
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser() || {});
  const [initialLoading, setInitialLoading] = useState(true);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    phoneNumber: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Load fresh profile data from API on mount
  useEffect(() => {
    let isMounted = true;
    const fetchFreshProfile = async () => {
      const stored = getCurrentUser();
      if (!stored?.UserId) {
        setInitialLoading(false);
        return;
      }
      try {
        const res = await getProfile(stored.UserId);
        const data = res?.data || res;
        if (isMounted && data) {
          setCurrentUser(data);
          setProfileForm({
            username: data.Username || '',
            email: data.Email || '',
            phoneNumber: data.PhoneNumber || '',
          });
          // Synchronize localStorage
          localStorage.setItem('authUser', JSON.stringify({ ...stored, ...data }));
          window.dispatchEvent(new Event('auth-user-updated'));
        }
      } catch (err) {
        // Fallback to local user
        if (isMounted && stored) {
          setProfileForm({
            username: stored.Username || '',
            email: stored.Email || '',
            phoneNumber: stored.PhoneNumber || '',
          });
        }
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    fetchFreshProfile();
    return () => { isMounted = false; };
  }, []);

  // Compute initials & role styling
  const displayName = profileForm.username || currentUser.Username || 'User';
  const displayRole = currentUser.Role || 'Operator';
  const roleStyle = roleColors[displayRole] || roleColors.Viewer;
  const avatarInitials = displayName.slice(0, 2).toUpperCase();

  // Password strength validation checks
  const passwordChecks = {
    length: passwordForm.newPassword.length >= 8,
    hasLower: /[a-z]/.test(passwordForm.newPassword),
    hasUpper: /[A-Z]/.test(passwordForm.newPassword),
    hasNumber: /\d/.test(passwordForm.newPassword),
    matches: Boolean(
      passwordForm.newPassword &&
      passwordForm.confirmPassword &&
      passwordForm.newPassword === passwordForm.confirmPassword
    ),
  };

  // ── Handle Profile Update ──
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    // Validation
    const trimmedUsername = profileForm.username.trim();
    if (!trimmedUsername) {
      setProfileError('Name / Username is required');
      return;
    }
    if (trimmedUsername.length < 2 || trimmedUsername.length > 100) {
      setProfileError('Name must be between 2 and 100 characters');
      return;
    }

    const trimmedEmail = profileForm.email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setProfileError('Please enter a valid email address');
        return;
      }
    }

    const userId = currentUser.UserId;
    if (!userId) {
      setProfileError('User session ID not found. Please log in again.');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await updateProfile(userId, {
        username: trimmedUsername,
        email: trimmedEmail || null,
        phoneNumber: profileForm.phoneNumber.trim() || null,
      });

      const updatedData = res?.data || {
        ...currentUser,
        Username: trimmedUsername,
        Email: trimmedEmail || null,
        PhoneNumber: profileForm.phoneNumber.trim() || null,
      };

      setCurrentUser(updatedData);
      setProfileSuccess('Profile updated successfully! Changes have been saved.');
      setTimeout(() => setProfileSuccess(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update profile';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Handle Password Change ──
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (!passwordChecks.hasLower || !passwordChecks.hasUpper || !passwordChecks.hasNumber) {
      setPasswordError('Password must contain uppercase letters, lowercase letters, and at least one number');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password cannot be the same as current password');
      return;
    }

    const userId = currentUser.UserId;
    if (!userId) {
      setPasswordError('User session ID not found. Please log in again.');
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({
        userId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setPasswordSuccess('Password changed successfully! Your account credentials have been updated.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password';
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-dark-300">Loading user profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-10">

      {/* ── User Overview Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: roleStyle.text }}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* User Avatar with Gradient & Initials */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shrink-0 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${roleStyle.text}, #4338ca)`,
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: `0 8px 24px -4px ${roleStyle.text}40`,
              }}
            >
              {avatarInitials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight capitalize">
                  {displayName}
                </h2>
                {/* Role Badge */}
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"
                  style={{
                    color: roleStyle.text,
                    background: roleStyle.bg,
                    border: `1px solid ${roleStyle.border}`,
                  }}
                >
                  <HiOutlineBadgeCheck className="text-sm" />
                  {displayRole}
                </span>
                {/* Active Status */}
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5"
                  style={{
                    background: 'rgba(52, 211, 153, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Account
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-dark-300">
                <span className="flex items-center gap-1.5 text-dark-200">
                  <HiOutlineMail className="text-sm text-indigo-400" />
                  {currentUser.Email || 'No email registered'}
                </span>
                {currentUser.PhoneNumber && (
                  <span className="flex items-center gap-1.5 text-dark-200">
                    <HiOutlinePhone className="text-sm text-emerald-400" />
                    {currentUser.PhoneNumber}
                  </span>
                )}
                <span className="text-dark-400 font-mono text-[11px]">
                  User ID: #{currentUser.UserId || '1'}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex flex-row md:flex-col items-start md:items-end gap-3 text-xs text-dark-400 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800/80 w-full md:w-auto justify-between">
            <div className="flex items-center gap-1.5">
              <HiOutlineClock className="text-slate-400 text-sm" />
              <span>Last Login:</span>
              <span className="text-slate-200 font-mono text-[11px]">
                {formatDate(currentUser.LastLogin)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <HiOutlineIdentification className="text-slate-400 text-sm" />
              <span>Member Since:</span>
              <span className="text-slate-200 font-mono text-[11px]">
                {formatDate(currentUser.CreatedAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Two Columns: Profile Details & Password ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ═══════════════════════════════════════════════════
            CARD 1: ACCOUNT INFORMATION
        ═══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
                >
                  <HiOutlineUser className="text-xl text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Account Information</h3>
                  <p className="text-xs text-dark-300">Update your name, email, and contact details</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
              {profileSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl text-xs bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-2 overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <HiOutlineCheck className="text-base text-emerald-400 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileSuccess(null)}
                    className="text-emerald-400 hover:text-white px-1 font-bold text-sm"
                  >
                    ×
                  </button>
                </motion.div>
              )}

              {profileError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl text-xs bg-rose-950/70 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-2 overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <HiOutlineExclamationCircle className="text-base text-rose-400 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileError(null)}
                    className="text-rose-400 hover:text-white px-1 font-bold text-sm"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form id="profileForm" onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Name / Username Field */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  Display Name / Username <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <HiOutlineUser className="text-base" />
                  </div>
                  <input
                    type="text"
                    required
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-dark-400 mt-1">
                  This name is displayed across the monitoring dashboard and system logs.
                </p>
              </div>

              {/* Email Address Field */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <HiOutlineMail className="text-base" />
                  </div>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-dark-400 mt-1">
                  Used for account login and system alert notifications. Must be unique.
                </p>
              </div>

              {/* Phone Number Field */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <HiOutlinePhone className="text-base" />
                  </div>
                  <input
                    type="text"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    placeholder="+60 12-345 6789"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-dark-400 mt-1">
                  Used for SMS threshold alerts and critical emergency notifications.
                </p>
              </div>

              {/* Role Display (Read-Only) */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  Assigned System Role
                </label>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiOutlineShieldCheck className="text-lg text-indigo-400" />
                    <div>
                      <span className="text-xs font-semibold text-white">{displayRole}</span>
                      <p className="text-[10px] text-dark-400">
                        {displayRole === 'Admin'
                          ? 'Full administrative control and user management'
                          : displayRole === 'Operator'
                          ? 'Operational control, monitoring, and threshold configuration'
                          : 'Read-only monitoring access to meters and genset data'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
                    Read-only
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Form Actions */}
          <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setProfileForm({
                  username: currentUser.Username || '',
                  email: currentUser.Email || '',
                  phoneNumber: currentUser.PhoneNumber || '',
                });
                setProfileError(null);
                setProfileSuccess(null);
              }}
              disabled={savingProfile}
              className="px-4 py-2 text-xs font-semibold text-dark-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Reset
            </button>

            <button
              type="submit"
              form="profileForm"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                border: '1px solid rgba(129, 140, 248, 0.3)',
              }}
            >
              {savingProfile ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <HiOutlineCheck className="text-sm shrink-0" />
                  <span>Save Account Changes</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            CARD 2: CHANGE PASSWORD
        ═══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
                >
                  <HiOutlineKey className="text-xl text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Change Password</h3>
                  <p className="text-xs text-dark-300">Keep your account secure with a strong password</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl text-xs bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-2 overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <HiOutlineCheck className="text-base text-emerald-400 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordSuccess(null)}
                    className="text-emerald-400 hover:text-white px-1 font-bold text-sm"
                  >
                    ×
                  </button>
                </motion.div>
              )}

              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-xl text-xs bg-rose-950/70 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-2 overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <HiOutlineExclamationCircle className="text-base text-rose-400 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordError(null)}
                    className="text-rose-400 hover:text-white px-1 font-bold text-sm"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form id="passwordForm" onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  Current Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <HiOutlineLockClosed className="text-base" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dark-400 hover:text-white transition-colors"
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <HiOutlineEyeOff className="text-base" /> : <HiOutlineEye className="text-base" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  New Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <HiOutlineKey className="text-base" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new strong password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dark-400 hover:text-white transition-colors"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <HiOutlineEyeOff className="text-base" /> : <HiOutlineEye className="text-base" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-xs font-semibold text-dark-200 mb-1.5">
                  Confirm New Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <HiOutlineShieldCheck className="text-base" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-dark-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dark-400 hover:text-white transition-colors"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <HiOutlineEyeOff className="text-base" /> : <HiOutlineEye className="text-base" />}
                  </button>
                </div>
              </div>

              {/* Password Requirement Checklist */}
              {passwordForm.newPassword && (
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1.5 mt-2 animate-fade-in">
                  <p className="text-[11px] font-semibold text-dark-300 mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordChecks.length ? 'text-emerald-400 font-medium' : 'text-dark-400'}`}>
                      {passwordChecks.length ? <HiOutlineCheck className="text-xs" /> : <HiOutlineX className="text-xs" />}
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasUpper ? 'text-emerald-400 font-medium' : 'text-dark-400'}`}>
                      {passwordChecks.hasUpper ? <HiOutlineCheck className="text-xs" /> : <HiOutlineX className="text-xs" />}
                      <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasLower ? 'text-emerald-400 font-medium' : 'text-dark-400'}`}>
                      {passwordChecks.hasLower ? <HiOutlineCheck className="text-xs" /> : <HiOutlineX className="text-xs" />}
                      <span>Lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.hasNumber ? 'text-emerald-400 font-medium' : 'text-dark-400'}`}>
                      {passwordChecks.hasNumber ? <HiOutlineCheck className="text-xs" /> : <HiOutlineX className="text-xs" />}
                      <span>At least 1 number</span>
                    </div>
                  </div>
                  {passwordForm.confirmPassword && (
                    <div className={`pt-1 border-t border-slate-800 flex items-center gap-1.5 text-[11px] ${passwordChecks.matches ? 'text-emerald-400 font-medium' : 'text-rose-400'}`}>
                      {passwordChecks.matches ? <HiOutlineCheck className="text-xs" /> : <HiOutlineX className="text-xs" />}
                      <span>{passwordChecks.matches ? 'Passwords match' : 'Passwords do not match'}</span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Form Actions */}
          <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="submit"
              form="passwordForm"
              disabled={savingPassword}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              {savingPassword ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <HiOutlineLockClosed className="text-sm shrink-0" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;

