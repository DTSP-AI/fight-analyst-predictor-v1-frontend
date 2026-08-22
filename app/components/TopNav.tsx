'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Swords, BarChart3, Network } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Analyst', icon: <BarChart3 size={16} /> },
  { href: '/predict', label: 'Predictor', icon: <Swords size={16} /> },
  { href: '/graph', label: 'Graph', icon: <Network size={16} /> },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function TopNav() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (menuOpen && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen, isMobile]);

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          width: '100%',
          padding: '10px 16px',
          background: 'rgba(10, 10, 15, 0.72)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              background: 'var(--accent-gradient)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Swords size={16} style={{ color: '#fff' }} />
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.3px',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Fight Toolkit
          </span>
        </Link>

        {/* Desktop tabs */}
        {!isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '999px',
              padding: '4px',
              border: '1px solid var(--glass-border)',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: active ? '#fff' : 'var(--text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                    zIndex: 1,
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="topnav-active-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--accent-gradient)',
                        borderRadius: '999px',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <motion.button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        )}
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(6px)',
                zIndex: 88,
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              style={{
                position: 'fixed',
                top: '56px',
                left: '12px',
                right: '12px',
                zIndex: 95,
                background:
                  'linear-gradient(145deg, rgba(30,30,50,0.98), rgba(20,20,35,0.98))',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: active ? '#fff' : 'var(--text-secondary)',
                      textDecoration: 'none',
                      background: active
                        ? 'var(--accent-gradient)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
