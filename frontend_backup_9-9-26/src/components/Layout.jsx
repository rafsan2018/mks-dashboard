import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'react-icons/hi';
import { TbEngine, TbChevronRight } from 'react-icons/tb';
import { MdOutlineElectricMeter } from 'react-icons/md';

/* ── Navigation items ── */
const navItems = [
  { path: '/dashboard', label: 'Overview', icon: HiOutlineViewGrid,     accent: '#6366f1' },
  { path: '/genset',    label: 'Genset',   icon: TbEngine,              accent: '#f59e0b' },
  { path: '/dpm',       label: 'DPM',      icon: MdOutlineElectricMeter, accent: '#0ea5e9' },
  { path: '/settings',  label: 'Settings', icon: HiOutlineCog,          accent: '#10b981' },
  { path: '/users',     label: 'Users',    icon: HiOutlineUserGroup,    accent: '#8b5cf6' },
];

const pageTitles = {
  '/dashboard': { title: 'Overview',             subtitle: 'Real-time system monitoring' },
  '/genset':    { title: 'Genset Controller',     subtitle: 'DSE7320 MKII — Engine, Generator & Mains' },
  '/dpm':       { title: 'Digital Power Meter',   subtitle: 'ME631 — Register groups per Modbus manual' },
  '/settings':  { title: 'Settings',              subtitle: 'System configuration & threshold alerts' },
  '/users':     { title: 'User Management',       subtitle: 'Access control & SMS notification settings' },
};

/* ── Sidebar ── */
const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0a0e1a 100%)',
        borderRight: '1px solid rgba(99,102,241,0.1)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}
        >
          <HiOutlineLightningBolt className="text-white text-xl" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="text-base font-bold text-white leading-tight">ModBas</h1>
              <p className="text-[9px] font-semibold tracking-widest text-indigo-400 uppercase -mt-0.5">
                Monitoring System
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav Label ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="section-label px-4 pt-5 pb-2"
          >
            Navigation
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Nav Items ── */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden pb-4">
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

      {/* ── Collapse toggle ── */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}
      >
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-300 hover:text-dark-100 transition-all group"
          style={{ background: 'rgba(99,102,241,0.04)' }}
        >
          {collapsed
            ? <HiOutlineChevronRight className="text-xl shrink-0 group-hover:text-indigo-400 transition-colors" />
            : <>
                <HiOutlineChevronLeft className="text-xl shrink-0 group-hover:text-indigo-400 transition-colors" />
                <AnimatePresence>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium"
                  >
                    Collapse
                  </motion.span>
                </AnimatePresence>
              </>
          }
        </button>
      </div>
    </motion.aside>
  );
};

/* ── TopBar ── */
const TopBar = ({ sidebarCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const page = pageTitles[location.pathname] || { title: 'Dashboard', subtitle: '' };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[260px]'
      } left-0`}
      style={{
        background: 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.08)',
      }}
    >
      {/* Title */}
      <div className="min-w-0 pr-2">
        <h2 className="text-sm sm:text-base font-semibold text-white leading-tight truncate">{page.title}</h2>
        <p className="text-[10px] sm:text-[11px] text-dark-300 truncate">{page.subtitle}</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live indicator */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
          <span className="text-[10px] sm:text-xs font-semibold text-emerald-400">LIVE</span>
        </div>

        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-dark-300 hover:text-white transition-all min-h-[36px] min-w-[36px]"
          style={{ background: 'rgba(26,35,64,0.7)', border: '1px solid rgba(99,102,241,0.1)' }}
          title="Notifications"
        >
          <HiOutlineBell className="text-lg" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 sm:pl-3 focus:outline-none hover:opacity-80 transition-opacity min-h-[36px]"
            style={{ borderLeft: '1px solid rgba(99,102,241,0.12)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}
            >
              A
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-white leading-tight">Admin</p>
              <p className="text-[10px] text-dark-300">Administrator</p>
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
                      style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}
                    >A</div>
                    <div>
                      <p className="text-sm font-semibold text-white">Admin</p>
                      <p className="text-xs text-dark-300">admin@modbus.io</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-dark-200 hover:text-white rounded-lg transition-colors hover:bg-indigo-500/10"
                    onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  >
                    <HiOutlineCog className="text-lg" /> Settings
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-dark-200 hover:text-white rounded-lg transition-colors hover:bg-indigo-500/10"
                    onClick={() => { navigate('/users'); setProfileOpen(false); }}
                  >
                    <HiOutlineUserCircle className="text-lg" /> Profile
                  </button>
                  <div className="my-1" style={{ height: '1px', background: 'rgba(99,102,241,0.08)' }} />
                  <button
                    onClick={() => navigate('/login')}
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
      {/* Top Header for Mobile */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
        style={{
          background: 'rgba(10,14,26,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #0ea5e9)' }}
          >
            <HiOutlineLightningBolt className="text-white text-sm" />
          </div>
          <span className="text-sm font-bold text-white">ModBas</span>
          <span className="text-[9px] font-semibold tracking-widest text-indigo-400 uppercase hidden sm:block">Monitor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400">LIVE</span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all active:scale-95"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
            aria-label="Toggle Navigation Menu"
          >
            {open ? <HiOutlineX className="text-xl" /> : <HiOutlineMenuAlt2 className="text-xl" />}
          </button>
        </div>
      </header>

      {/* Drawer Overlay & Content */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm top-14"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed right-0 top-14 bottom-0 z-40 w-72 max-w-[80vw] flex flex-col shadow-2xl"
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
              </nav>
              <div className="p-4" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                <button
                  onClick={() => { navigate('/login'); setOpen(false); }}
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
        className={`transition-all duration-300 min-h-screen pt-14 lg:pt-16 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        } ml-0`}
      >
        <div className="p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
