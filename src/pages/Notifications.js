import React from 'react';
import { useLocale } from '../context/LocaleContext';
import './Notifications.css';

export default function Notifications() {
  const { t } = useLocale();

  return (
    <div className="notifications-page layout-container">
      <h1>{t('notifications')}</h1>
      <div className="notifications-placeholder">
        <p>No notifications yet. (Mock list will load from API when ready.)</p>
      </div>
    </div>
  );
}
