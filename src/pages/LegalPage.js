import React from 'react';
import { Link } from 'react-router-dom';
import { FaInfoCircle } from 'react-icons/fa';
import './LegalPage.css';

/**
 * Shared layout for Terms of Service / Privacy Policy.
 * Section bodies are intentionally left as placeholders — real legal copy
 * has not been provided yet. Structure and routing are ready so the actual
 * text can be dropped into `sections` (in TermsOfService.js / PrivacyPolicy.js)
 * without any further layout work.
 */
export default function LegalPage({ title, sections }) {
  return (
    <div className="legal-page">
      <div className="legal-hero">
        <h1 className="legal-hero-title">{title}</h1>
        <p className="legal-hero-sub">Last updated: pending</p>
      </div>

      <div className="legal-container">
        <div className="legal-pending-notice">
          <FaInfoCircle className="legal-pending-icon" />
          <div>
            <p>This page is a placeholder — the final {title.toLowerCase()} text hasn't been published yet.</p>
            <p>The section structure below reflects what will be filled in. Nothing here should be treated as binding until real content replaces it.</p>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2 className="legal-section-title">{section.heading}</h2>
            <p className="legal-section-body">Content pending.</p>
          </section>
        ))}

        <div className="legal-cta">
          <p>Questions in the meantime? Reach out and we'll help directly.</p>
          <Link to="/contact" className="btn btn-primary">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
