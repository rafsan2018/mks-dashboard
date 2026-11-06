import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineExclamationCircle,
  HiOutlineExclamation,
  HiOutlineInformationCircle,
  HiOutlineSave,
  HiOutlineUsers,
  HiOutlineLightningBolt,
  HiOutlineClock,
} from 'react-icons/hi';
import { getUsers } from '../api/userService';
import { getAlertSettings, saveAlertSettings, getSmsLog } from '../api/alertSettingsService';
import {
  SMS_REGISTER_NAMES,
  MAX_SMS_RECIPIENTS,
  SMS_MAX_LENGTH,
  START_PLACEHOLDERS,
  DEFAULT_START_MESSAGE,
  renderStartMessage,
  validateStartMessage,
} from '../constants/alertRules';

const SMS_COLOR = '#34d399';

const DEFAULT_SETTINGS = {
  smsEnabled: true,
  siteName: 'Genset Room',
  reminderMinutes: 30,
  retryMinutes: 1,
  gensetStartEnabled: true,
  startDelaySeconds: 10,
  suppressLowWhenStopped: true,
  startMessage: DEFAULT_START_MESSAGE,
};

/* ── Helpers ── */
const hasText = (v) => typeof v === 'string' && v.trim() !== '';
const isActiveFlag = (v) => v === true || Number(v) === 1;
const sortIds = (ids) => [...new Set(ids)].sort((a, b) => a - b);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The database stores the local time without a time zone: show it exactly as stored
const formatTime = (value) => {
  if (!value) return '–';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().replace('T', ' ').slice(0, 16);
};

