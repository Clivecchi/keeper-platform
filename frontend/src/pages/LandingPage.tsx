import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <h1 className="font-display text-6xl md:text-7xl font-bold text-foreground leading-tight">
          Begin the journey of<br />what's worth keeping.
        </h1>
        <p className="font-serif text-xl md:text-2xl text-secondary mt-6 max-w-2xl mx-auto">
          This is a space for the quiet moments, the sacred memories, and the stories that define you. A digital journal for a life lived with intention.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
        className="mt-12"
      >
        <Link
          to="/register"
          className="bg-button text-button-foreground font-serif text-xl px-10 py-4 rounded-md shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          Begin…
        </Link>
      </motion.div>
    </div>
  );
};

export default LandingPage; 