import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../context/LoadingContext';

/**
 * GlobalLoadingSpinner
 * Renders an edge-to-edge glowing progress bar and a floating glassmorphic
 * dual-ring spinner whenever one or more API requests are in flight.
 * Automatically disappears as soon as all requests complete or fail.
 */
const GlobalLoadingSpinner = () => {
  const { isLoading, activeRequests } = useLoading();

  return (
    <AnimatePresence>
      {isLoading && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Loading data from server"
          className="pointer-events-none select-none"
        >
          {/* ── 1. Top Indeterminate Glow Progress Bar ── */}
          <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[99999] overflow-hidden bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              className="h-full w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-sky-400"
              style={{
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.9), 0 0 18px rgba(99, 102, 241, 0.7)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                repeat: Infinity,
                duration: 1.25,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* ── 2. Floating HUD Spinner Badge ── */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 sm:bottom-auto sm:top-3.5 sm:left-1/2 sm:-translate-x-1/2 z-[99999] flex items-center gap-3 px-3.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(9, 13, 22, 0.94) 0%, rgba(15, 23, 42, 0.96) 100%)',
              borderColor: 'rgba(99, 102, 241, 0.35)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.25)',
            }}
          >
            {/* Ambient backlight glow */}
            <div className="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-[3px] animate-pulse" />

              {/* Dual-ring SVG spinner */}
              <svg
                className="w-4.5 h-4.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="2.75"
                />
                <path
                  d="M12 3C7.02944 3 3 7.02944 3 12"
                  stroke="url(#global-spinner-gradient)"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="global-spinner-gradient"
                    x1="3"
                    y1="3"
                    x2="12"
                    y2="12"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center micro beacon */}
              <span className="w-1 h-1 rounded-full bg-cyan-300 absolute" />
            </div>

            {/* Label & Active Counter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-100 flex items-center gap-1">
                <span>Loading</span>
                <span className="inline-flex tracking-tighter">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </span>

              {activeRequests > 1 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-indigo-500/25 border border-indigo-500/40 text-indigo-300">
                  {activeRequests} active
                </span>
              )}
            </div>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingSpinner;
