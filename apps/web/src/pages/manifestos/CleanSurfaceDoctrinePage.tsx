/**
 * Clean Surface Doctrine - Full Manifesto Page
 * 
 * A read-only page displaying the complete Clean Surface Doctrine
 * from the Keeper Design Manifesto.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export default function CleanSurfaceDoctrinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50">
      {/* Back Navigation */}
      <header className="max-w-4xl mx-auto px-6 pt-8 pb-4">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Header */}
          <header className="mb-12 text-center border-b border-stone-200 pb-8">
            <p className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-3">
              Keeper Design Manifesto
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-stone-900 mb-6">
              The Clean Surface Doctrine
            </h1>
            <blockquote className="text-2xl md:text-3xl font-serif italic text-stone-700">
              "If the surface isn't calm, the depth can't be seen."
            </blockquote>
          </header>

          {/* Main Content */}
          <div className="prose prose-lg prose-stone max-w-none">
            <section className="mb-10">
              <h2 className="font-display text-3xl font-bold text-stone-900 mb-4">
                Our Foundation
              </h2>
              <p className="text-lg text-stone-700 leading-relaxed mb-4">
                Keeper exists to preserve what's worthy of effort. Every screen, panel, and interaction 
                must serve that mission. When the interface feels like administration instead of creation, 
                we lose the spirit of what we're building.
              </p>
              <p className="text-lg text-stone-700 leading-relaxed">
                The Clean Surface Doctrine keeps us honest — to ensure everything we design reflects calm, 
                clarity, and creative dignity.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-display text-3xl font-bold text-stone-900 mb-6">
                The Seven Laws
              </h2>
              
              <div className="space-y-6">
                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    1. Clarity is Sacred
                  </h3>
                  <p className="text-stone-700">
                    No feature, no matter how powerful, justifies confusion. If a user must pause to 
                    understand, we have failed. Simplicity is not the absence of depth—it is the mastery of it.
                  </p>
                </div>

                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    2. Every Surface Should Feel Worth Keeping
                  </h3>
                  <p className="text-stone-700">
                    We build a platform for preserving what matters. Our own interfaces must embody that 
                    care. No throwaway screens. No placeholder text. Everything we ship should feel permanent.
                  </p>
                </div>

                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    3. Build Only What Serves Creation
                  </h3>
                  <p className="text-stone-700">
                    Every toggle, every field, every button must earn its place. If it doesn't directly 
                    support creating, connecting, or preserving, it doesn't belong on the surface.
                  </p>
                </div>

                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    4. Emotionally Clean Equals Functionally Clear
                  </h3>
                  <p className="text-stone-700">
                    Stress, clutter, and cognitive load are design failures. When something feels heavy, 
                    it usually is heavy. Trust your emotional reaction—if it feels off, it is off.
                  </p>
                </div>

                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    5. Kip Should Feel Present, Not Panels
                  </h3>
                  <p className="text-stone-700">
                    The AI should feel conversational, not transactional. Dashboards should feel like 
                    workspaces, not control panels. Interactions should feel human, not administrative.
                  </p>
                </div>

                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    6. Preserve Creative Dignity
                  </h3>
                  <p className="text-stone-700">
                    Using Keeper should never feel like filling out forms or managing databases. It should 
                    feel like building something meaningful. Honor the user's creative intent at every step.
                  </p>
                </div>

                <div className="pl-6 border-l-4 border-stone-300">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">
                    7. If You Wouldn't Keep It, Don't Ship It
                  </h3>
                  <p className="text-stone-700">
                    This is the ultimate test. Would you be proud to look at this screen in five years? 
                    If not, it's not ready. We are building a platform for permanence—our work must reflect that.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-display text-3xl font-bold text-stone-900 mb-4">
                In Practice
              </h2>
              <p className="text-lg text-stone-700 leading-relaxed mb-4">
                These aren't abstract principles. They guide every decision:
              </p>
              <ul className="space-y-3 text-stone-700">
                <li className="flex items-start gap-3">
                  <span className="text-stone-400 font-bold">→</span>
                  <span>When adding a feature, ask: "Does this serve creation, or does it serve administration?"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400 font-bold">→</span>
                  <span>When designing a screen, ask: "Would I feel calm looking at this every day?"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400 font-bold">→</span>
                  <span>When writing copy, ask: "Does this sound like a person, or like a system?"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400 font-bold">→</span>
                  <span>When reviewing a PR, ask: "Is this something we'd be proud to keep?"</span>
                </li>
              </ul>
            </section>

            <section className="mt-12 pt-8 border-t border-stone-200">
              <p className="text-xl text-stone-800 font-serif italic text-center leading-relaxed">
                To build worth keeping, we must first design worth keeping — surfaces that honor the soul 
                of creation, not the noise of control.
              </p>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-stone-200 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Keeper
            </Link>
          </footer>
        </article>
      </main>

      {/* Minimal footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-stone-400 text-sm">
        © {new Date().getFullYear()} Keeper Platform. Built worth keeping.
      </footer>
    </div>
  );
}

