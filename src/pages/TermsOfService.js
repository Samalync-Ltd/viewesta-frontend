import React from 'react';
import LegalPage from './LegalPage';
import TERMS_OF_USE from '../content/legal/termsOfUse';

const CROSS_LINKS = [
  { phrase: 'Viewesta Privacy Policy', to: '/privacy' },
  { phrase: 'Privacy Policy', to: '/privacy' },
];

export default function TermsOfService() {
  return <LegalPage doc={TERMS_OF_USE} crossLinks={CROSS_LINKS} />;
}
