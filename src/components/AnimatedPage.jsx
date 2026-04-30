import { motion } from "framer-motion"
import { pageVariants } from "../animations/variants"

/**
 * Wrap every page with this to get consistent fade + slide transitions.
 * AnimatePresence in App.jsx handles the exit animation.
 */
export default function AnimatedPage({ children, className = "" }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  )
}