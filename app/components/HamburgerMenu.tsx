'use client';

import { motion } from 'framer-motion';

interface HamburgerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function HamburgerMenu({ isOpen, onToggle }: HamburgerMenuProps) {
  const lineVariants = {
    closed: {
      rotate: 0,
      y: 0,
    },
    open: (custom: number) => ({
      rotate: custom === 1 ? 45 : custom === 3 ? -45 : 0,
      y: custom === 1 ? 8 : custom === 3 ? -8 : 0,
      opacity: custom === 2 ? 0 : 1,
    }),
  };

  return (
    <motion.button
      onClick={onToggle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '5px',
        width: '40px',
        height: '40px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '10px',
        cursor: 'pointer',
        padding: '8px',
        zIndex: 1001,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {[1, 2, 3].map((line) => (
        <motion.span
          key={line}
          custom={line}
          variants={lineVariants}
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{
            display: 'block',
            width: '20px',
            height: '2px',
            background: 'var(--text-primary)',
            borderRadius: '2px',
            transformOrigin: 'center',
          }}
        />
      ))}
    </motion.button>
  );
}
