import type { Transition, Variants } from "framer-motion";

export const motionEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const pageTransition: Transition = {
  duration: 0.26,
  ease: motionEase,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: pageTransition,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const listItemMotion: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: pageTransition,
  },
};