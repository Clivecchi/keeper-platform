import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="py-[7px]">
      <nav className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 flex justify-end items-center">
        <div className="relative">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center justify-center rounded-sm p-2 text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background"
          >
            <ChevronDown className="w-4 h-4" strokeWidth={1.25} />
          </button>

          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg border border-border py-1 z-50">
                <NavLink
                  to="/login"
                  className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </NavLink>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};