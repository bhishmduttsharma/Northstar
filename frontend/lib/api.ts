const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function api(path: string, token = '', init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({ message: 'Unable to connect to the server.' }));
  if (!response.ok) {
    let message = body.message || 'Request failed.';
    const available = message.match(/Insufficient stock.*?Available(?: stock)?:\s*(\d+)/i);
    if (available) message = `Insufficient stock. Available: ${available[1]}`;
    throw new Error(message);
  }
  return body.data;
}
