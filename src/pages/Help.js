import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSearch, FaUser, FaPlay, FaCreditCard, FaWrench,
  FaChevronDown, FaChevronUp, FaEnvelope,
} from 'react-icons/fa';
import { useLocale } from '../context/LocaleContext';
import './Help.css';

const FAQ_EN = [
  {
    cat: 'Account & Profile',
    catKey: 'helpCatAccount',
    icon: <FaUser />,
    items: [
      { q: 'How do I reset my password?', a: 'Go to the login page and click "Forgot password?". Enter your email address and we will send you a reset link within a few minutes. Check your spam folder if you don\'t see it.' },
      { q: 'How do I update my profile picture?', a: 'Navigate to your Profile page, tap the camera icon on your avatar, then select a photo from your device. Changes are saved immediately.' },
      { q: 'Can I change my email address?', a: 'Yes. Open your Profile, enter edit mode, update your email, and save. You will receive a verification email at the new address.' },
      { q: 'How do I delete my account?', a: 'Please contact our support team via the Contact page. Account deletion requests are processed within 7 business days.' },
    ],
  },
  {
    cat: 'Streaming & Downloads',
    catKey: 'helpCatStreaming',
    icon: <FaPlay />,
    items: [
      { q: 'What video quality options are available?', a: 'Viewesta supports 480p, 720p, 1080p, and 4K (where available). Quality can be adjusted in your profile settings or directly in the video player.' },
      { q: 'How do I download content for offline viewing?', a: 'On any movie or series detail page, tap the Download button. Downloaded content appears in the Downloads section and is available for 30 days.' },
      { q: 'Why is my video buffering or stuttering?', a: 'Buffering is usually caused by a slow internet connection. Try lowering the video quality, restarting your router, or switching from Wi-Fi to mobile data (or vice versa).' },
      { q: 'On how many devices can I stream?', a: 'You can stream on up to 2 devices simultaneously with an active subscription.' },
    ],
  },
  {
    cat: 'Billing & Subscriptions',
    catKey: 'helpCatBilling',
    icon: <FaCreditCard />,
    items: [
      { q: 'How do I cancel my subscription?', a: 'Go to Profile → Subscriptions and tap "Cancel Subscription". Your access continues until the end of the current billing period.' },
      { q: 'Will I get a refund if I cancel?', a: 'We offer a 30-day money-back guarantee for new subscribers. Contact support with your account email to request a refund.' },
      { q: 'What payment methods are accepted?', a: 'We accept major credit/debit cards (Visa, Mastercard), mobile money, and Viewesta Wallet balance.' },
      { q: 'How does the Wallet work?', a: 'The Viewesta Wallet lets you top up credit and use it for pay-per-view content or subscription renewals. Top-ups never expire.' },
    ],
  },
  {
    cat: 'Technical Issues',
    catKey: 'helpCatTechnical',
    icon: <FaWrench />,
    items: [
      { q: 'The app is not loading. What should I do?', a: 'Try a hard refresh (Ctrl+Shift+R on desktop), clear your browser cache, or check your internet connection. If the issue persists, contact support.' },
      { q: 'Videos won\'t play in my browser. What\'s wrong?', a: 'Ensure your browser is up to date. Viewesta works best on Chrome, Firefox, Safari, and Edge. Disable browser extensions that may block content, then reload.' },
      { q: 'Subtitles are not showing correctly.', a: 'Open the video player, click the CC icon, and select your preferred subtitle language. If subtitles are missing entirely, the content may not have them available yet.' },
    ],
  },
];

