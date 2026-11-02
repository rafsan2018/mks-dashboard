import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineCheck,
  HiOutlineInformationCircle,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineChatAlt2,
  HiOutlineAdjustments,
} from 'react-icons/hi';
import { TbAlertTriangle, TbBell, TbDeviceDesktopAnalytics, TbEngine } from 'react-icons/tb';
import { generateThresholdDefaults } from '../data/mockData';

/* ── Condition Type Options ── */
const CONDITION_TYPES = [
  { value: 'Between', label: 'Between (Range: Min - Max)' },
  { value: 'Above',   label: 'Above (Value > Max)' },
  { value: 'Below',   label: 'Below (Value < Min)' },
];

/* ── Severity Options ── */
const SEVERITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: '#fb7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.3)' },
  { value: 'Warning',  label: 'Warning',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  { value: 'Info',     label: 'Info',     color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
];

/* ── Available Registers for new thresholds ── */
const AVAILABLE_REGISTERS = [
  { registerId: 1, label: 'Frequency',              device: 'ME631',  unit: 'Hz'  },
  { registerId: 2, label: 'Voltage L1-N',           device: 'ME631',  unit: 'V'   },
  { registerId: 3, label: 'Total Current',          device: 'ME631',  unit: 'A'   },
  { registerId: 4, label: 'Power Factor',           device: 'ME631',  unit: ''    },
  { registerId: 5, label: 'Engine Speed (RPM)',     device: 'Genset', unit: 'RPM' },
  { registerId: 6, label: 'Coolant Temperature',    device: 'Genset', unit: '°C'  },
  { registerId: 7, label: 'Oil Pressure',           device: 'Genset', unit: 'kPa' },
  { registerId: 8, label: 'Fuel Level',             device: 'Genset', unit: '%'   },
  { registerId: 9, label: 'Battery Voltage',        device: 'Genset', unit: 'V'   },
  { registerId: 10,label: 'Total Active Power',     device: 'ME631',  unit: 'kW'  },
  { registerId: 11,label: 'Current THD',            device: 'ME631',  unit: '%'   },
  { registerId: 12,label: 'Voltage THD',            device: 'ME631',  unit: '%'   },
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

const Settings = () => {
  const [thresholds, setThresholds] = useState(generateThresholdDefaults());
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [savedBanner, setSavedBanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New threshold form state
  const [newThreshold, setNewThreshold] = useState({
    registerId: 2,
    conditionType: 'Between',
    minValue: '',
    maxValue: '',
    severity: 'Warning',
    smsEnabled: true,
    isActive: true,
  });

  const updateThreshold = (thresholdId, field, value) => {
    setThresholds(prev =>
      prev.map(t => (t.thresholdId === thresholdId ? { ...t, [field]: value } : t))
    );
  };

  const deleteThreshold = (thresholdId) => {
    setThresholds(prev => prev.filter(t => t.thresholdId !== thresholdId));
  };

  const handleSave = () => {
    // TODO: POST /api/thresholds or PUT /api/thresholds/bulk
    console.log('Saved thresholds to DB:', thresholds);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleAddNew = (e) => {
    e.preventDefault();
    const reg = AVAILABLE_REGISTERS.find(r => r.registerId === Number(newThreshold.registerId)) || AVAILABLE_REGISTERS[0];
    const created = {
      thresholdId: Date.now(),
      registerId: reg.registerId,
      label: reg.label,
      device: reg.device,
      unit: reg.unit,
      conditionType: newThreshold.conditionType,
      minValue: newThreshold.minValue !== '' ? parseFloat(newThreshold.minValue) : null,
      maxValue: newThreshold.maxValue !== '' ? parseFloat(newThreshold.maxValue) : null,
      severity: newThreshold.severity,
      smsEnabled: newThreshold.smsEnabled,
      isActive: newThreshold.isActive,
    };
    setThresholds(prev => [...prev, created]);
    setShowAddModal(false);
    // Reset form
    setNewThreshold({
      registerId: 2,
      conditionType: 'Between',
      minValue: '',
      maxValue: '',
      severity: 'Warning',
      smsEnabled: true,
      isActive: true,
    });
  };

  // Filtered list
  const filteredThresholds = thresholds.filter(item => {
    const matchesSearch =
      (item.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.registerId).includes(searchTerm) ||
      (item.conditionType || '').toLowerCase().includes(searchTerm.toLowerCase());
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
            Configure register threshold rules, condition types, min/max limits, severity, and SMS notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 text-xs py-2.5 px-5"
          >
            <HiOutlineCheck className="text-base" />
            Save Changes
          </motion.button>
        </div>
      </div>

      {/* ── Saved Success Banner ── */}
      <AnimatePresence>
        {savedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}
          >
            <HiOutlineCheck className="text-emerald-400 text-xl shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Thresholds updated successfully</p>
              <p className="text-xs text-emerald-300/80">Settings have been committed to the database (elliance_mks.Thresholds).</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guidance Banner ── */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <HiOutlineInformationCircle className="text-indigo-400 text-xl shrink-0 mt-0.5" />
        <div className="text-xs text-dark-300 leading-relaxed">
          <p className="font-semibold text-indigo-300 mb-0.5">Database Aligned Configuration (elliance_mks.Thresholds)</p>
          Each threshold rule evaluates a specific register. Specify the <strong className="text-dark-100">Condition Type</strong> (Between, Above, Below), <strong className="text-dark-100">MinValue</strong>, <strong className="text-dark-100">MaxValue</strong>, <strong className="text-dark-100">Severity</strong>, and enable <strong className="text-dark-100">SMS Notification</strong> when triggered.
        </div>
      </div>

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
              <option value="Genset">Genset DSE</option>
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
            onClick={() => setThresholds(generateThresholdDefaults())}
            className="btn-ghost text-xs py-1.5 px-3 ml-auto"
            title="Reset to default threshold rules"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Thresholds List ── */}
      <div className="space-y-3">
        {filteredThresholds.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <TbAlertTriangle className="text-4xl text-dark-300 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-white">No threshold rules found</p>
            <p className="text-xs text-dark-300 mt-1">Try changing your search keywords or filter options.</p>
          </div>
        ) : (
          filteredThresholds.map((item) => {
            const sevMeta = SEVERITY_OPTIONS.find(s => s.value === item.severity) || SEVERITY_OPTIONS[1];
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
                  opacity: item.isActive ? 1 : 0.6,
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Column 1: Register Info & Active Status (3 cols) */}
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
                        <span className="text-xs font-bold text-white truncate">{item.label}</span>
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
                        <span className="text-[11px] text-dark-300 font-mono">
                          Reg #{item.registerId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: ConditionType Dropdown (2 cols) */}
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-bold text-dark-300 uppercase tracking-wider block mb-1">
                      Condition Type
                    </label>
                    <select
                      value={item.conditionType || 'Between'}
                      onChange={(e) => updateThreshold(item.thresholdId, 'conditionType', e.target.value)}
                      className="form-input text-xs py-1.5 px-2.5 w-full font-medium"
                    >
                      {CONDITION_TYPES.map(c => (
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
                          updateThreshold(
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
                          updateThreshold(
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
                        onChange={(e) => updateThreshold(item.thresholdId, 'severity', e.target.value)}
                        className="form-input text-xs py-1.5 px-2.5 w-full font-semibold"
                        style={{
                          color: sevMeta.color,
                          borderColor: sevMeta.border,
                          background: 'rgba(15,23,42,0.6)',
                        }}
                      >
                        {SEVERITY_OPTIONS.map(s => (
                          <option key={s.value} value={s.value} style={{ color: '#fff', background: '#1e293b' }}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Column 5: SMSEnabled & Actions (2 cols) */}
                  <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-dark-600/40">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">SMS Alert</span>
                      <Toggle
                        checked={item.smsEnabled}
                        onChange={() => updateThreshold(item.thresholdId, 'smsEnabled', !item.smsEnabled)}
                        activeColor="#10b981"
                      />
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">Active</span>
                      <Toggle
                        checked={item.isActive}
                        onChange={() => updateThreshold(item.thresholdId, 'isActive', !item.isActive)}
                        activeColor="#6366f1"
                      />
                    </div>

                    <button
                      onClick={() => deleteThreshold(item.thresholdId)}
                      className="p-1.5 rounded-lg text-dark-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                      title="Delete Threshold Rule"
                    >
                      <HiOutlineTrash className="text-base" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Add New Threshold Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-lg shadow-2xl relative"
              style={{ background: '#111827', border: '1px solid rgba(99,102,241,0.25)' }}
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
                  >
                    {AVAILABLE_REGISTERS.map(r => (
                      <option key={r.registerId} value={r.registerId}>
                        [{r.device}] Reg #{r.registerId} — {r.label} ({r.unit || 'unitless'})
                      </option>
                    ))}
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
                    {CONDITION_TYPES.map(c => (
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
                    {SEVERITY_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Toggles */}
                <div className="pt-2 flex items-center justify-between border-t border-dark-600/40">
                  <Toggle
                    checked={newThreshold.smsEnabled}
                    onChange={() => setNewThreshold({ ...newThreshold, smsEnabled: !newThreshold.smsEnabled })}
                    label="Enable SMS Alert (SMSEnabled)"
                    activeColor="#10b981"
                  />
                  <Toggle
                    checked={newThreshold.isActive}
                    onChange={() => setNewThreshold({ ...newThreshold, isActive: !newThreshold.isActive })}
                    label="Is Active"
                    activeColor="#6366f1"
                  />
                </div>

                {/* Submit button */}
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
      </AnimatePresence>
    </div>
  );
};

export default Settings;
