import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSpeakerphone,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineCheck,
  HiOutlineExclamationCircle,
  HiOutlineExclamation,
  HiOutlineInformationCircle,
  HiOutlineDuplicate,
  HiOutlineSave,
  HiOutlineUsers,
} from 'react-icons/hi';
import { getThresholds } from '../api/thresholdService';
import { getUsers } from '../api/userService';
import { getAlertRecipients, saveAlertRecipients } from '../api/alertRecipientService';
import { isSmsRegister, MAX_SMS_RECIPIENTS, SMS_REGISTER_NAMES } from '../constants/alertRules';

/* ── Colours (same palette as Settings / Users) ── */
const EMAIL_COLOR = '#38bdf8';
const SMS_COLOR = '#34d399';

const SEVERITY = {
  Critical: { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.3)' },
  Warning: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  Info: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' },
};

const roleColor = { Admin: '#6366f1', Operator: '#0ea5e9', Viewer: '#a78bfa' };

/* ── Helpers ── */
const hasText = (v) => typeof v === 'string' && v.trim() !== '';
const canEmail = (u) => hasText(u.Email);
const canSms = (u) => hasText(u.PhoneNumber);
const isActiveFlag = (v) => v === true || Number(v) === 1;
const sortIds = (ids) => [...new Set(ids)].sort((a, b) => a - b);
const sameIds = (a = [], b = []) => a.length === b.length && a.every((v, i) => v === b[i]);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const people = (n) => `${n} ${n === 1 ? 'person' : 'people'}`;

const toNumber = (v) => (v === null || v === undefined || v === '' ? null : parseFloat(v));

const normalizeThreshold = (t) => ({
  id: t.ThresholdId,
  registerName: t.RegisterName || `Register #${t.RegisterId}`,
  deviceName: t.DeviceName || '',
  unit: t.Unit && t.Unit !== '-' ? t.Unit : '',
  min: toNumber(t.MinValue),
  max: toNumber(t.MaxValue),
  severity: t.Severity || 'Warning',
  alertsOn: isActiveFlag(t.SMSEnabled),
  isActive: isActiveFlag(t.IsActive),
  // SMS is only sent for oil pressure, coolant temperature and fuel level; the rest is Email only
  smsEligible: isSmsRegister(t.RegisterName),
});

const conditionText = (t) => {
  const u = t.unit ? ` ${t.unit}` : '';
  if (t.min !== null && t.max !== null) return `Outside ${t.min} – ${t.max}${u}`;
  if (t.max !== null) return `Above ${t.max}${u}`;
  if (t.min !== null) return `Below ${t.min}${u}`;
  return 'No limits set';
};

const toRecipientMap = (rows = []) => {
  const map = {};
  rows.forEach((r) => {
    map[r.ThresholdId] = { email: sortIds(r.EmailUserIds || []), sms: sortIds(r.SmsUserIds || []) };
  });
  return map;
};

/* ── Switch ── */
const Switch = ({ checked, onChange, disabled, color, label, title }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={title}
    disabled={disabled}
    onClick={onChange}
    className="relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    style={{
      background: checked ? color : 'rgba(26,35,64,0.8)',
      border: checked ? `1px solid ${color}80` : '1px solid rgba(99,102,241,0.2)',
    }}
  >
    <span
      className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
      style={{
        left: checked ? 'calc(100% - 18px)' : '2px',
        background: checked ? '#ffffff' : '#6b7e99',
        boxShadow: checked ? `0 1px 4px ${color}60` : 'none',
      }}
    />
  </button>
);

