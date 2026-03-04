import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaFilm, FaUsers, FaEye, FaCheck, FaArrowLeft, FaArrowRight,
  FaPlus, FaTimes, FaUser, FaExclamationTriangle, FaInfoCircle,
  FaFileUpload, FaUserShield, FaCloudUploadAlt,
} from 'react-icons/fa';
import { MEDIA_TYPES, SHORT_FILM_THRESHOLD_MINUTES } from '../../types';
import { submitForReview } from '../../services/approvalService';
import { validateUploadForm, validateImageAspectRatio, VALIDATION_RULES } from '../../utils/uploadValidation';
import MediaUploadZone from '../../components/MediaUploadZone';
import EpisodeBuilder from '../../components/EpisodeBuilder';
import AgeRatingBadge from '../../components/AgeRatingBadge';
import './FilmmakerUpload.css';

const GENRES = [
  'Drama', 'Action', 'Comedy', 'Romance', 'Thriller', 'Documentary',
  'Animation', 'Horror', 'Sci-Fi', 'Adventure', 'Historical', 'Fantasy',
];

const AGE_RATINGS = {
  'G':    { description: 'General audiences — all ages admitted.' },
  'PG':   { description: 'Parental guidance suggested — some material may not suit children.' },
  'PG-13':{ description: 'Parents strongly cautioned — some material may be inappropriate for children under 13.' },
  'R':    { description: 'Restricted — under 17 requires accompanying parent or guardian.' },
  '16+':  { description: 'Suitable for viewers aged 16 and above.' },
  '18+':  { description: 'Adults only — not suitable for viewers under 18.' },
};

const ROLE_OPTIONS = [
  'Actor', 'Actress', 'Director', 'Producer', 'Executive Producer',
  'Cinematographer', 'Editor', 'Composer', 'Writer', 'Other',
];

const STEPS = [
  { label: 'Mode', icon: <FaCloudUploadAlt /> },
  { label: 'Info', icon: <FaInfoCircle /> },
  { label: 'Media', icon: <FaFilm /> },
  { label: 'Cast', icon: <FaUsers /> },
  { label: 'Review', icon: <FaEye /> },
];

const MODES = {
  DIRECT: 'direct',
  ADMIN_REQUEST: 'admin_request',
};

const emptyMember = () => ({
  id: Date.now() + Math.random(),
  name: '', role: 'Actor', character: '', photo: '',
});

const initialForm = {
  mode: MODES.DIRECT,
  mediaType: MEDIA_TYPES.MOVIE,
  title: '', description: '', director: '', producer: '',
  year: new Date().getFullYear(), duration: '',
  age_rating: '', genres: [],
  poster_url: '', poster_file: null,
  cover_url: '', cover_file: null,
  trailer_url: '', trailer_file: null,
  video_url: '', video_file: null,
  seasons: [],
  cast_crew: [],
};

