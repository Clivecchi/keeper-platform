import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="py-[7px]">
      <nav className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 flex justify-end items-center">
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex items-center justify-center rounded-sm p-2 text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background"
        >
          <ChevronDown className="w-4 h-4" strokeWidth={1.25} />
        </button>
      </nav>
    </header>
  );
};