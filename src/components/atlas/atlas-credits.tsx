"use client";

import { ExternalLink } from "lucide-react";

export function AtlasCredits() {
  return (
    <footer className="atlas-credits" aria-label="Credits">
      <span>Built with</span>
      <span className="credits-heart" role="img" aria-label="love">💛</span>
      <span>by</span>
      <a
        href="https://www.diogo-catarino.xyz/"
        target="_blank"
        rel="noopener noreferrer"
        className="credits-link"
        title="Visit Diogo Catarino's personal page"
      >
        diocata
      </a>
      <span className="credits-divider" aria-hidden="true" />
      <a
        href="https://www.linkedin.com/in/diogo-catarino/"
        target="_blank"
        rel="noopener noreferrer"
        className="credits-social"
        title="Connect on LinkedIn"
        aria-label="LinkedIn profile"
      >
        <span>LinkedIn</span>
        <ExternalLink size={10} aria-hidden="true" />
      </a>
    </footer>
  );
}
