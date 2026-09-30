import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import './EditProfile.css';

// PUT /auth/profile takes first_name and last_name (there is no single `name` field).
export default function EditProfile() {
  const { user, updateProfile } = useAuth();
  const { t } = useLocale();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });
  const [status, setStatus] = useState(null); // { ok: boolean, message: string }
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
    });
    setSaving(false);
    setStatus(result?.success
      ? { ok: true, message: 'Profile updated.' }
      : { ok: false, message: result?.error || "Your changes couldn't be saved. Please try again." });
  };

  if (!user) {
    return (
      <div className="edit-profile-page layout-container">
        <p>Please sign in to edit your profile.</p>
        <Link to="/login" className="btn btn-primary">{t('signIn')}</Link>
      </div>
    );
  }

  return (
    <div className="edit-profile-page layout-container">
      <h1>{t('editProfile')}</h1>
      {status && (
        <p className={status.ok ? 'edit-profile-success' : 'edit-profile-error'} role={status.ok ? 'status' : 'alert'}>
          {status.message}
        </p>
      )}
      <form onSubmit={handleSubmit} className="edit-profile-form">
        <div className="form-group">
          <label htmlFor="edit-first-name">First name</label>
          <input
            id="edit-first-name"
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-last-name">Last name</label>
          <input
            id="edit-last-name"
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
      <p className="edit-profile-back">
        <Link to="/profile">← Back to profile</Link>
      </p>
    </div>
  );
}
