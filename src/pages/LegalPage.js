import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FaChevronDown, FaEnvelope, FaGlobe, FaMapMarkerAlt, FaArrowUp } from 'react-icons/fa';
import './LegalPage.css';

const LEGAL_DOCS = [
  { to: '/terms', label: 'Terms of Use' },
  { to: '/privacy', label: 'Privacy Policy' },
];

const EMAIL = /[A-Za-z0-9.+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Legal text with email addresses, the site address and cross-references linked. */
function RichText({ text, crossLinks = [] }) {
  const phrases = crossLinks.map((c) => c.phrase).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${[EMAIL.source, 'www\\.viewesta\\.com', ...phrases.map(escape)].join('|')})`, 'g');
  return text.split(pattern).map((part, i) => {
    if (i % 2 === 0) return part;
    if (EMAIL.test(part)) return <a key={i} href={`mailto:${part}`}>{part}</a>;
    if (part === 'www.viewesta.com') return <a key={i} href="https://www.viewesta.com" target="_blank" rel="noopener noreferrer">{part}</a>;
    const link = crossLinks.find((c) => c.phrase === part);
    return <Link key={i} to={link.to}>{part}</Link>;
  });
}

function ContactCard({ contact }) {
  return (
    <address className="legal-contact">
      <p className="legal-contact-name">{contact.name}</p>
      <p><FaEnvelope aria-hidden="true" /> <span className="legal-contact-label">Email</span> <a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <p><FaGlobe aria-hidden="true" /> <span className="legal-contact-label">Website</span> <a href={`https://${contact.website}`} target="_blank" rel="noopener noreferrer">{contact.website}</a></p>
      <p><FaMapMarkerAlt aria-hidden="true" /> <span className="legal-contact-label">Registered office</span> {contact.office.join(', ')}</p>
    </address>
  );
}

// Distance (px) the desktop contents list keeps from the top of the window, below the site header.
const TOC_TOP = 100;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Shared layout for the Terms of Use and Privacy Policy. `doc` is one of the
 * files in src/content/legal: { title, lastUpdated, intro, sections }.
 */
export default function LegalPage({ doc, crossLinks }) {
  const { hash } = useLocation();
  const [activeId, setActiveId] = useState(doc.sections[0]?.id);
  const [tocOpen, setTocOpen] = useState(false);
  const tocListRef = useRef(null);
  const tocRef = useRef(null);
  const layoutRef = useRef(null);

  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title} | Viewesta`;
    return () => { document.title = previous; };
  }, [doc.title]);

  // Deep links such as /terms#refunds. ScrollToTop resets to the top on navigation, so this runs after it.
  useEffect(() => {
    if (!hash) return undefined;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return undefined;
    const frame = requestAnimationFrame(() => target.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [hash, doc]);

  // Highlight the section being read in the contents list.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveId(visible[0].target.id);
    }, { rootMargin: '-100px 0px -60% 0px' });
    doc.sections.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [doc]);

  // Keep the contents list in view while reading (desktop). `position: sticky`
  // can't be used: the app's layout wrappers set overflow-x: hidden, which makes
  // them scroll containers, and switching them to `clip` would also pin the
  // movie/series heroes. So offset the list by how far the page has scrolled past it.
  useEffect(() => {
    const aside = tocRef.current;
    const layout = layoutRef.current;
    if (!aside || !layout) return undefined;
    const desktop = window.matchMedia('(min-width: 961px)');
    let current = 0;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!desktop.matches) {
        current = 0;
        aside.style.transform = '';
        return;
      }
      const naturalTop = aside.getBoundingClientRect().top - current;
      const room = layout.getBoundingClientRect().bottom - naturalTop - aside.offsetHeight;
      const next = Math.max(0, Math.min(TOC_TOP - naturalTop, room));
      if (next !== current) {
        current = next;
        aside.style.transform = next ? `translateY(${next}px)` : '';
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    desktop.addEventListener?.('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      desktop.removeEventListener?.('change', schedule);
    };
  }, [doc]);

  // Keep the highlighted entry visible inside the (scrollable) contents list.
  useEffect(() => {
    const list = tocListRef.current;
    const item = list?.querySelector(`[data-section="${activeId}"]`);
    if (!list || !item || list.scrollHeight <= list.clientHeight) return;
    const top = item.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - item.offsetHeight) {
      list.scrollTop = top - list.clientHeight / 3;
    }
  }, [activeId]);

  const goTo = (event, id) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    window.history.replaceState(window.history.state, '', `#${id}`);
    setActiveId(id);
    setTocOpen(false);
    // Scroll on the next frame, once the phone contents list has collapsed, so
    // the layout doesn't shift under the jump.
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const backToTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  return (
    <div className="legal-page">
      <header className="legal-hero">
        <nav className="legal-doc-switch" aria-label="Legal documents">
          {LEGAL_DOCS.map((d) => (
            <NavLink key={d.to} to={d.to} className={({ isActive }) => `legal-doc-link ${isActive ? 'active' : ''}`}>
              {d.label}
            </NavLink>
          ))}
        </nav>
        <h1 className="legal-hero-title">{doc.title}</h1>
        <p className="legal-hero-updated">Last updated: {doc.lastUpdated}</p>
      </header>

      <div className="legal-layout" ref={layoutRef}>
        <aside className="legal-toc" ref={tocRef}>
          <button
            type="button"
            className="legal-toc-toggle"
            aria-expanded={tocOpen}
            aria-controls="legal-toc-list"
            onClick={() => setTocOpen((open) => !open)}
          >
            <span>Contents <span className="legal-toc-count">({doc.sections.length} sections)</span></span>
            <FaChevronDown aria-hidden="true" className={`legal-toc-chevron ${tocOpen ? 'open' : ''}`} />
          </button>
          <nav aria-label={`${doc.title} contents`} className={`legal-toc-nav ${tocOpen ? 'open' : ''}`}>
            <p className="legal-toc-heading">On this page</p>
            <ol id="legal-toc-list" className="legal-toc-list" ref={tocListRef}>
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    data-section={s.id}
                    className={activeId === s.id ? 'active' : ''}
                    aria-current={activeId === s.id ? 'location' : undefined}
                    onClick={(e) => goTo(e, s.id)}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="legal-body">
          <div className="legal-intro">
            {doc.intro.map((p) => <p key={p}><RichText text={p} crossLinks={crossLinks} /></p>)}
          </div>

          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="legal-section" aria-labelledby={`${s.id}-title`}>
              <h2 id={`${s.id}-title`} className="legal-section-title">
                <a href={`#${s.id}`} onClick={(e) => goTo(e, s.id)}>{s.title}</a>
              </h2>
              {s.body.map((block, i) => {
                if (typeof block === 'string') return <p key={i}><RichText text={block} crossLinks={crossLinks} /></p>;
                if (block.subheading) return <h3 key={i} className="legal-subheading">{block.subheading}</h3>;
                if (block.contact) return <ContactCard key={i} contact={block.contact} />;
                return null;
              })}
            </section>
          ))}

          <footer className="legal-end">
            <p>
              See also:{' '}
              {LEGAL_DOCS.filter((d) => d.label !== doc.title).map((d) => <Link key={d.to} to={d.to}>{d.label}</Link>)}
            </p>
            <button type="button" className="legal-back-to-top" onClick={backToTop}>
              <FaArrowUp aria-hidden="true" /> Back to top
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}
