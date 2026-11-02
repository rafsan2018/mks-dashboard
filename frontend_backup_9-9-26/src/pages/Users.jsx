import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUserAdd, HiOutlineTrash, HiOutlinePencil, HiOutlineCheck,
  HiOutlineX, HiOutlinePhone, HiOutlineMail, HiOutlineSearch,
} from 'react-icons/hi';
import { TbBell, TbBellOff, TbMessage, TbShieldCheck } from 'react-icons/tb';
import { INITIAL_USERS, SMS_GATEWAY_DEFAULTS } from '../data/mockData';

/* ── helpers ── */
const roleColor = { Administrator: '#6366f1', Operator: '#0ea5e9', Viewer: '#6b7e99' };
const statusColor = { active: '#34d399', inactive: '#fb7185' };

const Toggle = ({ checked, onChange, size = 'md' }) => {
  const w = size === 'sm' ? 'w-8 h-4' : 'w-11 h-6';
  const dot = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
  const offset = size === 'sm' ? 'calc(100% - 14px)' : 'calc(100% - 22px)';
  return (
    <div className={`relative ${w} rounded-full cursor-pointer transition-all duration-200 shrink-0`}
      style={{ background: checked ? '#6366f1' : 'rgba(26,35,64,0.8)', border: checked ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(99,102,241,0.15)' }}
      onClick={onChange}
    >
      <div className={`absolute top-0.5 ${dot} rounded-full transition-all duration-200`}
        style={{ left: checked ? offset : '2px', background: checked ? '#fff' : '#6b7e99', boxShadow: checked ? '0 1px 4px rgba(99,102,241,0.4)' : 'none' }}
      />
    </div>
  );
};

const Label = ({ children }) => <label className="section-label block mb-1.5">{children}</label>;

const Input = ({ value, onChange, placeholder, type = 'text', icon: Icon }) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm" />}
    <input value={value} onChange={onChange} type={type} placeholder={placeholder}
      className="form-input" style={Icon ? { paddingLeft: '2.25rem' } : {}} />
  </div>
);

const Select = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} className="form-input">{children}</select>
);

/* ── SMS pref toggle row ── */
const PrefRow = ({ label, checked, onChange, description }) => (
  <div className="flex items-start justify-between py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
    <div>
      <p className="text-sm text-dark-100 font-medium">{label}</p>
      {description && <p className="text-[11px] text-dark-400 mt-0.5">{description}</p>}
    </div>
    <Toggle checked={checked} onChange={onChange} size="sm" />
  </div>
);

