import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import '../pages/VerifyEmail.css';

export const CODE_LENGTH = 6;

/**
 * Six boxes for a numeric code. Controlled: `value` is the digits typed so far
 * (a string of up to 6 characters) and `onChange` receives the new string.
 * Typing moves on to the next box, Backspace goes back, and pasting or
 * auto-filling a whole code fills every box. `ref.focus()` focuses the first
 * empty box.
 */
const CodeInput = forwardRef(function CodeInput({ value, onChange, disabled = false, label = 'Verification code', autoFocus = false, id }, ref) {
  const boxes = useRef([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] || '');

  const focusBox = (index) => {
    const box = boxes.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))];
    if (box) {
      box.focus();
      box.select();
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => focusBox(Math.min(value.length, CODE_LENGTH - 1)),
  }));

  const commit = (next) => onChange(next.join('').slice(0, CODE_LENGTH));

  const handleChange = (index, raw) => {
    const clean = raw.replace(/\D/g, '');
    const next = [...digits];
    if (!clean) {
      next[index] = '';
      commit(next);
      return;
    }
    // Typing over a filled box, or an autofill of the whole code into one box.
    clean.slice(0, CODE_LENGTH - index).split('').forEach((d, i) => { next[index + i] = d; });
    commit(next);
    focusBox(index + clean.length);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      commit(next);
      focusBox(index - 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusBox(pasted.length);
  };

  return (
    <fieldset className="verify-code-fieldset" disabled={disabled}>
      <legend className="verify-code-legend">{label}</legend>
      <div className="verify-code-boxes" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            id={index === 0 ? id : undefined}
            ref={(el) => { boxes.current[index] = el; }}
            className="verify-code-box"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            maxLength={CODE_LENGTH}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            aria-label={`${label}, digit ${index + 1} of ${CODE_LENGTH}`}
          />
        ))}
      </div>
    </fieldset>
  );
});

export default CodeInput;
