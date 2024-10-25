import BASE_URL from '../config.js';

export const loginUser = async (
  identifier: string,
  password: string,
  timeout: number = 30000,
  auth_token: string = "your_token_here"
) => {
  const fetchPromise = fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth_token}`,
    },
    credentials: "include",
    body: JSON.stringify({
      identifier: identifier.trim(),
      password: password.trim(),
    }),
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Login request timed out")), timeout)
  );

  const response = await Promise.race([fetchPromise, timeoutPromise]);
  const data = await response.json();

  return { response, data };
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${BASE_URL}/auth/current`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok) {
      console.log('User:', data.username, 'User ID:', data.user_id);
      return { userId: data.user_id, username: data.username };
    } else {
      console.log('Error:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};