/* ── User row ── */
const UserRow = ({ user, onEdit, onDelete, onToggleSms }) => {
  const rc = roleColor[user.role] || '#6b7e99';
  const sc = statusColor[user.status] || '#6b7e99';
  return (
    <motion.tr initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="border-b"
      style={{ borderColor: 'rgba(99,102,241,0.06)' }}
    >
      {/* Avatar + Name */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${rc}, ${rc}99)` }}>
            {user.avatar.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-[11px] text-dark-400">{user.email}</p>
          </div>
        </div>
      </td>
      {/* Phone */}
      <td className="py-3.5 px-4">
        <p className="text-sm text-dark-200 font-mono">
          {user.phone || <span className="text-dark-500 text-xs italic">No phone</span>}
        </p>
      </td>
      {/* Role */}
      <td className="py-3.5 px-4">
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ color: rc, background: `${rc}15`, border: `1px solid ${rc}25` }}>
          {user.role}
        </span>
      </td>
      {/* Status */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full`} style={{ background: sc, boxShadow: `0 0 6px ${sc}80` }} />
          <span className="text-xs font-medium capitalize" style={{ color: sc }}>{user.status}</span>
        </div>
      </td>
      {/* SMS toggle */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <Toggle checked={user.sms.enabled} onChange={() => onToggleSms(user.id)} />
          <span className="text-xs" style={{ color: user.sms.enabled ? '#34d399' : '#6b7e99' }}>
            {user.sms.enabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </td>
      {/* Last login */}
      <td className="py-3.5 px-4 hidden xl:table-cell">
        <p className="text-xs text-dark-400">{user.lastLogin}</p>
      </td>
      {/* Actions */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(user)} className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-300 hover:text-indigo-400 transition-colors"
            style={{ background: 'rgba(99,102,241,0.08)' }}>
            <HiOutlinePencil className="text-sm" />
          </button>
          <button onClick={() => onDelete(user.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-300 hover:text-rose-400 transition-colors"
            style={{ background: 'rgba(244,63,94,0.08)' }}>
            <HiOutlineTrash className="text-sm" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

/* ═══════════════════════════════════════════════ */
const Users = () => {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'sms'
  const [smsGw, setSmsGw] = useState(SMS_GATEWAY_DEFAULTS);
  const [savedBanner, setSavedBanner] = useState(false);

  // form state for add/edit
  const blankUser = { name: '', email: '', phone: '', role: 'Viewer', status: 'active',
    sms: { enabled: false, prefs: { critical: false, warning: false, gensetAlarms: false, dpmThreshold: false, deviceOffline: false } } };
  const [form, setForm] = useState(blankUser);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(blankUser); setEditUser(null); setShowModal(true); };
  const openEdit = (u) => { setForm(u); setEditUser(u.id); setShowModal(true); };
  const onDelete = (id) => setUsers(us => us.filter(u => u.id !== id));
  const onToggleSms = (id) => setUsers(us => us.map(u => u.id === id ? { ...u, sms: { ...u.sms, enabled: !u.sms.enabled } } : u));

  const onSave = () => {
    if (!form.name || !form.email) return;
    // TODO: POST /api/users or PATCH /api/users/:id
    if (editUser) {
      setUsers(us => us.map(u => u.id === editUser ? { ...form, id: editUser, lastLogin: u.lastLogin, avatar: u.avatar } : u));
    } else {
      const newUser = {
        ...form, id: Date.now(),
        lastLogin: 'Never',
        avatar: form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      };
      setUsers(us => [...us, newUser]);
    }
    setShowModal(false);
  };

  const saveSmsGw = () => {
    // TODO: POST /api/notifications/sms-gateway
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const totals = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    smsEnabled: users.filter(u => u.sms.enabled).length,
  };

  const smsPrefs = {
    critical:       { label: 'Critical Alerts',         desc: 'Engine shutdown, emergency stop, earth fault' },
    warning:        { label: 'Warning Alerts',           desc: 'Low fuel, battery warning, maintenance due' },
    gensetAlarms:   { label: 'Genset Alarms',           desc: 'All DSE7320 alarm register changes' },
    dpmThreshold:   { label: 'DPM Threshold Alerts',   desc: 'ME631 voltage/current/THD threshold breaches' },
    deviceOffline:  { label: 'Device Offline Alerts',  desc: 'Modbus communication loss detection' },
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: HiOutlineSearch },
    { id: 'sms',   label: 'SMS Configuration', icon: TbMessage },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { lbl: 'Total Users',   val: totals.total,      color: '#6366f1' },
          { lbl: 'Active Users',  val: totals.active,     color: '#34d399' },
          { lbl: 'SMS Enabled',   val: totals.smsEnabled, color: '#0ea5e9' },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} className="glass-card px-5 py-4 flex items-center gap-4">
            <p className="metric-value text-3xl" style={{ color }}>{val}</p>
            <p className="section-label">{lbl}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={activeTab === t.id
              ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(14,165,233,0.1))', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
              : { background: 'rgba(26,35,64,0.5)', color: '#6b7e99', border: '1px solid rgba(99,102,241,0.08)' }}>
            <t.icon className="text-lg" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Saved banner ── */}
      <AnimatePresence>
        {savedBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-5 py-3 rounded-xl"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <HiOutlineCheck className="text-emerald-400 text-xl shrink-0" />
            <p className="text-sm font-semibold text-emerald-400">Settings saved successfully</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          TAB 1 — User Management
      ══════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search users…"
                className="form-input pl-9" />
            </div>
            <button onClick={openAdd} className="btn-primary">
              <HiOutlineUserAdd className="text-lg" /> Add User
            </button>
          </div>

          {/* User table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(26,35,64,0.5)' }}>
                    {['User', 'Phone', 'Role', 'Status', 'SMS Notify', 'Last Login', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-4 text-left section-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={onDelete} onToggleSms={onToggleSms} />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-dark-400">No users found matching "{search}"</div>
              )}
            </div>
          </div>

          {/* Notification preferences per user (expandable SMS detail) */}
          <div className="glass-card p-5">
            <p className="section-label mb-4">SMS Notification Preferences — Per User</p>
            <div className="space-y-3">
              {users.filter(u => u.sms.enabled).map(u => (
                <div key={u.id} className="p-4 rounded-xl" style={{ background: 'rgba(26,35,64,0.5)', border: '1px solid rgba(99,102,241,0.08)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: `linear-gradient(135deg, ${roleColor[u.role]}, ${roleColor[u.role]}80)` }}>
                      {u.avatar.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{u.name}</p>
                      <p className="text-[11px] text-dark-400">{u.phone || 'No phone set'}</p>
                    </div>
                    <TbMessage className="ml-auto text-indigo-400 text-lg" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(u.sms.prefs).map(([k, v]) => v ? (
                      <span key={k} className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {smsPrefs[k]?.label || k}
                      </span>
                    ) : null)}
                  </div>
                </div>
              ))}
              {users.filter(u => u.sms.enabled).length === 0 && (
                <p className="text-sm text-dark-400 text-center py-4">No users have SMS enabled</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 2 — SMS Gateway Configuration
      ══════════════════════════════════════════ */}
      {activeTab === 'sms' && (
        <div className="space-y-5">
          {/* Gateway settings */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <TbMessage className="text-xl text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">SMS Gateway Configuration</h3>
                <p className="text-xs text-dark-300 mt-0.5">Connect to your SMS provider API to send alert notifications</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Toggle checked={smsGw.enabled} onChange={() => setSmsGw(g => ({ ...g, enabled: !g.enabled }))} />
                <span className="text-sm font-medium" style={{ color: smsGw.enabled ? '#34d399' : '#6b7e99' }}>{smsGw.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            {smsGw.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>API URL</Label>
                    <Input value={smsGw.apiUrl} onChange={e => setSmsGw(g => ({ ...g, apiUrl: e.target.value }))} placeholder="https://api.smsprovider.com/send" />
                  </div>
                  <div>
                    <Label>Sender ID / From</Label>
                    <Input value={smsGw.senderId} onChange={e => setSmsGw(g => ({ ...g, senderId: e.target.value }))} placeholder="MODBUS" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>API Key</Label>
                    <Input value={smsGw.apiKey} onChange={e => setSmsGw(g => ({ ...g, apiKey: e.target.value }))} type="password" placeholder="••••••••••••••••" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Global notification preferences */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <TbBell className="text-xl text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Global Notification Preferences</h3>
                <p className="text-xs text-dark-300 mt-0.5">These defaults apply to all users unless overridden individually</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              <div>
                {Object.entries(smsPrefs).slice(0, 3).map(([k, { label, desc }]) => (
                  <PrefRow key={k} label={label} description={desc}
                    checked={smsGw[k] !== undefined ? smsGw[k] : true}
                    onChange={() => setSmsGw(g => ({ ...g, [k]: !g[k] }))} />
                ))}
              </div>
              <div>
                {Object.entries(smsPrefs).slice(3).map(([k, { label, desc }]) => (
                  <PrefRow key={k} label={label} description={desc}
                    checked={smsGw[k] !== undefined ? smsGw[k] : true}
                    onChange={() => setSmsGw(g => ({ ...g, [k]: !g[k] }))} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Per-user SMS settings (phone + prefs) */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <TbShieldCheck className="text-xl text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Per-User SMS Settings</h3>
                <p className="text-xs text-dark-300 mt-0.5">Enable SMS and configure notification preferences for each user</p>
              </div>
            </div>

            <div className="space-y-4">
              {users.map(u => {
                const rc = roleColor[u.role] || '#6b7e99';
                return (
                  <div key={u.id} className="p-4 rounded-xl" style={{ background: 'rgba(26,35,64,0.5)', border: '1px solid rgba(99,102,241,0.08)' }}>
                    {/* User header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${rc}, ${rc}99)` }}>{u.avatar.slice(0, 2)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-dark-400">{u.email}</p>
                      </div>
                      {/* SMS master toggle */}
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-dark-400">SMS</span>
                        <Toggle checked={u.sms.enabled} onChange={() => onToggleSms(u.id)} />
                        <span className="text-xs font-semibold w-6" style={{ color: u.sms.enabled ? '#34d399' : '#6b7e99' }}>{u.sms.enabled ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>

                    {/* Phone number row */}
                    <div className="mb-3">
                      <div className="relative">
                        <HiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm" />
                        <input value={u.phone}
                          onChange={e => setUsers(us => us.map(x => x.id === u.id ? { ...x, phone: e.target.value } : x))}
                          placeholder="+880 17XX XXXXXX"
                          className="form-input pl-9 text-sm"
                          style={{ borderColor: !u.phone && u.sms.enabled ? 'rgba(251,113,133,0.4)' : undefined }} />
                      </div>
                      {!u.phone && u.sms.enabled && <p className="text-[10px] text-rose-400 mt-1">⚠ Phone number required for SMS</p>}
                    </div>

                    {/* Preference toggles (only show if SMS enabled) */}
                    {u.sms.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        {Object.entries(u.sms.prefs).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                            <div>
                              <p className="text-xs text-dark-200 font-medium">{smsPrefs[k]?.label || k}</p>
                              <p className="text-[10px] text-dark-500 mt-0.5">{smsPrefs[k]?.desc}</p>
                            </div>
                            <Toggle size="sm" checked={v}
                              onChange={() => setUsers(us => us.map(x => x.id === u.id
                                ? { ...x, sms: { ...x.sms, prefs: { ...x.sms.prefs, [k]: !v } } }
                                : x))} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Save btn */}
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setSmsGw(SMS_GATEWAY_DEFAULTS)}>Reset</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={saveSmsGw} className="btn-primary">
              <HiOutlineCheck className="text-lg" /> Save SMS Settings
            </motion.button>
          </div>
        </div>
      )}

      {/* ══ Add/Edit Modal ══ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              style={{ border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-white">{editUser ? 'Edit User' : 'Add New User'}</h2>
                <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                  <HiOutlineX className="text-xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div><label className="section-label block mb-1.5">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" placeholder="John Smith" /></div>
                <div><label className="section-label block mb-1.5">Email *</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="form-input" type="email" placeholder="john@company.com" /></div>
                <div><label className="section-label block mb-1.5">Phone Number</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="form-input" placeholder="+880 17XX XXXXXX" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="section-label block mb-1.5">Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="form-input">
                      <option>Administrator</option><option>Operator</option><option>Viewer</option>
                    </select></div>
                  <div><label className="section-label block mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="form-input">
                      <option value="active">Active</option><option value="inactive">Inactive</option>
                    </select></div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Toggle checked={form.sms.enabled} onChange={() => setForm(f => ({ ...f, sms: { ...f.sms, enabled: !f.sms.enabled } }))} />
                  <span className="text-sm text-dark-200">Enable SMS Notifications</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                <button className="btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={onSave}>
                  <HiOutlineCheck className="text-lg" />{editUser ? 'Save Changes' : 'Add User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
