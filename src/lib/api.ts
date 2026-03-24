export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : `${window.location.origin}/api`);

export type User = {
  user_id: number;
  username: string;
  email: string;
  role?: 'user' | 'admin' | 'tc';
};

export type AuthResponse = {
  user: User;
};

export type AuthError = {
  error: string;
};

export async function signup(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as AuthError).error || "Signup failed");
  return data as AuthResponse;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as AuthError).error || "Login failed");
  return data as AuthResponse;
}

const AUTH_KEY = "railseat_user";

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(AUTH_KEY);
}

export async function getMyBookings(userId: number): Promise<Booking[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/bookings`);
  const data = await res.json();
  if (!res.ok) throw new Error((data as AuthError).error || "Failed to load bookings");
  return data as Booking[];
}

export async function updateUserProfile(
  userId: number,
  data: { username?: string; email?: string; password?: string }
): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error((result as AuthError).error || "Failed to update profile");
  return result as { user: User };
}

export type Booking = {
  booking_id: number;
  booking_number: string;
  contact_name: string;
  email: string | null;
  user_id: number | null;
  train_id: number;
  source_station: string;
  destination_station: string;
  travel_date: string;
  total_amount: string;
  booking_status: string;
  payment_status: string;
  gen_ticket?: boolean;
  gen_validity_start?: string;
  gen_validity_end?: string;
  is_downloadable?: boolean;
  createdAt?: string;
  train?: { train_number: string; train_name: string };
  passengers?: Array<{
    passenger_name: string;
    passenger_gender: string;
    seat_id?: number;
    seat?: {
      seat_number: string | number;
      berth_type: string;
      coach?: { coach_number: string; coach_type: string };
    };
  }>;
};