const FAQ_FR = [
  {
    cat: `Compte et profil`,
    catKey: `helpCatAccount`,
    icon: <FaUser />,
    items: [
      { q: `Comment réinitialiser mon mot de passe ?`, a: `Rendez-vous sur la page de connexion et cliquez sur « Mot de passe oublié ». Saisissez votre adresse e-mail et nous vous enverrons un lien de réinitialisation. Vérifiez vos spams si vous ne le trouvez pas.` },
      { q: `Comment mettre à jour ma photo de profil ?`, a: `Accédez à votre page Profil, appuyez sur l’icône appareil photo sur votre avatar, puis sélectionnez une photo depuis votre appareil. Les modifications sont enregistrées immédiatement.` },
      { q: `Puis-je modifier mon adresse e-mail ?`, a: `Oui. Ouvrez votre Profil, activez le mode édition, mettez à jour votre e-mail et enregistrez. Vous recevrez un e-mail de vérification à la nouvelle adresse.` },
      { q: `Comment supprimer mon compte ?`, a: `Veuillez contacter notre équipe d’assistance via la page Contact. Les demandes de suppression sont traitées dans les 7 jours ouvrables.` },
    ],
  },
  {
    cat: `Streaming et téléchargements`,
    catKey: `helpCatStreaming`,
    icon: <FaPlay />,
    items: [
      { q: `Quelles qualités vidéo sont disponibles ?`, a: `Viewesta prend en charge la 480p, 720p, 1080p et la 4K (selon disponibilité). La qualité peut être ajustée dans les paramètres de profil ou directement dans le lecteur vidéo.` },
      { q: `Comment télécharger du contenu pour regarder hors connexion ?`, a: `Sur la page de détail d’un film ou d’une série, appuyez sur le bouton Télécharger. Le contenu téléchargé apparaît dans la section Téléchargements et est disponible pendant 30 jours.` },
      { q: `Pourquoi la vidéo met-elle en mémoire tampon ?`, a: `La mise en mémoire tampon est généralement causée par une connexion lente. Essayez de réduire la qualité de la vidéo, de redémarrer votre routeur ou de basculer entre Wi-Fi et données mobiles.` },
      { q: `Sur combien d’appareils puis-je regarder ?`, a: `Vous pouvez regarder simultanément sur jusqu’à 2 appareils avec un abonnement actif.` },
    ],
  },
  {
    cat: `Facturation et abonnements`,
    catKey: `helpCatBilling`,
    icon: <FaCreditCard />,
    items: [
      { q: `Comment annuler mon abonnement ?`, a: `Accédez à Profil → Abonnements et appuyez sur « Annuler l’abonnement ». Votre accès se poursuit jusqu’à la fin de la période de facturation en cours.` },
      { q: `Puis-je obtenir un remboursement si j’annule ?`, a: `Nous offrons une garantie de remboursement de 30 jours pour les nouveaux abonnés. Contactez le support avec votre e-mail de compte pour demander un remboursement.` },
      { q: `Quels moyens de paiement sont acceptés ?`, a: `Nous acceptons les principales cartes de crédit/débit (Visa, Mastercard), le mobile money et le solde du Portefeuille Viewesta.` },
      { q: `Comment fonctionne le Portefeuille ?`, a: `Le Portefeuille Viewesta vous permet de recharger du crédit et de l’utiliser pour du contenu à la séance ou pour renouveler votre abonnement. Les recharges n’expirent jamais.` },
    ],
  },
  {
    cat: `Problèmes techniques`,
    catKey: `helpCatTechnical`,
    icon: <FaWrench />,
    items: [
      { q: `L’application ne se charge pas. Que faire ?`, a: `Essayez un rechargement forcé (Ctrl+Maj+R sur ordinateur), videz le cache de votre navigateur ou vérifiez votre connexion. Si le problème persiste, contactez le support.` },
      { q: `Les vidéos ne se lisent pas dans mon navigateur.`, a: `Assurez-vous que votre navigateur est à jour. Viewesta fonctionne mieux sur Chrome, Firefox, Safari et Edge. Désactivez les extensions susceptibles de bloquer le contenu, puis rechargez.` },
      { q: `Les sous-titres ne s’affichent pas correctement.`, a: `Dans le lecteur vidéo, cliquez sur l’icône CC et sélectionnez la langue souhaitée. Si les sous-titres sont totalement absents, ils ne sont peut-être pas encore disponibles pour ce contenu.` },
    ],
  },
];


export default function Help() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  const allFaqs = locale === 'fr' ? FAQ_FR : FAQ_EN;

  const filtered = allFaqs
    .map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(section =>
      (activeCategory === null || section.catKey === activeCategory) &&
      section.items.length > 0
    );

  const toggle = (key) => setOpenItem(prev => (prev === key ? null : key));

  return (
    <div className="help-page">

      {/* Hero */}
      <div className="help-hero">
        <h1 className="help-hero-title">{t('helpTitle')}</h1>
        <p className="help-hero-sub">{t('helpSubtitle')}</p>
        <div className="help-search-wrap">
          <FaSearch className="help-search-icon" />
          <input
            className="help-search-input"
            type="text"
            placeholder={t('helpSearchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
          />
          {search && (
            <button className="help-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      <div className="help-container layout-container">

        {/* Category Pills */}
        {!search && (
          <div className="help-cats">
            {allFaqs.map(section => (
              <button
                key={section.catKey}
                className={`help-cat-pill ${activeCategory === section.catKey ? 'active' : ''}`}
                onClick={() => setActiveCategory(prev => prev === section.catKey ? null : section.catKey)}
              >
                <span className="help-cat-icon">{section.icon}</span>
                {t(section.catKey)}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Sections */}
        {filtered.length === 0 ? (
          <div className="help-empty">
            <FaSearch className="help-empty-icon" />
            <p>{locale === 'fr' ? 'Aucun résultat trouvé pour ' : 'No results for '}<strong>«{search}»</strong></p>
          </div>
        ) : (
          filtered.map(section => (
            <div key={section.catKey} className="help-section">
              <div className="help-section-header">
                <span className="help-section-icon">{section.icon}</span>
                <h2 className="help-section-title">{section.cat}</h2>
              </div>
              <div className="help-accordion">
                {section.items.map((item, i) => {
                  const key = `${section.catKey}-${i}`;
                  const open = openItem === key;
                  return (
                    <div key={key} className={`help-item ${open ? 'open' : ''}`}>
                      <button className="help-item-q" onClick={() => toggle(key)}>
                        <span>{item.q}</span>
                        {open ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                      {open && <div className="help-item-a">{item.a}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* CTA */}
        <div className="help-cta">
          <FaEnvelope className="help-cta-icon" />
          <div>
            <strong>{t('helpStillNeedHelp')}</strong>
            <p>{locale === 'fr' ? 'Notre équipe est disponible pour vous aider.' : 'Our team is available and happy to help.'}</p>
          </div>
          <Link to="/contact" className="btn btn-primary help-cta-btn">{t('helpContactBtn')}</Link>
        </div>

      </div>
    </div>
  );
}