/* ── Threshold list item ── */
const ThresholdItem = ({ threshold, recipients, selected, dirty, onSelect }) => {
  const sev = SEVERITY[threshold.severity] || SEVERITY.Warning;
  const emailCount = recipients?.email.length || 0;
  const smsCount = recipients?.sms.length || 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer hover:bg-white/[0.03]"
      style={{
        background: selected ? 'rgba(6,182,212,0.08)' : 'rgba(15,23,42,0.4)',
        borderColor: selected ? 'rgba(6,182,212,0.45)' : 'rgba(99,102,241,0.1)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{threshold.registerName}</p>
          <p className="text-[11px] text-dark-300 truncate mt-0.5">
            {threshold.deviceName ? `${threshold.deviceName} · ` : ''}{conditionText(threshold)}
          </p>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
          style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}
        >
          {threshold.severity}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2.5 text-[11px] font-semibold">
        <span className="flex items-center gap-1" style={{ color: emailCount ? EMAIL_COLOR : '#6b7e99' }} title="Email recipients">
          <HiOutlineMail className="text-sm" /> {emailCount}
        </span>
        {threshold.smsEligible ? (
          <span className="flex items-center gap-1" style={{ color: smsCount ? SMS_COLOR : '#fbbf24' }} title="SMS recipients">
            <HiOutlinePhone className="text-sm" /> {smsCount}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-dark-400" title="SMS is only sent for oil pressure, coolant temperature and fuel level">
            <HiOutlinePhone className="text-sm" /> –
          </span>
        )}
        {!threshold.isActive && <span className="tag bg-rose-500/10 text-rose-400">Inactive</span>}
        {threshold.isActive && threshold.smsEligible && !threshold.alertsOn && <span className="tag bg-slate-500/15 text-dark-200">SMS off</span>}
        {dirty && (
          <span className="ml-auto flex items-center gap-1 text-amber-400" title="Unsaved changes">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Edited
          </span>
        )}
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════
   Alert Recipients Page
═══════════════════════════════════════════════ */
const AlertRecipients = () => {
  const navigate = useNavigate();
  const [thresholds, setThresholds] = useState([]);
  const [users, setUsers] = useState([]);
  const [saved, setSaved] = useState({});
  const [draft, setDraft] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tRes, uRes, rRes] = await Promise.all([getThresholds(), getUsers(), getAlertRecipients()]);
      const tList = (Array.isArray(tRes) ? tRes : tRes?.data || []).map(normalizeThreshold);
      const uList = Array.isArray(uRes) ? uRes : uRes?.data || [];
      const map = toRecipientMap(rRes?.data || []);
      tList.forEach((t) => { if (!map[t.id]) map[t.id] = { email: [], sms: [] }; });

      setThresholds(tList);
      setUsers([...uList].sort((a, b) => (a.Username || '').localeCompare(b.Username || '')));
      setSaved(map);
      setDraft(map);
      setSelectedId((prev) => (tList.some((t) => t.id === prev) ? prev : tList[0]?.id ?? null));
    } catch (err) {
      console.error('Failed to load alert recipients:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load alert recipients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Derived state ── */
  const dirtyIds = useMemo(
    () => thresholds
      .map((t) => t.id)
      .filter((id) => !sameIds(draft[id]?.email, saved[id]?.email) || !sameIds(draft[id]?.sms, saved[id]?.sms)),
    [thresholds, draft, saved]
  );
  const isDirty = dirtyIds.length > 0;

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const selected = thresholds.find((t) => t.id === selectedId) || null;
  const current = (selected && draft[selected.id]) || { email: [], sms: [] };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [u.Username, u.Email, u.PhoneNumber, u.Role].some((v) => (v || '').toLowerCase().includes(q));
  });

  const summary = useMemo(() => {
    const ids = thresholds.map((t) => t.id);
    const emailUsers = new Set(ids.flatMap((id) => draft[id]?.email || []));
    const smsIds = thresholds.filter((t) => t.smsEligible).map((t) => t.id);
    const smsUsers = new Set(smsIds.flatMap((id) => draft[id]?.sms || []));
    const noSms = smsIds.filter((id) => !(draft[id]?.sms || []).length).length;
    return { thresholds: ids.length, emailUsers: emailUsers.size, smsUsers: smsUsers.size, noSms };
  }, [thresholds, draft]);

  /* ── Edits (kept as a draft until Save) ── */
  const updateCurrent = (channel, nextIds) => {
    if (!selected) return;
    setDraft((prev) => ({ ...prev, [selected.id]: { ...prev[selected.id], [channel]: sortIds(nextIds) } }));
  };

  const smsFull = current.sms.length >= MAX_SMS_RECIPIENTS;

  const toggleUser = (channel, userId) => {
    const list = current[channel];
    if (channel === 'sms' && !list.includes(userId) && list.length >= MAX_SMS_RECIPIENTS) return;
    updateCurrent(channel, list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]);
  };

  const setAllVisible = (channel, on) => {
    const eligible = filteredUsers.filter(channel === 'email' ? canEmail : canSms).map((u) => u.UserId);
    const visible = new Set(filteredUsers.map((u) => u.UserId));
    const kept = current[channel].filter((id) => !visible.has(id));
    const next = on ? [...kept, ...eligible] : kept;
    // At most 5 people receive an SMS
    updateCurrent(channel, channel === 'sms' ? next.slice(0, MAX_SMS_RECIPIENTS) : next);
  };

  const copyToAll = () => {
    if (!selected) return;
    const source = draft[selected.id];
    setDraft((prev) => {
      const next = { ...prev };
      // SMS only goes to the thresholds that send SMS; the others keep their Email list only
      thresholds.forEach((t) => {
        next[t.id] = { email: [...source.email], sms: t.smsEligible ? source.sms.slice(0, MAX_SMS_RECIPIENTS) : [] };
      });
      return next;
    });
    notify(`Copied to all ${plural(thresholds.length, 'threshold')}. SMS is only copied to the thresholds that send SMS. Press Save changes to apply.`, 'info');
  };

  const discard = () => setDraft(saved);

  const save = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const items = dirtyIds.map((id) => ({
        thresholdId: id,
        emailUserIds: draft[id].email,
        smsUserIds: draft[id].sms,
      }));
      const res = await saveAlertRecipients(items);
      const map = toRecipientMap(res?.data || []);
      thresholds.forEach((t) => { if (!map[t.id]) map[t.id] = { email: [], sms: [] }; });
      setSaved(map);
      setDraft(map);
      notify(`Recipients saved for ${plural(items.length, 'threshold')}.`);
    } catch (err) {
      console.error('Failed to save alert recipients:', err);
      const detail = err.response?.data?.errors?.map((e) => e.message).join(', ');
      notify(detail || err.response?.data?.message || err.message || 'Failed to save recipients.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */
  const bannerStyle = {
    success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', color: '#34d399', Icon: HiOutlineCheck },
    error: { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)', color: '#fb7185', Icon: HiOutlineExclamationCircle },
    info: { bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', color: '#7dd3fc', Icon: HiOutlineInformationCircle },
  };

  const emailVisibleEligible = filteredUsers.filter(canEmail);
  const smsVisibleEligible = filteredUsers.filter(canSms);
  const allEmailOn = emailVisibleEligible.length > 0 && emailVisibleEligible.every((u) => current.email.includes(u.UserId));
  const allSmsOn = smsVisibleEligible.length > 0 && smsVisibleEligible.every((u) => current.sms.includes(u.UserId));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <HiOutlineSpeakerphone className="text-xl" />
            </span>
            Alert Recipients
          </h1>
          <p className="text-xs text-dark-300 mt-1">
            Choose who receives the Email alert and who receives the SMS alert when each threshold is crossed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition-all"
            title="Add users or edit their email and phone number"
          >
            <HiOutlineUsers className="text-base text-indigo-400" />
            Manage Users
          </button>
          <button
            onClick={load}
            disabled={loading || saving}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 border border-dark-600/60 transition-all disabled:opacity-50"
            title="Reload thresholds, users and recipients"
          >
            <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Notification Banner ── */}
      <AnimatePresence>
        {notification && (() => {
          const s = bannerStyle[notification.type] || bannerStyle.success;
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
              role="status"
            >
              <s.Icon className="text-xl shrink-0" style={{ color: s.color }} />
              <p className="text-xs font-semibold" style={{ color: s.color }}>{notification.msg}</p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <HiOutlineExclamationCircle className="text-lg text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-rose-200 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { lbl: 'Thresholds', hint: 'Thresholds configured on the Settings page', val: summary.thresholds, color: '#6366f1', Icon: HiOutlineSpeakerphone },
          { lbl: 'On Email', hint: 'People who receive at least one Email alert', val: summary.emailUsers, color: EMAIL_COLOR, Icon: HiOutlineMail },
          { lbl: 'On SMS', hint: 'People who receive at least one SMS alert', val: summary.smsUsers, color: SMS_COLOR, Icon: HiOutlinePhone },
          {
            lbl: 'Without SMS',
            hint: 'Thresholds with nobody selected for SMS',
            val: summary.noSms,
            color: summary.noSms > 0 ? '#fbbf24' : '#34d399',
            Icon: summary.noSms > 0 ? HiOutlineExclamation : HiOutlineCheck,
          },
        ].map(({ lbl, hint, val, color, Icon }) => (
          <div
            key={lbl}
            title={hint}
            className="glass-card-flat px-4 py-3.5 flex items-center justify-between rounded-xl"
            style={{ background: `${color}12` }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider truncate">{lbl}</p>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color }}>{loading ? '–' : val}</p>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${color}20`, color }}>
              <Icon />
            </div>
          </div>
        ))}
      </div>

      {/* ── Main: threshold list + recipients ── */}
      {!loading && !error && thresholds.length === 0 ? (
        <div className="glass-card-flat p-10 text-center">
          <HiOutlineSpeakerphone className="text-4xl text-dark-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No thresholds yet</p>
          <p className="text-xs text-dark-300 mt-1">Create a threshold on the Settings page first, then choose its recipients here.</p>
          <button onClick={() => navigate('/settings')} className="btn-primary text-xs mt-4">Go to Settings</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
          {/* Threshold list */}
          <aside className="glass-card-flat p-3 xl:sticky xl:top-24">
            <p className="section-label px-1 pb-2">Thresholds</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2 max-h-80 xl:max-h-[calc(100vh-13rem)] overflow-y-auto pr-1">
              {thresholds.map((t) => (
                <ThresholdItem
                  key={t.id}
                  threshold={t}
                  recipients={draft[t.id]}
                  selected={t.id === selectedId}
                  dirty={dirtyIds.includes(t.id)}
                  onSelect={() => setSelectedId(t.id)}
                />
              ))}
              {loading && thresholds.length === 0 && (
                [0, 1, 2].map((i) => <div key={i} className="h-[74px] rounded-xl bg-dark-700/40 animate-pulse" />)
              )}
            </div>
          </aside>

          {/* Recipients for the selected threshold */}
          <section className="glass-card-flat overflow-hidden min-w-0">
            {selected ? (
              <>
                <div className="p-4 sm:p-5 space-y-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="section-label">Recipients for</p>
                      <h2 className="text-lg font-bold text-white mt-1 truncate">{selected.registerName}</h2>
                      <p className="text-xs text-dark-300 mt-0.5">
                        {selected.deviceName ? `${selected.deviceName} · ` : ''}Alert when {conditionText(selected).toLowerCase()} · {selected.severity}
                      </p>
                    </div>
                    <button
                      onClick={copyToAll}
                      disabled={thresholds.length < 2}
                      className="btn-ghost text-xs py-2 px-3 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Use these same Email and SMS recipients for every threshold"
                    >
                      <HiOutlineDuplicate className="text-base" />
                      Copy to all thresholds
                    </button>
                  </div>

                  {!selected.isActive && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <HiOutlineExclamation className="text-base text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        This threshold is inactive on the Settings page, so no Email or SMS is sent until it is turned on.
                        You can still choose the recipients now.
                      </span>
                    </div>
                  )}
                  {selected.isActive && selected.smsEligible && !selected.alertsOn && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <HiOutlineExclamation className="text-base text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        The SMS switch of this threshold is off on the Settings page, so no SMS is sent (Email is not affected).
                      </span>
                    </div>
                  )}

                  {/* Channel summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl" style={{ background: `${EMAIL_COLOR}0d`, border: `1px solid ${EMAIL_COLOR}33` }}>
                      <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: EMAIL_COLOR }}>
                        <HiOutlineMail className="text-sm" /> Email goes to {people(current.email.length)}
                      </p>
                      <p className="text-[11px] text-dark-300 mt-1">
                        {current.email.length > 0
                          ? users.filter((u) => current.email.includes(u.UserId)).map((u) => u.Username).join(', ')
                          : 'Nobody selected, so no Email is sent for this threshold.'}
                      </p>
                    </div>
                    {selected.smsEligible ? (
                      <div
                        className="p-3 rounded-xl"
                        style={current.sms.length > 0
                          ? { background: `${SMS_COLOR}0d`, border: `1px solid ${SMS_COLOR}33` }
                          : { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)' }}
                      >
                        <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: current.sms.length > 0 ? SMS_COLOR : '#fbbf24' }}>
                          <HiOutlinePhone className="text-sm" /> SMS goes to {people(current.sms.length)}
                          <span className="font-mono font-semibold text-dark-300">({current.sms.length}/{MAX_SMS_RECIPIENTS} max)</span>
                        </p>
                        <p className="text-[11px] text-dark-300 mt-1">
                          {current.sms.length > 0
                            ? users.filter((u) => current.sms.includes(u.UserId)).map((u) => u.Username).join(', ')
                            : 'Nobody selected, so no SMS is sent for this threshold.'}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.25)' }}>
                        <p className="flex items-center gap-1.5 text-xs font-bold text-dark-200">
                          <HiOutlinePhone className="text-sm" /> No SMS for this threshold
                        </p>
                        <p className="text-[11px] text-dark-300 mt-1">
                          SMS is only sent for {SMS_REGISTER_NAMES.join(', ')} and when the genset starts. This threshold sends Email.
                        </p>
                        {current.sms.length > 0 && (
                          <p className="text-[11px] text-amber-300 mt-1.5">
                            {plural(current.sms.length, 'old SMS recipient')} still linked. Switch {current.sms.length === 1 ? 'it' : 'them'} off in the SMS column before saving this threshold.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative w-full md:w-80">
                    <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400 text-base" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, email, phone..."
                      className="form-input pl-10 text-xs py-2 w-full"
                      aria-label="Search users"
                    />
                  </div>
                </div>

                {/* Users table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(26,35,64,0.5)' }}>
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-dark-300 uppercase tracking-wider">User</th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: EMAIL_COLOR }}>Email</span>
                            <button
                              type="button"
                              onClick={() => setAllVisible('email', !allEmailOn)}
                              disabled={emailVisibleEligible.length === 0}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 transition-colors disabled:opacity-40"
                            >
                              {allEmailOn ? 'Clear' : 'Select all'}
                            </button>
                          </div>
                        </th>
                        <th className="text-left py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: SMS_COLOR }}>SMS</span>
                            <button
                              type="button"
                              onClick={() => setAllVisible('sms', !allSmsOn)}
                              disabled={!selected.smsEligible || smsVisibleEligible.length === 0}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 transition-colors disabled:opacity-40"
                            >
                              {allSmsOn ? 'Clear' : 'Select all'}
                            </button>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const active = isActiveFlag(u.IsActive);
                        const emailOn = current.email.includes(u.UserId);
                        const smsOn = current.sms.includes(u.UserId);
                        const rc = roleColor[u.Role] || '#6b7e99';
                        return (
                          <tr
                            key={u.UserId}
                            className="border-b transition-colors hover:bg-white/[0.02]"
                            style={{ borderColor: 'rgba(99,102,241,0.06)', opacity: active ? 1 : 0.6 }}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${rc}, ${rc}99)` }}
                                >
                                  {(u.Username || 'U').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{u.Username}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-bold" style={{ color: rc }}>{u.Role}</span>
                                    {!active && (
                                      <span className="text-[10px] font-semibold text-rose-400" title="Inactive users do not receive alerts">
                                        · Inactive, won't receive
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <Switch
                                  checked={emailOn}
                                  onChange={() => toggleUser('email', u.UserId)}
                                  disabled={!canEmail(u) && !emailOn}
                                  color={EMAIL_COLOR}
                                  label={`Email alerts for ${u.Username}`}
                                  title={canEmail(u) ? undefined : 'No email address on this user. Add one on the Users page.'}
                                />
                                <span className={`text-xs truncate ${canEmail(u) ? 'text-dark-100' : 'text-dark-400 italic'}`}>
                                  {canEmail(u) ? u.Email : 'No email'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <Switch
                                  checked={smsOn}
                                  onChange={() => toggleUser('sms', u.UserId)}
                                  disabled={!selected.smsEligible ? !smsOn : (!canSms(u) && !smsOn) || (smsFull && !smsOn)}
                                  color={SMS_COLOR}
                                  label={`SMS alerts for ${u.Username}`}
                                  title={
                                    !selected.smsEligible ? 'SMS is not sent for this threshold'
                                      : !canSms(u) ? 'No phone number on this user. Add one on the Users page.'
                                        : (smsFull && !smsOn) ? `At most ${MAX_SMS_RECIPIENTS} people can receive the SMS`
                                          : undefined
                                  }
                                />
                                <span className={`text-xs font-mono truncate ${canSms(u) ? 'text-dark-100' : 'text-dark-400 italic font-sans'}`}>
                                  {canSms(u) ? u.PhoneNumber : 'No phone'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && !loading && (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-xs text-dark-300">
                            {users.length === 0 ? 'No users yet. Add users on the Users page.' : 'No users match your search.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-xs text-dark-300">{loading ? 'Loading…' : 'Select a threshold.'}</div>
            )}
          </section>
        </div>
      )}

      {/* ── Save bar (only with unsaved changes) ── */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="sticky bottom-4 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 rounded-2xl"
            style={{
              background: 'rgba(15,23,42,0.96)',
              border: '1px solid rgba(251,191,36,0.35)',
              boxShadow: '0 12px 40px rgba(2,6,23,0.7)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Unsaved changes on {plural(dirtyIds.length, 'threshold')}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={discard} disabled={saving} className="btn-ghost text-xs py-2 px-4 disabled:opacity-50">
                Discard
              </button>
              <button onClick={save} disabled={saving} className="btn-primary text-xs py-2 px-4 disabled:opacity-60">
                <HiOutlineSave className="text-base" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlertRecipients;
