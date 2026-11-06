import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, logout } from '../api/authService';
import {
  HiOutlineViewGrid,
  HiOutlineLightningBolt,
  HiOutlineCog,
  HiOutlineUserGroup,
  HiOutlineLogout,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineUserCircle,
  HiOutlineBell,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineSpeakerphone,
} from 'react-icons/hi';
import { TbEngine, TbChevronRight } from 'react-icons/tb';
import { MdOutlineElectricMeter } from 'react-icons/md';
import mksLogo from '../assets/mks_logo.png';
import ellianceLogo from '../assets/Picture1.png';
import yscLogo from '../assets/ysc_logo.png';

/* ── Navigation items ── */
const navItems = [
  { path: '/dashboard', label: 'Overview', icon: HiOutlineViewGrid, accent: '#6366f1' },
  { path: '/genset', label: 'Genset', icon: TbEngine, accent: '#f59e0b' },
  { path: '/dpm', label: 'DPM', icon: MdOutlineElectricMeter, accent: '#0ea5e9' },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog, accent: '#10b981' },
  { path: '/recipients', label: 'Alert Recipients', icon: HiOutlineSpeakerphone, accent: '#06b6d4' },
  { path: '/sms-alerts', label: 'SMS Alerts', icon: HiOutlinePhone, accent: '#34d399' },
  { path: '/users', label: 'Users', icon: HiOutlineUserGroup, accent: '#8b5cf6' },
];

const pageTitles = {
  '/dashboard': { title: 'Overview', subtitle: 'Real-time system monitoring' },
  '/genset': { title: 'Genset Controller', subtitle: 'DSE7320 MKII — Engine, Generator & Mains' },
  '/dpm': { title: 'Digital Power Meter', subtitle: 'ME631 — Register groups per Modbus manual' },
  '/settings': { title: 'Settings', subtitle: 'System configuration & threshold alerts' },
  '/recipients': { title: 'Alert Recipients', subtitle: 'Who receives Email and SMS alerts' },
  '/sms-alerts': { title: 'SMS Alerts', subtitle: 'SMS settings, genset start message and SMS log' },
  '/users': { title: 'User Management', subtitle: 'Access control and user accounts' },
  '/profile': { title: 'User Profile', subtitle: 'Manage your account details and security credentials' },
};
/* ── Processed YSC Logo with white emblem & transparent background ── */
const YscLogo = ({ height = 34 }) => {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = yscLogo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 15) {
          // Keep vibrant green letters intact
          const isGreen = g > 110 && g > r + 20 && g > b + 20;
          if (!isGreen) {
            // Turn dark emblem pixels to pure crisp white
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setDataUrl(canvas.toDataURL());
    };
  }, []);

  return dataUrl ? (
    <img
      src={dataUrl}
      alt="YHW"
      className="w-auto object-contain shrink-0"
      style={{ height: `${height}px` }}
    />
  ) : (
    <div style={{ height: `${height}px`, width: '110px' }} className="animate-pulse bg-slate-800/40 rounded" />
  );
};

