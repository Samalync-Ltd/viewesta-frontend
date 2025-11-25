export const unwrapResponse = (response) => {
  if (!response) return response;
  if (response.data === undefined) return response;
  if (response.data?.data !== undefined) return response.data.data;
  return response.data;
};

export const describeApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (typeof error.message === 'string' && error.message.trim()) return error.message;
  return fallback;
};

