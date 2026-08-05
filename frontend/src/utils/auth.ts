export function getToken() {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function decodeToken(token: string) {
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const token = getToken();

  if (!token) {
    return null;
  }

  return decodeToken(token);
}