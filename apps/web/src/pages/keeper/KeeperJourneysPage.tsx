import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const KeeperJourneysPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <motion.div
      className="max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Journeys</h1>
        <p className="text-muted-foreground">Narrative structures for Keeper ID: {id}</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-xl font-semibold text-card-foreground mb-2">Journeys Coming Soon</h2>
        <p className="text-muted-foreground">
          Create and manage narrative journeys to organize your content thematically.
        </p>
      </div>
    </motion.div>
  );
};

export default KeeperJourneysPage;