/* ── Switch (same look as the Alert Recipients page) ── */
const Switch = ({ checked, onChange, disabled, color = SMS_COLOR, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
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

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="text-[11px] font-bold text-dark-300 uppercase tracking-wider">{label}</span>
    <div className="mt-1.5">{children}</div>
    {hint && <span className="block text-[11px] text-dark-300 mt-1">{hint}</span>}
  </label>
);

const NumberInput = ({ value, onChange, min, max, suffix }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="form-input text-sm py-2 w-28 font-mono"
    />
    {suffix && <span className="text-xs text-dark-300">{suffix}</span>}
  </div>
);

const STATUS_STYLE = {
  SENT: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
  FAILED: { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.3)' },
  PENDING: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
};

/* ═══════════════════════════════════════════════
   SMS Alerts Page
═══════════════════════════════════════════════ */
const SmsAlerts = () => {
  const navigate = useNavigate();
  const messageRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [saved, setSaved] = useState({ settings: DEFAULT_SETTINGS, gensetStartUserIds: [] });
  const [draft, setDraft] = useState({ settings: DEFAULT_SETTINGS, gensetStartUserIds: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [log, setLog] = useState({ rows: [], last7Days: {} });
  const [logStatus, setLogStatus] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadLog = async (status = logStatus) => {
    try {
      setLogLoading(true);
      setLogError(null);
      const res = await getSmsLog({ limit: 100, ...(status ? { status } : {}) });
      setLog({ rows: res?.data?.rows || [], last7Days: res?.data?.last7Days || {} });
    } catch (err) {
      console.error('Failed to load the SMS log:', err);
      setLogError(err.response?.data?.message || err.message || 'Failed to load the SMS log.');
    } finally {
      setLogLoading(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sRes, uRes] = await Promise.all([getAlertSettings(), getUsers()]);
      const uList = Array.isArray(uRes) ? uRes : uRes?.data || [];
      const next = {
        settings: { ...DEFAULT_SETTINGS, ...(sRes?.data?.settings || {}) },
        gensetStartUserIds: sortIds(sRes?.data?.gensetStartUserIds || []),
      };
      setUsers([...uList].sort((a, b) => (a.Username || '').localeCompare(b.Username || '')));
      setSaved(next);
      setDraft(next);
    } catch (err) {
      console.error('Failed to load SMS settings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load SMS settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); loadLog(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = !sameJson(saved, draft);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const s = draft.settings;
  const setSetting = (key, value) => setDraft((prev) => ({ ...prev, settings: { ...prev.settings, [key]: value } }));

  const toggleRecipient = (userId) => {
    setDraft((prev) => {
      const list = prev.gensetStartUserIds;
      const next = list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId];
      return { ...prev, gensetStartUserIds: sortIds(next) };
    });
  };

  const insertPlaceholder = (key) => {
    const el = messageRef.current;
    const token = `{${key}}`;
    const text = s.startMessage || '';
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    setSetting('startMessage', text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const preview = renderStartMessage(s.startMessage);
  const problems = useMemo(() => validateStartMessage(s.startMessage), [s.startMessage]);

  const recipientsTooMany = draft.gensetStartUserIds.length > MAX_SMS_RECIPIENTS;
  const numberErrors = [
    s.reminderMinutes === '' || s.reminderMinutes < 0 || s.reminderMinutes > 1440 ? 'Reminder interval must be 0 to 1440 minutes' : null,
    s.retryMinutes === '' || s.retryMinutes < 1 || s.retryMinutes > 120 ? 'Retry time must be 1 to 120 minutes' : null,
    s.startDelaySeconds === '' || s.startDelaySeconds < 0 || s.startDelaySeconds > 120 ? 'Start delay must be 0 to 120 seconds' : null,
    !hasText(s.siteName) ? 'Site name cannot be empty' : null,
  ].filter(Boolean);
  const canSave = isDirty && !saving && problems.length === 0 && numberErrors.length === 0 && !recipientsTooMany;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await saveAlertSettings({
        settings: {
          ...s,
          siteName: s.siteName.trim(),
        },
        gensetStartUserIds: draft.gensetStartUserIds,
      });
      const next = {
        settings: { ...DEFAULT_SETTINGS, ...(res?.data?.settings || {}) },
        gensetStartUserIds: sortIds(res?.data?.gensetStartUserIds || []),
      };
      setSaved(next);
      setDraft(next);
      notify('SMS settings saved. The EG628 picks them up within 5 minutes.');
    } catch (err) {
      console.error('Failed to save SMS settings:', err);
      const detail = err.response?.data?.errors?.map((e) => e.message).join(', ');
      notify(detail || err.response?.data?.message || err.message || 'Failed to save SMS settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const bannerStyle = {
    success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', color: '#34d399', Icon: HiOutlineCheck },
    error: { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)', color: '#fb7185', Icon: HiOutlineExclamationCircle },
    info: { bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', color: '#7dd3fc', Icon: HiOutlineInformationCircle },
  };

  const phoneUsers = users.filter((u) => hasText(u.PhoneNumber));
  const noPhoneUsers = users.length - phoneUsers.length;
  const sentCount = log.last7Days.SENT || 0;
  const failedCount = log.last7Days.FAILED || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <HiOutlinePhone className="text-xl" />
            </span>
            SMS Alerts
          </h1>
          <p className="text-xs text-dark-300 mt-1">
            SMS are sent from the genset room through the SIM card: when the genset starts, and when
            {' '}{SMS_REGISTER_NAMES.join(', ').toLowerCase()} go out of range. Everything else is sent by Email.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/recipients')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition-all"
            title="Choose who receives the SMS of each threshold"
          >
            <HiOutlineUsers className="text-base text-cyan-400" />
            Threshold Recipients
          </button>
          <button
            onClick={() => { load(); loadLog(); }}
            disabled={loading || saving}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 border border-dark-600/60 transition-all disabled:opacity-50"
          >
            <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Notification Banner ── */}
      <AnimatePresence>
        {notification && (() => {
          const b = bannerStyle[notification.type] || bannerStyle.success;
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg"
              style={{ background: b.bg, border: `1px solid ${b.border}` }}
              role="status"
            >
              <b.Icon className="text-xl shrink-0" style={{ color: b.color }} />
              <p className="text-xs font-semibold" style={{ color: b.color }}>{notification.msg}</p>
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

      {!error && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* ── General SMS settings ── */}
          <section className="glass-card-flat p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">General</p>
                <h2 className="text-base font-bold text-white mt-1">SMS alerts</h2>
                <p className="text-xs text-dark-300 mt-0.5">Applies to every SMS sent from the genset room.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold" style={{ color: s.smsEnabled ? SMS_COLOR : '#9ca3af' }}>{s.smsEnabled ? 'On' : 'Off'}</span>
                <Switch checked={s.smsEnabled} onChange={() => setSetting('smsEnabled', !s.smsEnabled)} label="Send SMS alerts" />
              </div>
            </div>

            {!s.smsEnabled && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <HiOutlineExclamation className="text-base text-amber-400 shrink-0 mt-0.5" />
                <span>SMS is switched off. Alarms are still checked and written to the log on site, but no SMS is sent. Email is not affected.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Site name" hint="Shown in every SMS">
                <input
                  value={s.siteName}
                  maxLength={30}
                  onChange={(e) => setSetting('siteName', e.target.value)}
                  className="form-input text-sm py-2 w-full"
                />
              </Field>
              <Field label="Reminder" hint="While a value stays out of range. 0 = only one SMS per alarm">
                <NumberInput value={s.reminderMinutes} onChange={(v) => setSetting('reminderMinutes', v)} min={0} max={1440} suffix="minutes" />
              </Field>
              <Field label="Retry after a failed send" hint="For example when there is no signal">
                <NumberInput value={s.retryMinutes} onChange={(v) => setSetting('retryMinutes', v)} min={1} max={120} suffix="minutes" />
              </Field>
            </div>

            {numberErrors.length > 0 && (
              <ul className="space-y-1">
                {numberErrors.map((m) => (
                  <li key={m} className="flex items-start gap-1.5 text-[11px] text-rose-300">
                    <HiOutlineExclamationCircle className="text-sm shrink-0 mt-0.5" /> {m}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-start justify-between gap-3 p-3 rounded-xl" style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.1)' }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Ignore "low" alarms while the engine is stopped</p>
                <p className="text-[11px] text-dark-300 mt-0.5">
                  Oil pressure and coolant temperature are normally low when the genset is off, so they only alarm while the engine runs. Fuel level always alarms.
                </p>
              </div>
              <Switch
                checked={s.suppressLowWhenStopped}
                onChange={() => setSetting('suppressLowWhenStopped', !s.suppressLowWhenStopped)}
                label="Ignore low alarms while the engine is stopped"
              />
            </div>

            <div className="p-3 rounded-xl text-xs text-dark-200 space-y-1" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <p className="font-semibold text-cyan-300 flex items-center gap-1.5"><HiOutlineInformationCircle className="text-sm" /> Which thresholds send SMS</p>
              <p>
                Only {SMS_REGISTER_NAMES.join(', ')}. Choose who receives them (up to {MAX_SMS_RECIPIENTS} people each) on the
                {' '}<button onClick={() => navigate('/recipients')} className="underline text-cyan-300 hover:text-white">Alert Recipients</button> page.
                Every other threshold sends Email only.
              </p>
            </div>
          </section>

          {/* ── Genset started ── */}
          <section className="glass-card-flat p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">Event</p>
                <h2 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                  <HiOutlineLightningBolt className="text-amber-400" /> Genset started
                </h2>
                <p className="text-xs text-dark-300 mt-0.5">Sent when the controller's "Number of starts" goes up by one.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold" style={{ color: s.gensetStartEnabled ? SMS_COLOR : '#9ca3af' }}>{s.gensetStartEnabled ? 'On' : 'Off'}</span>
                <Switch checked={s.gensetStartEnabled} onChange={() => setSetting('gensetStartEnabled', !s.gensetStartEnabled)} label="Send an SMS when the genset starts" />
              </div>
            </div>

            <Field label="Wait after the start" hint="So the oil pressure has built up when it is read">
              <NumberInput value={s.startDelaySeconds} onChange={(v) => setSetting('startDelaySeconds', v)} min={0} max={120} suffix="seconds" />
            </Field>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-dark-300 uppercase tracking-wider">Message</span>
                <button
                  type="button"
                  onClick={() => setSetting('startMessage', DEFAULT_START_MESSAGE)}
                  disabled={s.startMessage === DEFAULT_START_MESSAGE}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 transition-colors disabled:opacity-40"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                ref={messageRef}
                rows={5}
                value={String(s.startMessage ?? '').replace(/\\n/g, '\n')}
                onChange={(e) => setSetting('startMessage', e.target.value)}
                className="form-input text-xs font-mono w-full mt-1.5"
                aria-label="Genset started message"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {START_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    title={`${p.label}, for example ${p.sample}`}
                    className="text-[10px] font-mono font-semibold px-2 py-1 rounded-md text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                  >
                    {`{${p.key}}`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-dark-300 mt-1.5">
                Put the units in the text (for example <span className="font-mono">{'{oil} kPa'}</span>); the placeholders are only numbers.
                A value that could not be read is shown as <span className="font-mono">n/a</span>.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-dark-300 uppercase tracking-wider">Preview (sample values)</span>
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{ color: preview.length > SMS_MAX_LENGTH ? '#fb7185' : SMS_COLOR }}
                >
                  {preview.length} / {SMS_MAX_LENGTH}
                </span>
              </div>
              <pre
                className="mt-1.5 p-3 rounded-xl text-xs font-mono text-white whitespace-pre-wrap"
                style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}
              >{preview}</pre>
              {problems.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {problems.map((p) => (
                    <li key={p} className="flex items-start gap-1.5 text-[11px] text-rose-300">
                      <HiOutlineExclamationCircle className="text-sm shrink-0 mt-0.5" /> {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-dark-300 uppercase tracking-wider">Who receives it</span>
                <span className="text-[11px] font-mono font-bold" style={{ color: recipientsTooMany ? '#fb7185' : SMS_COLOR }}>
                  {draft.gensetStartUserIds.length} / {MAX_SMS_RECIPIENTS}
                </span>
              </div>
              {draft.gensetStartUserIds.length === 0 && (
                <p className="text-[11px] text-amber-300 mt-1">
                  Nobody selected: the SMS goes to everyone who receives an SMS threshold alert.
                </p>
              )}
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.12)' }}>
                {phoneUsers.map((u) => {
                  const on = draft.gensetStartUserIds.includes(u.UserId);
                  const active = isActiveFlag(u.IsActive);
                  return (
                    <div
                      key={u.UserId}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 border-b last:border-b-0"
                      style={{ borderColor: 'rgba(99,102,241,0.06)', opacity: active ? 1 : 0.6 }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {u.Username}
                          {!active && <span className="text-[10px] font-semibold text-rose-400 ml-2">Inactive, won't receive</span>}
                        </p>
                        <p className="text-[11px] font-mono text-dark-300 truncate">{u.PhoneNumber}</p>
                      </div>
                      <Switch
                        checked={on}
                        onChange={() => toggleRecipient(u.UserId)}
                        disabled={!on && draft.gensetStartUserIds.length >= MAX_SMS_RECIPIENTS}
                        label={`Genset started SMS for ${u.Username}`}
                      />
                    </div>
                  );
                })}
                {phoneUsers.length === 0 && !loading && (
                  <p className="p-4 text-xs text-dark-300 text-center">No user has a phone number yet.</p>
                )}
              </div>
              {noPhoneUsers > 0 && (
                <p className="text-[11px] text-dark-300 mt-1.5">
                  {plural(noPhoneUsers, 'user')} without a phone number {noPhoneUsers === 1 ? 'is' : 'are'} not listed.
                  Add numbers on the <button onClick={() => navigate('/users')} className="underline text-indigo-300 hover:text-white">Users</button> page (for example +60123456789).
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── SMS log ── */}
      <section className="glass-card-flat overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
          <div>
            <p className="section-label">History</p>
            <h2 className="text-base font-bold text-white mt-1 flex items-center gap-2"><HiOutlineClock className="text-indigo-300" /> SMS log</h2>
            <p className="text-xs text-dark-300 mt-0.5">
              Last 7 days: <span className="font-semibold" style={{ color: SMS_COLOR }}>{sentCount} sent</span>
              {' · '}
              <span className="font-semibold" style={{ color: failedCount > 0 ? '#fb7185' : '#9ca3af' }}>{failedCount} failed</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[['', 'All'], ['SENT', 'Sent'], ['FAILED', 'Failed']].map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => { setLogStatus(value); loadLog(value); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={logStatus === value
                  ? { background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.4)' }
                  : { background: 'rgba(26,35,64,0.6)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.12)' }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => loadLog()}
              disabled={logLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 border border-dark-600/60 transition-all disabled:opacity-50"
            >
              <HiOutlineRefresh className={`text-sm ${logLoading ? 'animate-spin' : ''}`} /> Reload
            </button>
          </div>
        </div>

        {logError ? (
          <p className="p-5 text-xs text-rose-300">{logError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(26,35,64,0.5)' }}>
                  {['Time', 'Status', 'To', 'Alert', 'Message'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-dark-300 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.rows.map((row) => {
                  const st = STATUS_STYLE[row.Status] || STATUS_STYLE.PENDING;
                  return (
                    <tr key={row.AlertId} className="border-b align-top hover:bg-white/[0.02]" style={{ borderColor: 'rgba(99,102,241,0.06)' }}>
                      <td className="py-2.5 px-4 text-xs font-mono text-dark-100 whitespace-nowrap">{formatTime(row.SentAt)}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                          {row.Status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono text-dark-100 whitespace-nowrap">{row.Recipient || '–'}</td>
                      <td className="py-2.5 px-4 text-xs text-dark-100 whitespace-nowrap">
                        {row.ThresholdId ? (row.RegisterName || `Threshold #${row.ThresholdId}`) : 'Genset started'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-dark-200 whitespace-pre-line">{row.Message}</td>
                    </tr>
                  );
                })}
                {log.rows.length === 0 && !logLoading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-dark-300">No SMS in the log yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
              {canSave ? 'Unsaved changes' : 'Fix the highlighted problems before saving'}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setDraft(saved)} disabled={saving} className="btn-ghost text-xs py-2 px-4 disabled:opacity-50">
                Discard
              </button>
              <button onClick={save} disabled={!canSave} className="btn-primary text-xs py-2 px-4 disabled:opacity-60 disabled:cursor-not-allowed">
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

export default SmsAlerts;
