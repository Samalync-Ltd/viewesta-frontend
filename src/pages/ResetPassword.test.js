import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ResetPassword from './ResetPassword';
import ForgotPassword from './ForgotPassword';
import { requestPasswordReset, resetPassword } from '../utils/apiClient';

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
jest.mock('../utils/apiClient', () => ({ requestPasswordReset: jest.fn(), resetPassword: jest.fn() }));

const fill = ({ code = '123456', password = 'NewPass123!', confirm = password } = {}) => {
  if (code) fireEvent.change(screen.getByLabelText(/Verification code, digit 1/), { target: { value: code } });
  fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: confirm } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

beforeEach(() => {
  mockNavigate.mockReset();
  requestPasswordReset.mockResolvedValue({ data: { data: { expires_in_minutes: 15 } } });
});

describe('ResetPassword (code screen)', () => {
  it('sends the email, code and new password, then confirms', async () => {
    resetPassword.mockResolvedValue({ data: { success: true } });
    render(<ResetPassword />);
    fill();
    submit();
    await screen.findByText('Password updated');
    expect(resetPassword).toHaveBeenCalledWith({ email: 'sam@example.com', code: '123456', password: 'NewPass123!' });
  });

  it('keeps leading zeros in the code', async () => {
    resetPassword.mockResolvedValue({ data: { success: true } });
    render(<ResetPassword />);
    fill({ code: '001234' });
    submit();
    await screen.findByText('Password updated');
    expect(resetPassword.mock.calls[0][0].code).toBe('001234');
  });

  it('does not call the server when the code is incomplete or the passwords differ', () => {
    render(<ResetPassword />);
    fill({ code: '123' });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter all 6 digits of the code.');
    fill({ code: '123456', confirm: 'Different123!' });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('says how many attempts are left after a wrong code', async () => {
    resetPassword.mockRejectedValue({ status: 400, data: { success: false, message: 'Invalid or expired code', data: { attempts_left: 4 } } });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('That code isn’t right. 4 attempts left.');
    expect(screen.getByLabelText('New Password')).toBeInTheDocument(); // can try again
  });

  it('offers a new code when the code is expired, used or locked', async () => {
    resetPassword.mockRejectedValue({ status: 400, data: { success: false, message: 'Invalid or expired code', data: null } });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('This code is wrong or has expired.');
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeInTheDocument();
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });

  it('resends the code to the same email', async () => {
    render(<ResetPassword />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    await screen.findByText(/A new code is on its way/);
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'sam@example.com' });
    expect(screen.getByRole('button', { name: /Resend code in/ })).toBeDisabled(); // 30 s wait
  });

  it('shows the server password rule when the password is rejected', async () => {
    resetPassword.mockRejectedValue({
      status: 400,
      data: { success: false, error: { details: [{ field: 'password', message: '"password" length must be at least 8 characters long' }] } },
    });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('password length must be at least 8 characters long');
  });

  it('does not call a missing code "wrong" while the server still wants the old link token', async () => {
    resetPassword.mockRejectedValue({
      status: 400,
      data: { success: false, error: { details: [{ field: 'token', message: '"token" is required' }] } },
    });
    render(<ResetPassword />);
    fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Password reset is not available right now.');
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
