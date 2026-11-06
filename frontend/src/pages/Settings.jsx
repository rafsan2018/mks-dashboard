import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineCheck,
  HiOutlineInformationCircle,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineRefresh,
  HiOutlineMail,
} from 'react-icons/hi';
import { TbAlertTriangle, TbDeviceDesktopAnalytics, TbEngine } from 'react-icons/tb';
import {
  getThresholds,
  createThreshold,
  updateThreshold,
  toggleThresholdStatus,
  deleteThreshold,
  getRegisterDefinitions,
} from '../api/thresholdService';
import { sendTestEmail } from '../api/authService';

/* ── Condition Type Options ── */
const CONDITION_TYPES = [
  { value: 'Between', label: 'Between (Range: Min - Max)' },
  { value: 'Above', label: 'Above (Value > Max)' },
  { value: 'Below', label: 'Below (Value < Min)' },
];

/* ── Severity Options ── */
const SEVERITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: '#fb7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.3)' },
  { value: 'Warning', label: 'Warning', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  { value: 'Info', label: 'Info', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' },
];

/* ── Toggle Switch Component ── */
const Toggle = ({ checked, onChange, label, activeColor = '#6366f1' }) => (
  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
    <div
      className="relative w-9 h-5 rounded-full transition-all duration-200"
      style={{
        background: checked ? activeColor : 'rgba(26,35,64,0.8)',
        border: checked ? `1px solid ${activeColor}80` : '1px solid rgba(99,102,241,0.15)',
      }}
      onClick={onChange}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
        style={{
          left: checked ? 'calc(100% - 18px)' : '2px',
          background: checked ? '#ffffff' : '#6b7e99',
          boxShadow: checked ? `0 1px 4px ${activeColor}60` : 'none',
        }}
      />
    </div>
    {label && <span className="text-xs font-medium text-dark-200">{label}</span>}
  </label>
);

/* Helper to normalize threshold item from API */
const normalizeThreshold = (item) => {
  const minVal = item.MinValue !== null && item.MinValue !== undefined ? parseFloat(item.MinValue) : null;
  const maxVal = item.MaxValue !== null && item.MaxValue !== undefined ? parseFloat(item.MaxValue) : null;

  let cond = 'Between';
  if (minVal !== null && maxVal === null) cond = 'Below';
  else if (minVal === null && maxVal !== null) cond = 'Above';

  const isGenset =
    (item.DeviceId === 1 || item.deviceId === 1) ||
    (item.DeviceName && item.DeviceName.toLowerCase().includes('amf')) ||
    (item.DeviceName && item.DeviceName.toLowerCase().includes('genset'));

  return {
    thresholdId: item.ThresholdId ?? item.thresholdId,
    registerId: item.RegisterId ?? item.registerId,
    registerName: item.RegisterName ?? item.registerName ?? `Register #${item.RegisterId ?? item.registerId}`,
    unit: item.Unit ?? item.unit ?? '',
    dataType: item.DataType ?? item.dataType ?? '',
    deviceId: item.DeviceId ?? item.deviceId ?? (isGenset ? 1 : 2),
    device: isGenset ? 'Genset' : (item.DeviceName || 'ME631'),
    deviceName: item.DeviceName ?? (isGenset ? 'AMF Control Module #1' : 'ME631 Meter'),
    conditionType: cond,
    minValue: minVal,
    maxValue: maxVal,
    severity: item.Severity ?? item.severity ?? 'Warning',
    smsEnabled: item.SMSEnabled !== undefined ? Number(item.SMSEnabled) === 1 : Boolean(item.smsEnabled),
    isActive: item.IsActive !== undefined ? Number(item.IsActive) === 1 : Boolean(item.isActive),
  };
};

const Settings = () => {
  const [thresholds, setThresholds] = useState([]);
  const [availableRegisters, setAvailableRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [savedBanner, setSavedBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New threshold form state
  const [newThreshold, setNewThreshold] = useState({
    registerId: '',
    conditionType: 'Between',
    minValue: '',
    maxValue: '',
    severity: 'Warning',
    smsEnabled: true,
    isActive: true,
  });

  // Fetch thresholds from API
  const fetchThresholds = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getThresholds();
      const rawData = Array.isArray(res) ? res : (res?.data || []);
      const formatted = rawData.map(normalizeThreshold).sort((a, b) => a.thresholdId - b.thresholdId);
      setThresholds(formatted);
    } catch (err) {
      console.error('Failed to load thresholds from API:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load thresholds');
    } finally {
      setLoading(false);
    }
  };

  // Fetch registers for the Add New Threshold dropdown
  const fetchRegisters = async () => {
    try {
      const res = await getRegisterDefinitions();
      const rawData = Array.isArray(res) ? res : (res?.data || []);
      // Inactive registers store no readings, so they are not offered for thresholds
      const activeRegisters = rawData.filter((r) => r.Status == null || String(r.Status).trim().toLowerCase() === 'active');
      const mapped = activeRegisters.map((r) => {
        const isGenset =
          r.DeviceId === 1 ||
          (r.DeviceName && r.DeviceName.toLowerCase().includes('amf')) ||
          (r.DeviceName && r.DeviceName.toLowerCase().includes('genset'));
        return {
          registerId: r.RegisterId,
          label: r.RegisterName,
          device: isGenset ? 'Genset' : 'ME631',
          unit: r.Unit || '',
          dataType: r.DataType || '',
        };
      });
      setAvailableRegisters(mapped);
      if (mapped.length > 0) {
        setNewThreshold((prev) => ({
          ...prev,
          registerId: prev.registerId || mapped[0].registerId,
        }));
      }
    } catch (err) {
      console.warn('Could not load register definitions:', err);
    }
  };

  useEffect(() => {
    fetchThresholds();
    fetchRegisters();
  }, []);

  const showNotification = (msg) => {
    setBannerText(msg);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3500);
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    setTestEmailStatus(null);
    try {
      const response = await sendTestEmail();
      const recipient = response?.data?.recipient;
      setTestEmailStatus({
        success: true,
        message: recipient ? `Test email sent to ${recipient}` : 'Test email sent successfully',
      });
    } catch (err) {
      console.error('Failed to send test email:', err);
      setTestEmailStatus({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to send test email',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const updateThresholdState = (thresholdId, field, value) => {
    setThresholds((prev) =>
      prev.map((t) => (t.thresholdId === thresholdId ? { ...t, [field]: value } : t))
    );
  };

  // Immediate toggle for IsActive via PATCH API
  const handleToggleActive = async (thresholdId, currentVal) => {
    const newVal = !currentVal;
    updateThresholdState(thresholdId, 'isActive', newVal);
    try {
      await toggleThresholdStatus(thresholdId, newVal);
      showNotification(`Threshold #${thresholdId} active status set to: ${newVal ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('Error toggling active status:', err);
      updateThresholdState(thresholdId, 'isActive', currentVal);
      alert(err.response?.data?.message || 'Failed to update threshold active status');
    }
  };

  // Immediate toggle for SMSEnabled via PUT API
  const handleToggleSms = async (thresholdId, currentVal) => {
    const newVal = !currentVal;
    updateThresholdState(thresholdId, 'smsEnabled', newVal);
    try {
      await updateThreshold(thresholdId, { smsEnabled: newVal ? 1 : 0 });
      showNotification(`Threshold #${thresholdId} SMS alert set to: ${newVal ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('Error toggling SMS status:', err);
      updateThresholdState(thresholdId, 'smsEnabled', currentVal);
      alert(err.response?.data?.message || 'Failed to update SMS status');
    }
  };

  // Delete threshold via DELETE API
  const handleDeleteThreshold = async (thresholdId) => {
    if (!window.confirm('Are you sure you want to delete this threshold rule?')) return;
    try {
      await deleteThreshold(thresholdId);
      setThresholds((prev) => prev.filter((t) => t.thresholdId !== thresholdId));
      showNotification(`Threshold rule #${thresholdId} deleted successfully`);
    } catch (err) {
      console.error('Error deleting threshold:', err);
      alert(err.response?.data?.message || 'Failed to delete threshold rule');
    }
  };

  // Bulk save all thresholds (min, max, severity, sms, active) via PUT API
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        thresholds.map((t) =>
          updateThreshold(t.thresholdId, {
            minValue: t.minValue !== null && t.minValue !== '' ? parseFloat(t.minValue) : null,
            maxValue: t.maxValue !== null && t.maxValue !== '' ? parseFloat(t.maxValue) : null,
            severity: t.severity,
            smsEnabled: t.smsEnabled ? 1 : 0,
            isActive: t.isActive ? 1 : 0,
          })
        )
      );
      showNotification('All threshold changes have been saved to the database successfully');
      await fetchThresholds();
    } catch (err) {
      console.error('Failed to save thresholds:', err);
      alert(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Add new threshold via POST API
  const handleAddNew = async (e) => {
    e.preventDefault();
    try {
      const regId = Number(newThreshold.registerId) || (availableRegisters[0]?.registerId);
      if (!regId) {
        alert('Please select a valid register');
        return;
      }

      let min = newThreshold.minValue !== '' ? parseFloat(newThreshold.minValue) : null;
      let max = newThreshold.maxValue !== '' ? parseFloat(newThreshold.maxValue) : null;

      if (newThreshold.conditionType === 'Above') min = null;
      if (newThreshold.conditionType === 'Below') max = null;

      const payload = {
        registerId: regId,
        minValue: min,
        maxValue: max,
        severity: newThreshold.severity,
        smsEnabled: newThreshold.smsEnabled ? 1 : 0,
        isActive: newThreshold.isActive ? 1 : 0,
      };

      await createThreshold(payload);
      setShowAddModal(false);
      showNotification('New threshold rule created successfully');
      // Reset form
      setNewThreshold({
        registerId: availableRegisters[0]?.registerId || '',
        conditionType: 'Between',
        minValue: '',
        maxValue: '',
        severity: 'Warning',
        smsEnabled: true,
        isActive: true,
      });
      await fetchThresholds();
    } catch (err) {
      console.error('Failed to create threshold rule:', err);
      alert(err.response?.data?.message || 'Failed to create threshold rule');
    }
  };

  // Filtered list
  const filteredThresholds = thresholds.filter((item) => {
    const matchesSearch =
      (item.registerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.registerId).includes(searchTerm) ||
      (item.device || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.severity || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDevice = deviceFilter === 'ALL' || item.device === deviceFilter;
    const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
    return matchesSearch && matchesDevice && matchesSeverity;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <TbAlertTriangle className="text-xl" />
            </span>
            Threshold Alerts Configuration
          </h1>
          <p className="text-xs text-dark-300 mt-1">
            Configure threshold rules and severity. Enabled SMS alerts also send email when a limit is crossed.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 border border-dark-600/60 transition-all disabled:opacity-50"
            title="Send a test email to your profile email address"
          >
            <HiOutlineMail className="text-base" />
            {sendingTestEmail ? 'Sending test...' : 'Test Email'}
          </button>
          <button
            onClick={fetchThresholds}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-200 hover:text-white bg-dark-700/60 hover:bg-dark-600 border border-dark-600/60 transition-all"
            title="Reload thresholds from API"
          >
            <HiOutlineRefresh className={`text-base ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
            }}
          >
            <HiOutlinePlus className="text-base" />
            Add Threshold
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveAll}
            disabled={saving || thresholds.length === 0}
            className="btn-primary flex items-center gap-2 text-xs py-2.5 px-5 disabled:opacity-50"
          >
            <HiOutlineCheck className="text-base" />
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>
      </div>

      {testEmailStatus && (
        <div
          role="status"
          className={`p-3 rounded-xl text-xs ${
            testEmailStatus.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {testEmailStatus.message}
        </div>
      )}

      {/* ── Saved Success Banner ── */}
      <AnimatePresence>
        {savedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            <HiOutlineCheck className="text-emerald-400 text-xl shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Action successful</p>
              <p className="text-xs text-emerald-300/80">{bannerText || 'Settings have been committed to the database (elliance_mks.Thresholds).'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <TbAlertTriangle className="text-lg text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchThresholds}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}



      {/* ── Filter & Search Bar ── */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-300 text-base" />
          <input
            type="text"
            placeholder="Search register or parameter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10 text-xs py-2 w-full"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider">Device:</span>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="form-input text-xs py-1.5 px-3 rounded-lg"
              style={{ minWidth: '110px' }}
            >
              <option value="ALL">All Devices</option>
              <option value="ME631">ME631 Meter</option>
              <option value="Genset">Genset</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-input text-xs py-1.5 px-3 rounded-lg"
              style={{ minWidth: '110px' }}
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Info">Info</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setDeviceFilter('ALL');
              setSeverityFilter('ALL');
            }}
            className="btn-ghost text-xs py-1.5 px-3 ml-auto"
            title="Reset search and filters"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ── Thresholds List ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card p-12 text-center">
            <HiOutlineRefresh className="animate-spin text-3xl text-indigo-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Loading threshold rules...</p>
            <p className="text-xs text-dark-300 mt-1">Retrieving thresholds from /api/v1/thresholds</p>
          </div>
        ) : filteredThresholds.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <TbAlertTriangle className="text-4xl text-dark-300 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-white">No threshold rules found</p>
            <p className="text-xs text-dark-300 mt-1">
              {thresholds.length === 0
                ? 'There are no thresholds configured in the database. Click "Add Threshold" to create one.'
                : 'Try changing your search keywords or filter options.'}
            </p>
          </div>
        ) : (
          filteredThresholds.map((item) => {
            const sevMeta = SEVERITY_OPTIONS.find((s) => s.value === item.severity) || SEVERITY_OPTIONS[1];
            const isGenset = item.device === 'Genset';

            return (
              <motion.div
                key={item.thresholdId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-4 transition-all duration-200"
                style={{
                  background: item.isActive ? 'rgba(17, 24, 39, 0.75)' : 'rgba(15, 23, 42, 0.35)',
                  border: item.isActive ? '1px solid rgba(99, 102, 241, 0.16)' : '1px solid rgba(99, 102, 241, 0.05)',
                  opacity: item.isActive ? 1 : 0.65,
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Column 1: Register Info & Dynamic Name (3 cols) */}
                  <div className="lg:col-span-3 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isGenset ? 'rgba(245,158,11,0.12)' : 'rgba(14,165,233,0.12)',
                        border: isGenset ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(14,165,233,0.25)',
                        color: isGenset ? '#fbbf24' : '#38bdf8',
                      }}
                    >
                      {isGenset ? <TbEngine className="text-xl" /> : <TbDeviceDesktopAnalytics className="text-xl" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate" title={item.registerName}>
                          {item.registerName}
                        </span>
                        {item.unit && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-dark-600/60 text-dark-300 border border-dark-500/30">
                            {item.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: isGenset ? 'rgba(245,158,11,0.15)' : 'rgba(14,165,233,0.15)',
                            color: isGenset ? '#fbbf24' : '#38bdf8',
                          }}
                        >
                          {item.device}
                        </span>
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                          style={{ color: '#c4b5fd', background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.28)' }}>
                          Threshold #{item.thresholdId}
                        </span>
                        <span className="text-[11px] text-dark-300 font-mono">
                          Reg #{item.registerId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Condition Type Dropdown (2 cols) */}
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">
                      Condition Type
                    </label>
                    <select
                      value={item.conditionType || 'Between'}
                      onChange={(e) => updateThresholdState(item.thresholdId, 'conditionType', e.target.value)}
                      className="form-input text-xs py-1.5 px-2.5 w-full font-medium"
                    >
                      {CONDITION_TYPES.map((c) => (
                        <option key={c.value} value={c.value}>{c.value}</option>
                      ))}
                    </select>
                  </div>

                  {/* Column 3: MinValue & MaxValue Inputs (3 cols) */}
                  <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">
                        Min Value
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="NULL"
                        value={item.minValue ?? ''}
                        disabled={item.conditionType === 'Above'}
                        onChange={(e) =>
                          updateThresholdState(
                            item.thresholdId,
                            'minValue',
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                        className="form-input text-xs py-1.5 px-2.5 w-full font-mono"
                        style={{
                          opacity: item.conditionType === 'Above' ? 0.35 : 1,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">
                        Max Value
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="NULL"
                        value={item.maxValue ?? ''}
                        disabled={item.conditionType === 'Below'}
                        onChange={(e) =>
                          updateThresholdState(
                            item.thresholdId,
                            'maxValue',
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                        className="form-input text-xs py-1.5 px-2.5 w-full font-mono"
                        style={{
                          opacity: item.conditionType === 'Below' ? 0.35 : 1,
                        }}
                      />
                    </div>
                  </div>

                  {/* Column 4: Severity Dropdown (2 cols) */}
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">
                      Severity
                    </label>
                    <div className="relative">
                      <select
                        value={item.severity || 'Warning'}
                        onChange={(e) => updateThresholdState(item.thresholdId, 'severity', e.target.value)}
                        className="form-input text-xs py-1.5 px-2.5 w-full font-semibold"
                        style={{
                          color: sevMeta.color,
                          borderColor: sevMeta.border,
                          background: 'rgba(15,23,42,0.6)',
                        }}
                      >
                        {SEVERITY_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value} style={{ color: '#fff', background: '#1e293b' }}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Column 5: Dynamic SMSEnabled & Dynamic IsActive + Actions (2 cols) */}
                  <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-dark-600/40">
                    {/* SMS Alert Status (Dynamic SMSEnabled) */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">SMS Alert · #{item.thresholdId}</span>
                      <div className="flex items-center gap-1.5">
                        <Toggle
                          checked={item.smsEnabled}
                          onChange={() => handleToggleSms(item.thresholdId, item.smsEnabled)}
                          activeColor="#10b981"
                        />
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: item.smsEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            color: item.smsEnabled ? '#34d399' : '#9ca3af',
                            border: item.smsEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          {item.smsEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    {/* Active Status (Dynamic IsActive) */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">Active · #{item.thresholdId}</span>
                      <div className="flex items-center gap-1.5">
                        <Toggle
                          checked={item.isActive}
                          onChange={() => handleToggleActive(item.thresholdId, item.isActive)}
                          activeColor="#6366f1"
                        />
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: item.isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            color: item.isActive ? '#818cf8' : '#9ca3af',
                            border: item.isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(107, 114, 128, 0.2)',
                          }}
                        >
                          {item.isActive ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteThreshold(item.thresholdId)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-dark-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                      title="Delete Threshold Rule"
                    >
                      <HiOutlineTrash className="text-lg" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Add New Threshold Modal (Centered strictly relative to Viewport) ── */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Full-screen Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
              />

              {/* Modal Dialog explicitly centered in viewport */}
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
                      <HiOutlinePlus className="text-lg" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Add New Threshold</h3>
                      <p className="text-xs text-dark-300">Create a rule matching elliance_mks.Thresholds</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-dark-300 hover:text-white text-lg px-2"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddNew} className="space-y-4">
                  {/* Register selection */}
                  <div>
                    <label className="text-xs font-semibold text-dark-200 block mb-1">Target Register / Parameter</label>
                    <select
                      value={newThreshold.registerId}
                      onChange={(e) => setNewThreshold({ ...newThreshold, registerId: Number(e.target.value) })}
                      className="form-input text-xs py-2 w-full"
                      required
                    >
                      {availableRegisters.length > 0 ? (
                        availableRegisters.map((r) => (
                          <option key={r.registerId} value={r.registerId}>
                            [{r.device}] Reg #{r.registerId} — {r.label} ({r.unit || 'unitless'})
                          </option>
                        ))
                      ) : (
                        <option value="">No registers available</option>
                      )}
                    </select>
                  </div>

                  {/* Condition Type */}
                  <div>
                    <label className="text-xs font-semibold text-dark-200 block mb-1">Condition Type</label>
                    <select
                      value={newThreshold.conditionType}
                      onChange={(e) => setNewThreshold({ ...newThreshold, conditionType: e.target.value })}
                      className="form-input text-xs py-2 w-full"
                    >
                      {CONDITION_TYPES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min / Max values */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-dark-200 block mb-1">
                        Min Value {newThreshold.conditionType === 'Above' && <span className="text-dark-400">(N/A)</span>}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 198.00"
                        disabled={newThreshold.conditionType === 'Above'}
                        value={newThreshold.minValue}
                        onChange={(e) => setNewThreshold({ ...newThreshold, minValue: e.target.value })}
                        className="form-input text-xs py-2 w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-dark-200 block mb-1">
                        Max Value {newThreshold.conditionType === 'Below' && <span className="text-dark-400">(N/A)</span>}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 242.00"
                        disabled={newThreshold.conditionType === 'Below'}
                        value={newThreshold.maxValue}
                        onChange={(e) => setNewThreshold({ ...newThreshold, maxValue: e.target.value })}
                        className="form-input text-xs py-2 w-full font-mono"
                      />
                    </div>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="text-xs font-semibold text-dark-200 block mb-1">Severity Level</label>
                    <select
                      value={newThreshold.severity}
                      onChange={(e) => setNewThreshold({ ...newThreshold, severity: e.target.value })}
                      className="form-input text-xs py-2 w-full font-semibold"
                    >
                      {SEVERITY_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 flex items-center justify-between border-t border-dark-600/40">
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={newThreshold.smsEnabled}
                        onChange={() => setNewThreshold({ ...newThreshold, smsEnabled: !newThreshold.smsEnabled })}
                        activeColor="#10b981"
                      />
                      <div className="text-xs">
                        <span className="text-dark-200 font-medium">SMS Alert: </span>
                        <span className={`font-bold font-mono ${newThreshold.smsEnabled ? 'text-emerald-400' : 'text-dark-400'}`}>
                          {newThreshold.smsEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={newThreshold.isActive}
                        onChange={() => setNewThreshold({ ...newThreshold, isActive: !newThreshold.isActive })}
                        activeColor="#6366f1"
                      />
                      <div className="text-xs">
                        <span className="text-dark-200 font-medium">Active: </span>
                        <span className={`font-bold font-mono ${newThreshold.isActive ? 'text-indigo-400' : 'text-dark-400'}`}>
                          {newThreshold.isActive ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="btn-ghost text-xs py-2 px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs py-2 px-5"
                    >
                      Add Threshold Rule
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

export default Settings;