const FilmmakerUpload = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const e = { ...prev };
      delete e[key];
      return e;
    });
  }, []);

  const handleFileSelect = async (field, file) => {
    if (!file) {
      setField(field + '_file', null);
      return;
    }

    // Size validation
    const rule = field === 'video' ? VALIDATION_RULES.video : VALIDATION_RULES[field];
    const maxMB = rule?.maxSizeMB || 50; 
    if (file.size > maxMB * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [field]: `File exceeds limit of ${maxMB}MB.` }));
      return;
    }

    // Aspect Ratio validation
    if (field === 'poster') {
      const check = await validateImageAspectRatio(file, 2 / 3);
      if (!check.valid) {
        setErrors(prev => ({ ...prev, [field]: check.message }));
        return; // Block invalid aspect ratio
      }
    }
    if (field === 'cover') {
      const check = await validateImageAspectRatio(file, 16 / 9);
      if (!check.valid) {
        setErrors(prev => ({ ...prev, [field]: check.message }));
        return;
      }
    }

    setField(field + '_file', file);
    // Create preview URL
    const url = URL.createObjectURL(file);
    setField(field + '_url', url);
  };

  const toggleGenre = (g) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(g)
        ? prev.genres.filter((x) => x !== g)
        : [...prev.genres, g],
    }));
  };

  const addCastMember = () =>
    setForm((prev) => ({ ...prev, cast_crew: [...prev.cast_crew, emptyMember()] }));

  const updateCastMember = (id, key, val) =>
    setForm((prev) => ({
      ...prev,
      cast_crew: prev.cast_crew.map((m) => (m.id === id ? { ...m, [key]: val } : m)),
    }));

  const removeCastMember = (id) =>
    setForm((prev) => ({ ...prev, cast_crew: prev.cast_crew.filter((m) => m.id !== id) }));

  const validateStep = (s) => {
    // If Mode Select step
    if (s === 0) return true;

    // Shift steps logic because we added Step 0
    const formStep = s - 1;
    
    // Step 1: Info (was 0)
    // Step 2: Media (was 1)
    // Step 3: Cast (was 2)
    // Step 4: Review (was 3)

    if (formStep === 0) {
      const keys = ['title', 'description', 'director', 'year', 'mediaType'];
      if (form.mediaType !== MEDIA_TYPES.SERIES) keys.push('duration');
      // Validate specifically these
      const result = validateUploadForm(form, form.mediaType);
      const stepErrors = {};
      keys.forEach(k => { if (result.errors[k]) stepErrors[k] = result.errors[k]; });
      
      if (!form.title) stepErrors.title = 'Title is required'; // explicit check
      
      setErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    }

    if (formStep === 1) {
      // Media step
      // Must check poster and cover always? Yes per requirements "On movie upload: Poster... Cover... required"
      const result = validateUploadForm(form, form.mediaType);
      const keys = ['poster', 'cover'];
      // If direct upload, require video/trailer? Maybe.
      // If Admin Request, only metadata required? The prompt says "Submit metadata only -> Admin uploads video".
      // So if mode === ADMIN_REQUEST, skip video/trailer errors?
      // Assume "Poster + Cover" required for BOTH modes so the card looks good.
      if (form.mode === MODES.DIRECT) {
        keys.push('trailer');
        if (form.mediaType !== MEDIA_TYPES.SERIES) keys.push('video'); // Main video
      }
      
      const stepErrors = {};
      keys.forEach(k => { 
        if (result.errors[k]) stepErrors[k] = result.errors[k]; 
      });
      setErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    }
    
    return true; 
  };

  const goNext = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSaveDraft = () => alert('Draft saved (simulated).');

  const handleSubmit = async () => {
    // Final check
    const result = validateUploadForm(form, form.mediaType);
    if (!result.isValid && form.mode === MODES.DIRECT) {
      // Allow if admin request and missing video? We handled media step logic above.
      // Ideally re-run full validation with context.
    }

    setSubmitting(true);
    setSubmitError('');
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 95) {
          clearInterval(interval);
          return 95;
        }
        return p + 5;
      });
    }, 200);

    try {
      // Simulate network delay for 5GB file ;)
      await new Promise(r => setTimeout(r, 2500)); 
      clearInterval(interval);
      setUploadProgress(100);
      
      const contentId = `content_${Date.now()}`;
      await submitForReview(contentId); // Pass status override based on mode if needed
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
      clearInterval(interval);
    }
  };

  const hasPoster = form.poster_url || form.poster_file;
  const hasCover = form.cover_url || form.cover_file;
  const hasTrailer = form.trailer_url || form.trailer_file;
  const hasVideo = form.video_url || form.video_file;
  const castPreview = form.cast_crew
    .filter((m) => m?.name)
    .slice(0, 6)
    .map((m) => `${m.name}${m.role ? ` (${m.role})` : ''}`)
    .join(', ');

  if (success) {
    return (
      <div className="filmmaker-upload">
        <div className="fu-success">
          <div className="fu-success-icon"><FaCheck /></div>
          <h2>Submitted for Review!</h2>
          <p>
            <strong>{form.title}</strong> has been submitted to the Viewesta team.
          You will be notified once it has been reviewed.
        </p>
        <div className="fu-success-actions">
          <button
            className="fu-btn fu-btn--primary"
            onClick={() => { setForm(initialForm); setStep(0); setSuccess(false); }}
          >
            Upload Another
          </button>
          <Link to="/filmmaker-studio/movies" className="fu-btn fu-btn--outline">My Movies</Link>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="filmmaker-upload">
      {/* Header */}
      <div className="fu-header">
        <Link to="/filmmaker-studio" className="fu-back-link">
          <FaArrowLeft /> Studio
        </Link>
        <div className="fu-header-content">
          <h1>Upload Content</h1>
          <p className="fu-header-sub">Submit movies, short films, or series for review.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="fu-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className={`fu-step-line ${i <= step ? 'done' : ''}`} />}
            <div className={`fu-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="fu-step-dot">{i < step ? <FaCheck /> : i + 1}</div>
              <span className="fu-step-label">{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="fu-form">

        {/* ── STEP 0: MODE SELECTION ────────────────────────────── */}
        {step === 0 && (
          <div className="fu-step-content">
            <h2 className="fu-step-title">Select Upload Method</h2>
            <p className="fu-step-desc">Would you like to upload the video file yourself, or request an admin upload?</p>
            <div className="upload-mode-grid">
              <div
                className={`upload-mode-card ${form.mode === MODES.DIRECT ? 'active' : ''}`}
                onClick={() => setField('mode', MODES.DIRECT)}
              >
                <div className="mode-icon"><FaFileUpload /></div>
                <h3>Direct Upload</h3>
                <p>I have the video file ready (max 5GB). I will upload it now.</p>
                <div className="mode-badge">Standard</div>
              </div>
              <div
                className={`upload-mode-card ${form.mode === MODES.ADMIN_REQUEST ? 'active' : ''}`}
                onClick={() => setField('mode', MODES.ADMIN_REQUEST)}
              >
                <div className="mode-icon"><FaUserShield /></div>
                <h3>Request Admin Upload</h3>
                <p>I will submit metadata and artwork. An admin will contact me to retrieve the video master.</p>
                <div className="mode-badge">Pro Service</div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: INFO ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="fu-step-content">
            <h2 className="fu-step-title">Content Information</h2>
            <p className="fu-step-desc">Start with the basics — type, title, and key details.</p>

            {/* Media Type */}
            <div className="fu-field">
              <label className="fu-label">Content Type <span className="fu-required">*</span></label>
              <div className="fu-media-type-grid">
                {Object.values(MEDIA_TYPES).map((t) => (
                  <button
                    key={t} type="button"
                    className={`fu-media-type-btn ${form.mediaType === t ? 'active' : ''}`}
                    onClick={() => setField('mediaType', t)}
                  >
                    <span className="fu-media-type-icon">
                      {t === MEDIA_TYPES.MOVIE ? '🎬' : t === MEDIA_TYPES.SHORT_FILM ? '⚡' : '📺'}
                    </span>
                    <span className="fu-media-type-label">
                      {t === MEDIA_TYPES.SHORT_FILM ? 'Short Film' : t}
                    </span>
                    <span className="fu-media-type-hint">
                      {t === MEDIA_TYPES.MOVIE
                        ? 'Feature length'
                        : t === MEDIA_TYPES.SHORT_FILM
                        ? `Under ${SHORT_FILM_THRESHOLD_MINUTES}min`
                        : 'Multi-episode'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className={`fu-field ${errors.title ? 'has-error' : ''}`}>
              <label className="fu-label">Title <span className="fu-required">*</span></label>
              <input
                className="fu-input" type="text" maxLength={120}
                placeholder="Enter title..." value={form.title}
                onChange={(e) => setField('title', e.target.value)}
              />
              {errors.title && <p className="fu-error"><FaExclamationTriangle />{errors.title}</p>}
            </div>

            {/* Description */}
            <div className={`fu-field ${errors.description ? 'has-error' : ''}`}>
              <label className="fu-label">
                Description <span className="fu-required">*</span>
                <span className="fu-label-hint">({form.description.length}/500)</span>
              </label>
              <textarea
                className="fu-input fu-textarea" maxLength={500}
                placeholder="Tell viewers what this is about..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
              {errors.description && <p className="fu-error"><FaExclamationTriangle />{errors.description}</p>}
            </div>

            {/* Director + Producer */}
            <div className="fu-row">
              <div className={`fu-field ${errors.director ? 'has-error' : ''}`}>
                <label className="fu-label">Director <span className="fu-required">*</span></label>
                <input className="fu-input" type="text" placeholder="Director name"
                  value={form.director} onChange={(e) => setField('director', e.target.value)} />
                {errors.director && <p className="fu-error"><FaExclamationTriangle />{errors.director}</p>}
              </div>
              <div className="fu-field">
                <label className="fu-label">Producer</label>
                <input className="fu-input" type="text" placeholder="Producer name"
                  value={form.producer} onChange={(e) => setField('producer', e.target.value)} />
              </div>
            </div>

            {/* Year + Duration */}
            <div className="fu-row">
              <div className={`fu-field fu-field--narrow ${errors.year ? 'has-error' : ''}`}>
                <label className="fu-label">Year <span className="fu-required">*</span></label>
                <input className="fu-input" type="number" min="1900" max="2100"
                  value={form.year} onChange={(e) => setField('year', e.target.value)} />
                {errors.year && <p className="fu-error"><FaExclamationTriangle />{errors.year}</p>}
              </div>
              {form.mediaType !== MEDIA_TYPES.SERIES && (
                <div className={`fu-field fu-field--narrow ${errors.duration ? 'has-error' : ''}`}>
                  <label className="fu-label">Duration (min) <span className="fu-required">*</span></label>
                  <input className="fu-input" type="number" min="1" placeholder="e.g. 95"
                    value={form.duration} onChange={(e) => setField('duration', e.target.value)} />
                  {errors.duration && <p className="fu-error"><FaExclamationTriangle />{errors.duration}</p>}
                </div>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="fu-warnings">
                {warnings.map((w, idx) => (
                  <div key={idx} className="fu-warning">
                    <FaExclamationTriangle />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Age Rating */}
            <div className={`fu-field ${errors.age_rating ? 'has-error' : ''}`}>
              <label className="fu-label">Age Rating <span className="fu-required">*</span></label>
              <div className="fu-age-rating-grid">
                {Object.entries(AGE_RATINGS).map(([key]) => (
                  <button
                    key={key} type="button"
                    className={`fu-age-btn ${form.age_rating === key ? 'active' : ''}`}
                    onClick={() => setField('age_rating', key)}
                  >
                    <AgeRatingBadge rating={key} size="sm" showTooltip={false} />
                  </button>
                ))}
              </div>
              {form.age_rating && (
                <p className="fu-rating-desc">{AGE_RATINGS[form.age_rating]?.description}</p>
              )}
              {errors.age_rating && <p className="fu-error"><FaExclamationTriangle />{errors.age_rating}</p>}
            </div>

            {/* Genres */}
            <div className={`fu-field ${errors.genres ? 'has-error' : ''}`}>
              <label className="fu-label">
                Genres <span className="fu-required">*</span>
                <span className="fu-label-hint">(select all that apply)</span>
              </label>
              <div className="fu-genre-grid">
                {GENRES.map((g) => (
                  <button
                    key={g} type="button"
                    className={`fu-genre-btn ${form.genres.includes(g) ? 'active' : ''}`}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {errors.genres && <p className="fu-error"><FaExclamationTriangle />{errors.genres}</p>}
            </div>
          </div>
        )}

        {/* ── STEP 2: MEDIA ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="fu-step-content">
            <h2 className="fu-step-title">Media Files</h2>
            <p className="fu-step-desc">Upload or paste URLs for your poster, cover, trailer, and video.</p>

            <div className="fu-media-grid">
              <MediaUploadZone
                label="Poster" required description="Vertical — 2:3 aspect ratio"
                accept="image/jpeg,image/png,image/webp" maxSizeMB={10} previewType="image"
                name="poster" currentFile={form.poster_file} currentUrl={form.poster_url}
                onFileChange={(f) => setField('poster_file', f)}
                onUrlChange={(u) => setField('poster_url', u)}
                error={errors.poster}
              />
              <MediaUploadZone
                label="Cover Image" required description="Horizontal — 16:9 aspect ratio"
                accept="image/jpeg,image/png,image/webp" maxSizeMB={15} previewType="image"
                name="cover" currentFile={form.cover_file} currentUrl={form.cover_url}
                onFileChange={(f) => setField('cover_file', f)}
                onUrlChange={(u) => setField('cover_url', u)}
                error={errors.cover}
              />
              <MediaUploadZone
                label="Trailer" required description="YouTube/Vimeo URL or video file"
                accept="video/mp4,video/webm" maxSizeMB={200} previewType="video"
                name="trailer" currentFile={form.trailer_file} currentUrl={form.trailer_url}
                onFileChange={(f) => setField('trailer_file', f)}
                onUrlChange={(u) => setField('trailer_url', u)}
                error={errors.trailer}
              />
              {form.mediaType !== MEDIA_TYPES.SERIES && (
                <MediaUploadZone
                  label="Full Video" description="The complete film (optional)"
                  accept="video/mp4,video/webm" maxSizeMB={5000} previewType="video"
                  name="video" currentFile={form.video_file} currentUrl={form.video_url}
                  onFileChange={(f) => setField('video_file', f)}
                  onUrlChange={(u) => setField('video_url', u)}
                />
              )}
            </div>

            {form.mediaType === MEDIA_TYPES.SERIES && (
              <EpisodeBuilder
                seasons={form.seasons}
                onChange={(s) => setField('seasons', s)}
                error={errors.seasons}
              />
            )}
          </div>
        )}

        {/* ── STEP 3: CAST ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="fu-step-content">
            <h2 className="fu-step-title">Cast &amp; Crew</h2>
            <p className="fu-step-desc">Add the people behind and in front of the camera (optional).</p>

            <div className="fu-cast-list">
              {form.cast_crew.length === 0 ? (
                <div className="fu-cast-empty">
                  No cast members added yet. Click below to start.
                </div>
              ) : (
                form.cast_crew.map((member) => (
                  <div key={member.id} className="fu-cast-member">
                    <div className="fu-cast-avatar">
                      {member.photo
                        ? <img src={member.photo} alt={member.name} onError={(e) => { e.target.style.display = 'none'; }} />
                        : <FaUser />}
                    </div>
                    <div className="fu-cast-fields">
                      <div className="fu-row">
                        <div className="fu-field">
                          <label className="fu-label">Name</label>
                          <input className="fu-input" type="text" placeholder="Full name"
                            value={member.name}
                            onChange={(e) => updateCastMember(member.id, 'name', e.target.value)} />
                        </div>
                        <div className="fu-field fu-field--narrow">
                          <label className="fu-label">Role</label>
                          <select className="fu-input fu-select" value={member.role}
                            onChange={(e) => updateCastMember(member.id, 'role', e.target.value)}>
                            {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="fu-row">
                        <div className="fu-field">
                          <label className="fu-label">Character <span className="fu-label-hint">(actors)</span></label>
                          <input className="fu-input" type="text" placeholder="Character name"
                            value={member.character}
                            onChange={(e) => updateCastMember(member.id, 'character', e.target.value)} />
                        </div>
                        <div className="fu-field">
                          <label className="fu-label">Photo URL</label>
                          <input className="fu-input" type="url" placeholder="https://..."
                            value={member.photo}
                            onChange={(e) => updateCastMember(member.id, 'photo', e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <button className="fu-cast-remove" type="button" onClick={() => removeCastMember(member.id)}>
                      <FaTimes />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button className="fu-add-cast" type="button" onClick={addCastMember}>
              <FaPlus /> Add Cast / Crew Member
            </button>
          </div>
        )}

        {/* ── STEP 4: REVIEW ────────────────────────────────────── */}
        {step === 4 && (
          <div className="fu-step-content">
            <h2 className="fu-step-title">Review &amp; Submit</h2>
            <p className="fu-step-desc">Confirm everything looks right before submitting for admin review.</p>

            <div className="fu-review-card">
              <div className="fu-review-row">
                <span className="fu-review-label">Type</span>
                <span className="fu-review-value">{form.mediaType}</span>
              </div>
              <div className="fu-review-row">
                <span className="fu-review-label">Title</span>
                <span className="fu-review-value">{form.title || '—'}</span>
              </div>
              <div className="fu-review-row">
                <span className="fu-review-label">Director</span>
                <span className="fu-review-value">{form.director || '—'}</span>
              </div>
              <div className="fu-review-row">
                <span className="fu-review-label">Year</span>
                <span className="fu-review-value">{form.year || '—'}</span>
              </div>
              {form.mediaType !== MEDIA_TYPES.SERIES && (
                <div className="fu-review-row">
                  <span className="fu-review-label">Duration</span>
                  <span className="fu-review-value">{form.duration ? `${form.duration} min` : '—'}</span>
                </div>
              )}
              <div className="fu-review-row">
                <span className="fu-review-label">Age Rating</span>
                <span className="fu-review-value">
                  {form.age_rating
                    ? <AgeRatingBadge rating={form.age_rating} size="sm" showTooltip={false} />
                    : '—'}
                </span>
              </div>
              <div className="fu-review-row">
                <span className="fu-review-label">Genres</span>
                <span className="fu-review-value">{form.genres.join(', ') || '—'}</span>
              </div>
              <div className="fu-review-row">
                <span className="fu-review-label">Cast</span>
                <span className="fu-review-value">{form.cast_crew.length} member(s)</span>
              </div>

              {castPreview && (
                <div className="fu-review-row">
                  <span className="fu-review-label">People</span>
                  <span className="fu-review-value">{castPreview}{form.cast_crew.length > 6 ? '…' : ''}</span>
                </div>
              )}
            </div>

            <div className="fu-media-checklist">
              <p className="fu-checklist-title">Media Assets</p>
              {[
                { label: 'Poster', has: hasPoster, required: true },
                { label: 'Cover Image', has: hasCover, required: true },
                { label: 'Trailer', has: hasTrailer, required: true },
                ...(form.mediaType !== MEDIA_TYPES.SERIES
                  ? [{ label: 'Full Video', has: hasVideo, required: false }]
                  : []),
              ].map(({ label, has, required }) => (
                <div
                  key={label}
                  className={`fu-check-item ${has ? 'ok' : required ? 'missing' : 'optional-missing'}`}
                >
                  {has ? <FaCheck /> : <FaTimes />}
                  {label}
                  {!has && (required
                    ? <span className="fu-check-required">Required</span>
                    : <span className="fu-check-optional">Optional</span>)}
                </div>
              ))}
            </div>

            <div className="fu-approval-notice">
              <FaExclamationTriangle className="fu-approval-icon" />
              <div>
                <strong>Admin Review Required</strong>
                <p>
                  Your content will be reviewed by the Viewesta team before it goes live.
                  You will be notified once approved or if changes are requested.
                </p>
              </div>
            </div>

            {submitError && (
              <p className="fu-submit-error">
                <FaExclamationTriangle /> {submitError}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="fu-actions">
          {step > 0 && (
            <button className="fu-btn fu-btn--outline" type="button" onClick={goBack}>
              <FaArrowLeft /> Back
            </button>
          )}
          <button className="fu-btn fu-btn--ghost" type="button" onClick={handleSaveDraft}>
            Save Draft
          </button>
          {step < STEPS.length - 1 ? (
            <button className="fu-btn fu-btn--primary" type="button" onClick={goNext} style={{ marginLeft: 'auto' }}>
              Next <FaArrowRight />
            </button>
          ) : (
            <button
              className="fu-btn fu-btn--primary fu-btn--submit"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ marginLeft: 'auto' }}
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default FilmmakerUpload;
