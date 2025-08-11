import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const BoardStudioIndex: React.FC = () => {
  return (
    <motion.div
      className="max-w-4xl mx-auto py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground">Board Studio</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Compose and explore Keeper Boards. Choose a board to begin.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/studio/agent-board" className="block p-6 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
          <h2 className="text-lg font-medium text-card-foreground">Agent Board</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and configure your AI Agents.</p>
        </Link>

        <Link to="/studio/domain-board" className="block p-6 rounded-lg border border-border bg-card hover:bg-muted transition-colors">
          <h2 className="text-lg font-medium text-card-foreground">Domain Board</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage domain configuration and setup.</p>
        </Link>
      </div>
    </motion.div>
  );
};

export default BoardStudioIndex;