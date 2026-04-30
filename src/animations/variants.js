// ─────────────────────────────────────────────────────────────────────────────
// Central animation variants — import from here for consistency across the app
// ─────────────────────────────────────────────────────────────────────────────

const EASE = [0.4, 0, 0.2, 1]

// Page enter / exit
export const pageVariants = {
  initial: { opacity: 0, y: 28 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
  exit: {
    opacity: 0, y: -16,
    transition: { duration: 0.3, ease: EASE },
  },
}

// Parent that staggers its children
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
}

// Individual staggered child card
export const cardVariants = {
  initial: { opacity: 0, y: 22 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
}

// Scroll-triggered fade + slide-up (use with whileInView)
export const scrollReveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: {
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
}

// Hover lift for cards
export const liftHover = {
  rest: {
    y: 0,
    boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
    transition: { duration: 0.25, ease: EASE },
  },
  hover: {
    y: -5,
    boxShadow: "0 16px 48px 0 rgba(59,130,246,0.18)",
    transition: { duration: 0.25, ease: EASE },
  },
}

// Button press feedback
export const buttonVariants = {
  rest:  { scale: 1 },
  hover: { scale: 1.04, transition: { duration: 0.2 } },
  tap:   { scale: 0.96, transition: { duration: 0.1 } },
}

// Modal backdrop
export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1,  transition: { duration: 0.25 } },
  exit:    { opacity: 0,  transition: { duration: 0.2  } },
}

// Modal panel slide-up
export const modalVariants = {
  initial: { opacity: 0, scale: 0.92, y: 32 },
  animate: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring", stiffness: 340, damping: 28 },
  },
  exit: {
    opacity: 0, scale: 0.94, y: 20,
    transition: { duration: 0.22, ease: EASE },
  },
}

// Fade-in only (for simple reveals)
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
  exit:    { opacity: 0, transition: { duration: 0.25, ease: EASE } },
}