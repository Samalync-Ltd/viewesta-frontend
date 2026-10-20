import { renderHook, waitFor, act } from '@testing-library/react';
import useWalletBalance from './useWalletBalance';
import { getWallet, WALLET_CHANGED_EVENT } from '../services/walletService';

jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', wallet_balance: 0 } }) }));
jest.mock('../services/walletService', () => ({
  ...jest.requireActual('../services/walletService'),
  getWallet: jest.fn(),
}));

test('reads the live balance, not the copy saved at sign-in', async () => {
  getWallet.mockResolvedValue({ balance: 1, currency: 'USD' });
  const { result } = renderHook(() => useWalletBalance());
  await waitFor(() => expect(result.current.balance).toBe(1));
  expect(result.current.loading).toBe(false);
});

test('re-reads after a top-up or purchase is reported', async () => {
  getWallet.mockResolvedValue({ balance: 1, currency: 'USD' });
  const { result } = renderHook(() => useWalletBalance());
  await waitFor(() => expect(result.current.balance).toBe(1));

  getWallet.mockResolvedValue({ balance: 26, currency: 'USD' });
  act(() => { window.dispatchEvent(new Event(WALLET_CHANGED_EVENT)); });
  await waitFor(() => expect(result.current.balance).toBe(26));
});

test('re-reads when the window gets focus again', async () => {
  getWallet.mockResolvedValue({ balance: 1, currency: 'USD' });
  const { result } = renderHook(() => useWalletBalance());
  await waitFor(() => expect(result.current.balance).toBe(1));

  getWallet.mockResolvedValue({ balance: 0.5, currency: 'USD' });
  act(() => { window.dispatchEvent(new Event('focus')); });
  await waitFor(() => expect(result.current.balance).toBe(0.5));
});

test('reports an error instead of a made-up 0 when the wallet cannot be reached', async () => {
  getWallet.mockRejectedValue(new Error('network'));
  const { result } = renderHook(() => useWalletBalance());
  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.balance).toBeNull();
});
