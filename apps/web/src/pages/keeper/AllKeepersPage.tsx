import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  SparklesIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface Keeper {
  id: string;
  title: string;
  purpose: string;
  keeperType: string;
  memoryPattern: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
  journeyCount: number;
  momentCount: number;
}

// Mock data - will be replaced with real API calls
const mockKeepers: Keeper[] = [
  {
    id: '1',
    title: 'Personal Journal',
    purpose: 'A space for daily reflections and personal growth',
    keeperType: 'Journal',
    memoryPattern: 'Chronological',
    theme: 'Keeper Classic',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-30',
    journeyCount: 3,
    momentCount: 47
  },
  {
    id: '2',
    title: 'Creative Projects',
    purpose: 'Tracking creative endeavors and artistic inspiration',
    keeperType: 'Project',
    memoryPattern: 'Associative',
    theme: 'Creative Flow',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-29',
    journeyCount: 5,
    momentCount: 32
  },
  {
    id: '3',
    title: 'Learning Adventures',
    purpose: 'Documenting my learning journey across various subjects',
    keeperType: 'Educational',
    memoryPattern: 'Hierarchical',
    theme: 'Knowledge Tree',
    createdAt: '2024-01-25',
    updatedAt: '2024-01-28',
    journeyCount: 2,
    momentCount: 18
  }
];

const AllKeepersPage: React.FC = () => {
  const [keepers] = useState<Keeper[]>(mockKeepers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredKeepers = keepers.filter(keeper => {
    const matchesSearch = keeper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         keeper.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || keeper.keeperType.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getKeeperTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'journal': return '📖';
      case 'project': return '🎨';
      case 'educational': return '🎓';
      default: return '📝';
    }
  };

  const getMemoryPatternIcon = (pattern: string) => {
    switch (pattern.toLowerCase()) {
      case 'chronological': return '⏰';
      case 'associative': return '🔗';
      case 'hierarchical': return '🌳';
      default: return '🧠';
    }
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">All Keepers</h1>
          <p className="text-muted-foreground">
            Manage your knowledge containers and memory systems
          </p>
        </div>
        <Link
          to="/keeper/new"
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create New Keeper</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search keepers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
        >
          <option value="all">All Types</option>
          <option value="journal">Journal</option>
          <option value="project">Project</option>
          <option value="educational">Educational</option>
        </select>
      </div>

      {/* Keepers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKeepers.map((keeper) => (
          <motion.div
            key={keeper.id}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getKeeperTypeIcon(keeper.keeperType)}</div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{keeper.title}</h3>
                  <p className="text-sm text-muted-foreground">{keeper.keeperType}</p>
                </div>
              </div>
              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <EllipsisVerticalIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Purpose */}
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {keeper.purpose}
            </p>

            {/* Memory Pattern */}
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-lg">{getMemoryPatternIcon(keeper.memoryPattern)}</span>
              <span className="text-sm text-muted-foreground">{keeper.memoryPattern} Memory</span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <BookOpenIcon className="w-4 h-4" />
                <span>{keeper.journeyCount} Journeys</span>
              </div>
              <div className="flex items-center space-x-1">
                <SparklesIcon className="w-4 h-4" />
                <span>{keeper.momentCount} Moments</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Link
                to={`/keeper/${keeper.id}/dashboard`}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm text-center rounded-md hover:bg-primary/90 transition-colors"
              >
                Open
              </Link>
              <Link
                to={`/keeper/${keeper.id}/memory`}
                className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground text-sm text-center rounded-md hover:bg-secondary/90 transition-colors"
              >
                Memory
              </Link>
            </div>

            {/* Last Updated */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Updated {new Date(keeper.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredKeepers.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery || filterType !== 'all' ? 'No keepers found' : 'No keepers yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first keeper to start organizing your knowledge'
            }
          </p>
          {(!searchQuery && filterType === 'all') && (
            <Link
              to="/keeper/new"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Your First Keeper</span>
            </Link>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default AllKeepersPage;