/* ── Sidebar Contact Info ── */
const ContactInfo = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="group relative flex justify-center py-2 px-2">
        <a
          href="tel:+60174027783"
          aria-label="Contact YSC Engineering Solutions"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-sm"
        >
          <HiOutlinePhone className="text-lg" />
        </a>

        {/* Hover Popover */}
        <div className="pointer-events-none group-hover:pointer-events-auto absolute left-full ml-3 bottom-0 w-72 p-3.5 rounded-xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Contact</span>
          </div>
          <div className="text-xs font-bold text-white mb-2 leading-snug">
            YSC Engineering Solutions Sdn. Bhd.
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex items-start gap-2">
              <HiOutlinePhone className="text-emerald-400 shrink-0 mt-0.5 text-xs" />
              <div className="flex flex-col space-y-0.5 font-mono text-[11px]">
                <a href="tel:+60174027783" className="hover:text-emerald-300 transition-colors">+6017-402 7783</a>
                <a href="tel:+60194027783" className="hover:text-emerald-300 transition-colors">+6019-402 7783</a>
                <a href="tel:0184702362" className="hover:text-emerald-300 transition-colors">018-470 2362</a>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800">
              <HiOutlineMail className="text-emerald-400 shrink-0 text-xs" />
              <a href="mailto:yhwhshammah@outlook.com" className="hover:text-emerald-300 transition-colors truncate font-mono text-[11px]">
                yhwhshammah@outlook.com
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-3 my-2 p-3 rounded-xl border transition-all text-left"
      style={{
        background: 'linear-gradient(145deg, rgba(16,185,129,0.06) 0%, rgba(15,23,42,0.65) 100%)',
        borderColor: 'rgba(16,185,129,0.22)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Contact Support
        </span>
      </div>
      <p className="text-xs font-bold text-white leading-snug mb-2.5">
        YSC Engineering Solutions Sdn. Bhd.
      </p>

      <div className="space-y-2 text-[11px]">
        {/* Mobile Numbers */}
        <div className="flex items-start gap-2 text-slate-300">
          <HiOutlinePhone className="text-emerald-400 shrink-0 mt-0.5 text-sm" />
          <div className="flex flex-col space-y-0.5 font-mono text-[11px]">
            <a href="tel:+60174027783" className="hover:text-emerald-300 transition-colors">+6017-402 7783</a>
            <a href="tel:+60194027783" className="hover:text-emerald-300 transition-colors">+6019-402 7783</a>
            <a href="tel:0184702362" className="hover:text-emerald-300 transition-colors">018-470 2362</a>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center gap-2 text-slate-300 pt-1.5 border-t border-white/5">
          <HiOutlineMail className="text-emerald-400 shrink-0 text-sm" />
          <a
            href="mailto:yhwhshammah@outlook.com"
            title="yhwhshammah@outlook.com"
            className="hover:text-emerald-300 transition-colors truncate font-mono text-[10.5px]"
          >
            yhwhshammah@outlook.com
          </a>
        </div>
      </div>
    </div>
  );
};

