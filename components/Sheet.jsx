'use client';

import { useState } from 'react';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';

// A modal "sheet" with Apple-style fluid behaviour:
// - springs in from a small offset and settles (no jarring pop)
// - can be grabbed by the top handle and flicked down to dismiss, with the
//   release velocity handed to the spring (direct manipulation + momentum)
// - animates out before unmounting; honours reduced motion
// Renders the existing .overlay / .modal2 markup so all current styles apply.
export default function Sheet({ onClose, children, maxWidth }) {
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const [leaving, setLeaving] = useState(false);
  const close = () => setLeaving(true);

  const spring = reduce
    ? { duration: 0.15 }
    : { type: 'spring', bounce: 0.18, duration: 0.4 };

  return (
    <motion.div
      className="overlay"
      onClick={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduce ? 0.12 : 0.2 }}
      onAnimationComplete={() => { if (leaving) onClose(); }}
    >
      <motion.div
        className="modal2"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { y: 24, scale: 0.96, opacity: 0 }}
        animate={leaving
          ? (reduce ? { opacity: 0 } : { y: 60, scale: 0.98, opacity: 0 })
          : (reduce ? { opacity: 1 } : { y: 0, scale: 1, opacity: 1 })}
        transition={spring}
        drag={reduce ? false : 'y'}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.6 }}
        onDragEnd={(e, info) => {
          // Flick down or drag far enough → dismiss; otherwise spring back.
          if (info.offset.y > 110 || info.velocity.y > 600) close();
        }}
      >
        {!reduce ? (
          <div
            className="sheet-grip"
            onPointerDown={(e) => controls.start(e)}
            aria-hidden="true"
          >
            <span />
          </div>
        ) : null}
        {children}
      </motion.div>
    </motion.div>
  );
}
