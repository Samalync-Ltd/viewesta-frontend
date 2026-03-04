import React, { useState } from 'react';
import { FaEnvelope, FaClock, FaHeadset, FaCheckCircle } from 'react-icons/fa';
import { useLocale } from '../context/LocaleContext';
import './Contact.css';

export default function Contact() {
  const { t } = useLocale();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  const infoCards = [
    { icon: <FaEnvelope />, label: t('contactEmailCard'), value: t('contactEmailValue') },
    { icon: <FaClock />,    label: t('contactResponseCard'), value: t('contactResponseValue') },
    { icon: <FaHeadset />,  label: t('contactHoursCard'),   value: t('contactHoursValue') },
  ];

  return (
    <div className="contact-page">

      {/* Header */}
      <div className="contact-hero">
        <h1 className="contact-hero-title">{t('contactTitle')}</h1>
        <p className="contact-hero-sub">{t('contactDesc')}</p>
      </div>

      <div className="contact-container layout-container">

        {/* Info Cards */}
        <div className="contact-info-row">
          {infoCards.map(card => (
            <div key={card.label} className="contact-info-card">
              <div className="contact-info-icon">{card.icon}</div>
              <div>
                <div className="contact-info-label">{card.label}</div>
                <div className="contact-info-value">{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Form / Success */}
        {sent ? (
          <div className="contact-success">
            <FaCheckCircle className="contact-success-icon" />
            <h2>{t('contactSuccessTitle')}</h2>
            <p>{t('contactSuccessDesc')}</p>
            <button className="btn btn-primary" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
              {t('locale') === 'fr' ? 'Envoyer un autre message' : 'Send another message'}
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-form-row">
              <div className="form-group">
                <label htmlFor="contact-name">{t('contactNameLabel')}</label>
                <input
                  id="contact-name" name="name" type="text" required
                  placeholder={t('contactNamePlaceholder')}
                  value={form.name} onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">{t('auth.email')}</label>
                <input
                  id="contact-email" name="email" type="email" required
                  placeholder={t('contactEmailPlaceholder')}
                  value={form.email} onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="contact-subject">{t('contactSubjectLabel')}</label>
              <input
                id="contact-subject" name="subject" type="text" required
                placeholder={t('contactSubjectPlaceholder')}
                value={form.subject} onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">{t('contactMessageLabel')}</label>
              <textarea
                id="contact-message" name="message" rows={6} required
                placeholder={t('contactMessagePlaceholder')}
                value={form.message} onChange={handleChange}
              />
            </div>
            <button type="submit" className="btn btn-primary contact-submit-btn">
              {t('contactSendBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
