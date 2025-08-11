import React from 'react';
import { motion } from 'framer-motion';

const DomainBoard: React.FC = () => {
  return (
    <motion.div
      className="max-w-5xl mx-auto py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl font-serif font-bold text-foreground">Domain Board</h1>
      <p className="mt-2 text-sm text-muted-foreground">Planned frames: DomainCardFrame, SetupStepsFrame, MemberListFrame, CustomDomainFrame.</p>
      <div className="mt-6 p-6 rounded-lg border border-border bg-card text-card-foreground">
        <p>This is a placeholder. Wizard engagement mode will be integrated here.</p>
      </div>
    </motion.div>
  );
};

export default DomainBoard;