/* ── Sidebar ── */
const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #090d16 0%, #070a12 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Sidebar Header / Toggle ── */}
      <div
        className={`flex items-center py-3.5 shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-bold tracking-widest text-slate-400 uppercase"
            >
              Navigation
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-all group shrink-0 hover:bg-slate-800/60"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {collapsed
            ? <HiOutlineChevronRight className="text-base group-hover:text-indigo-400 transition-colors" />
            : <HiOutlineChevronLeft className="text-base group-hover:text-indigo-400 transition-colors" />
          }
        </button>
      </div>

      {/* ── Nav Items ── */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={isActive ? { color: item.accent } : {}}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full"
                  style={{ background: item.accent }}
                  transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className="text-xl shrink-0"
                style={{ color: isActive ? item.accent : undefined }}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Right arrow for collapsed active */}
              {isActive && collapsed && (
                <TbChevronRight className="absolute right-1 text-xs opacity-50" style={{ color: item.accent }} />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Contact Section ── */}
      <div className="shrink-0 border-t border-white/5">
        <ContactInfo compact={collapsed} />
      </div>

      {/* ── Footer ── */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {!collapsed && (
          <div className="flex flex-col items-center gap-1">
            <img src={ellianceLogo} alt="Elliance" className="h-6 w-auto object-contain opacity-70" />
            <span className="text-[10px] font-medium tracking-wide text-slate-400">V1.0.0</span>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

/* ── TopBar ── */
const TopBar = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('auth-user-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    return () => {
      window.removeEventListener('auth-user-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const userName = user?.Username || 'kader';
  const userRole = user?.Role || 'Admin';
  const userEmail = user?.Email || 'admin@modbus.io';
  const avatarChar = userName.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-18 flex items-center justify-between px-4 sm:px-6"
      style={{
        background: '#090d16',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* LEFT: 1. YSC Logo | 2. System Title */}
      <div className="flex items-center gap-4 min-w-0">
        {/* 1. YSC Logo */}
        <div className="flex items-center shrink-0">
          <YscLogo height={34} />
        </div>

        {/* Vertical divider */}
        <div className="hidden sm:block h-6 w-px bg-green-700/60 shrink-0" />

        {/* 2. System Title */}
        <div className="hidden sm:block min-w-0">
          <h1 className="text-base font-bold text-white leading-tight tracking-tight truncate">
            Genset Monitoring System
          </h1>
          <p className="text-xs text-slate-400 truncate tracking-normal font-normal">
            Real-time system monitoring
          </p>
        </div>
      </div>

      {/* RIGHT: 3. MKS Logo + 4. Live Status + 5. Notifications + 6. User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* 3. MKS Logo */}
        <div
          className="hidden sm:flex items-center justify-center bg-white rounded-lg px-2.5 py-1 shadow-sm shrink-0"
          style={{ minHeight: '30px' }}
        >
          <img src={mksLogo} alt="MKS" className="h-5 w-auto object-contain" />
        </div>

        {/* 4. Live Status Indicator */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0"
          style={{
            background: 'rgba(6, 44, 38, 0.7)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
          }}
        >
          <div
            className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
            style={{ boxShadow: '0 0 8px #10b981' }}
          />
          <span className="text-[11px] font-bold text-emerald-400 tracking-wider">LIVE</span>
        </div>

        {/* 5. Notifications */}
        <button
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all hover:bg-slate-800/80 shrink-0"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          title="Notifications"
        >
          <HiOutlineBell className="text-lg" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-sm">
            1
          </span>
        </button>

        {/* 6. User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 pl-1 focus:outline-none hover:opacity-90 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
              style={{ background: '#0284c7' }}
            >
              {avatarChar}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white leading-tight capitalize">{userName}</p>
              <p className="text-[10px] text-slate-400">{userRole}</p>
            </div>
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-52 rounded-xl overflow-hidden z-50"
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(99,102,241,0.15)',
                  boxShadow: '0 20px 50px rgba(2,6,23,0.7)',
                }}
              >
                <div className="p-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: '#0284c7' }}
                    >
                      {avatarChar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate capitalize">{userName}</p>
                      <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg transition-colors hover:bg-indigo-500/10"
                    onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  >
                    <HiOutlineCog className="text-lg" /> Settings
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg transition-colors hover:bg-indigo-500/10"
                    onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                  >
                    <HiOutlineUserCircle className="text-lg" /> Profile
                  </button>
                  <div className="my-1" style={{ height: '1px', background: 'rgba(99,102,241,0.08)' }} />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 rounded-lg transition-colors hover:bg-rose-500/10"
                  >
                    <HiOutlineLogout className="text-lg" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

/* ── Mobile Nav Drawer ── */
const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="lg:hidden">
      {/* Mobile Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-3 sm:px-4"
        style={{
          background: '#090d16',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* Left: YSC Logo + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <YscLogo height={28} />
          <span className="text-sm font-bold text-white truncate">Genset Monitor</span>
        </div>
        {/* Right: LIVE + hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(6, 44, 38, 0.7)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Toggle Navigation Menu"
          >
            {open ? <HiOutlineX className="text-lg" /> : <HiOutlineMenuAlt2 className="text-lg" />}
          </button>
        </div>
      </header>

      {/* Drawer Overlay & Content */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm top-16"
            />

            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed right-0 top-16 bottom-0 z-40 w-72 max-w-[80vw] flex flex-col shadow-2xl"
              style={{ background: '#0a0e1a', borderLeft: '1px solid rgba(99,102,241,0.15)' }}
            >
              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                <p className="section-label px-2 mb-3">Navigation Menu</p>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`nav-item ${isActive ? 'active' : ''} w-full py-3 px-4 text-base font-medium rounded-xl`}
                      style={isActive ? { color: item.accent, background: `${item.accent}15` } : {}}
                    >
                      <item.icon className="text-xl shrink-0" style={{ color: isActive ? item.accent : undefined }} />
                      <span>{item.label}</span>
                      {isActive && <TbChevronRight className="ml-auto text-lg" style={{ color: item.accent }} />}
                    </NavLink>
                  );
                })}
                <div className="pt-2">
                  <ContactInfo compact={false} />
                </div>
              </nav>
              <div className="p-4" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-rose-400 text-sm font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}
                >
                  <HiOutlineLogout className="text-lg" /> Logout System
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Layout ── */
const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#020617' }}>
      {/* Desktop Navigation */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <TopBar sidebarCollapsed={collapsed} />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main content container */}
      <main
        className={`transition-all duration-300 min-h-screen pt-16 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} ml-0`}
      >
        <div className="p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
