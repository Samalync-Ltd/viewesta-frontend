import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ResetPassword, { extractResetToken } from './ResetPassword';
import ForgotPassword from './ForgotPassword';
import { requestPasswordReset, resetPassword, verifyResetCode } from '../utils/apiClient';

const mockNavigate = jest.fn();

// CRA's Jest cannot load react-router v7's `react-router/dom` entry, so the router is stubbed.
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { email: 'sam@example.com', expiresInMinutes: 15 } }),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('../context/LocaleContext', () => ({
  useLocale: () => ({
    t: (key) => key,
    tx: (text, vars) => (vars ? text.replace(/\{\{(\w+)\}\}/g, (_, n) => String(vars[n])) : text),
  }),
}));
jest.mock('../utils/apiClient', () => ({ requestPasswordReset: jest.fn(), resetPassword: jest.fn(), verifyResetCode: jest.fn() }));

const TOKEN = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';

const fill = ({ code = '123456', password = 'NewPass123!', confirm = password } = {}) => {
  if (code) fireEvent.change(screen.getByLabelText(/Verification code, digit 1/), { target: { value: code } });
  fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: confirm } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

beforeEach(() => {
  mockNavigate.mockReset();
  requestPasswordReset.mockResolvedValue({ data: { data: { expires_in_minutes: 15 } } });
  verifyResetCode.mockResolvedValue({ data: { success: true, data: { reset_token: TOKEN } } });
});

describe('ResetPassword (code screen)', () => {
  it('checks the code, then resets with the token it returns', async () => {
    resetPassword.mockResolvedValue({ data: { success: true } });
    render(<ResetPassword />);
    fill();
    submit();
    await screen.findByText('Password updated');
    expect(verifyResetCode).toHaveBeenCalledWith({ email: 'sam@example.com', code: '123456' });
    expect(resetPassword).toHaveBeenCalledWith({ token: TOKEN, password: 'NewPass123!' });
  });

  it('never sends the 6-digit code to /auth/reset (the 400 seen in production)', async () => {
    resetPassword.mockResolvedValue({ data: { success: true } });
    render(<ResetPassword />);
    fill();
    submit();
    await screen.findByText('Password updated');
    const body = resetPassword.mock.calls[0][0];
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('email');
  });

  it('keeps leading zeros in the code', async () => {
    resetPassword.mockResolvedValue({ data: { success: true } });
    render(<ResetPassword />);
    fill({ code: '001234' });
    submit();
    await screen.findByText('Password updated');
    expect(verifyResetCode.mock.calls[0][0].code).toBe('001234');
  });

  it('does not call the server when the code is incomplete or the passwords differ', () => {
    render(<ResetPassword />);
    fill({ code: '123' });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter all 6 digits of the code.');
    fill({ code: '123456', confirm: 'Different123!' });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(verifyResetCode).not.toHaveBeenCalled();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('says how many attempts are left after a wrong code', async () => {
    verifyResetCode.mockRejectedValue({ status: 400, data: { success: false, message: 'Invalid or expired code', data: { attempts_left: 4 } } });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('That code isn’t right. 4 attempts left.');
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument(); // can try again
  });

  it('offers a new code when the code is expired, used or locked', async () => {
    verifyResetCode.mockRejectedValue({ status: 400, data: { success: false, message: 'Invalid or expired code', data: null } });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('This code is wrong or has expired.');
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeInTheDocument();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });

  it('keeps the checked code when the server rejects the password, so a retry needs no new code', async () => {
    resetPassword
      .mockRejectedValueOnce({
        status: 400,
        data: { success: false, error: { details: [{ field: 'password', message: '"password" length must be at least 8 characters long' }] } },
      })
      .mockResolvedValueOnce({ data: { success: true } });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('password length must be at least 8 characters long');
    fill({ code: '' });
    submit();
    await screen.findByText('Password updated');
    expect(verifyResetCode).toHaveBeenCalledTimes(1);
    expect(resetPassword).toHaveBeenLastCalledWith({ token: TOKEN, password: 'NewPass123!' });
  });

  it('asks for a new code when the reset token is refused', async () => {
    resetPassword.mockRejectedValue({ status: 400, data: { success: false, message: 'Invalid or expired reset token' } });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('This code is wrong or has expired.');
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeInTheDocument();
  });

  it('resends the code to the same email', async () => {
    render(<ResetPassword />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    await screen.findByText(/A new code is on its way/);
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'sam@example.com' });
    expect(screen.getByRole('button', { name: /Resend code in/ })).toBeDisabled(); // 30 s wait
  });
});

describe('extractResetToken', () => {
  it('reads the usual field names', () => {
    expect(extractResetToken({ data: { reset_token: TOKEN } })).toBe(TOKEN);
    expect(extractResetToken({ data: { token: TOKEN } })).toBe(TOKEN);
    expect(extractResetToken({ data: { resetToken: TOKEN } })).toBe(TOKEN);
  });

  it('finds a token nested one level down', () => {
    expect(extractResetToken({ data: { reset: { password_reset_token: TOKEN } } })).toBe(TOKEN);
  });

  it('never takes an id or a non-GUID value', () => {
    expect(extractResetToken({ data: { user_id: TOKEN, token: '123456' } })).toBeNull();
  });
});

describe('ForgotPassword', () => {
  it('requests the code, then goes to the code screen with the email', async () => {
    render(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText('auth.email'), { target: { value: 'sam@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'sam@example.com' });
    expect(mockNavigate).toHaveBeenCalledWith('/reset-password', { state: { email: 'sam@example.com', expiresInMinutes: 15 } });
  });
});
