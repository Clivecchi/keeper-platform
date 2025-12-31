/**
 * ManifestoCard Component
 * 
 * Renders "The Clean Surface Doctrine" or other manifesto content
 * as a beautiful, branded card on the Domain Board.
 * 
 * Design principles:
 * - Warm gradient matching Domain Board aesthetic
 * - Serif display for title, sans for body
 * - Responsive padding (min 2rem)
 * - Soft shadow and rounded corners
 * - Optional fade-in animation
 */

import React from 'react';
import { Link } from 'react-router-dom';

export interface ManifestoProps {
  title: string;            // "The Clean Surface Doctrine"
  kicker?: string;          // "Keeper Design Manifesto"
  quote: string;            // Short headline quote
  content?: string;         // Expanded description
  cta?: { label: string; href: string };
  themeVariant?: "system" | "lowcountry-summer" | "juke-joint";
}

export function ManifestoCard({
  title,
  kicker,
  quote,
  content,
  cta,
  themeVariant = "system"
}: ManifestoProps) {
  // Theme-based gradient backgrounds
  const gradients = {
    system: "bg-gradient-to-br from-stone-50 to-amber-50",
    "lowcountry-summer": "bg-gradient-to-br from-blue-50 to-green-50",
    "juke-joint": "bg-gradient-to-br from-purple-50 to-pink-50"
  };

  const gradient = gradients[themeVariant] || gradients.system;

  return (
    <article 
      className={`${gradient} rounded-2xl shadow-lg p-8 md:p-10 animate-fade-in`}
      style={{ animationDuration: '0.4s', animationTimingFunction: 'ease-in' }}
    >
      {/* Kicker */}
      {kicker && (
        <p className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
          {kicker}
        </p>
      )}

      {/* Title */}
      <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-4">
        {title}
      </h2>

      {/* Quote - Featured prominently */}
      <blockquote className="text-xl md:text-2xl font-serif italic text-stone-700 mb-6 border-l-4 border-stone-400 pl-4">
        "{quote}"
      </blockquote>

      {/* Content - Expanded description */}
      {content && (
        <div className="prose prose-stone max-w-none mb-6">
          {content.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="text-base text-stone-700 leading-relaxed mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* CTA */}
      {cta && (
        <div className="mt-8 pt-6 border-t border-stone-200">
          <Link
            to={cta.href}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            {cta.label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </article>
  );
}

// CSS for fade-in animation (add to global CSS or inline)
// @keyframes fade-in {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }

