import { betterAuthClient } from "better-auth/client";

export const authClient = betterAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  fetchOptions: {
    credentials: 'include',
  },
});

export const {
  signIn: signInEmail,
  signUp: signUpEmail,
  signOut,
  useSession,
  useUser,
} = authClient;

export function useAuthStatus() {
  const { data: session, isPending } = useSession();

  return {
    isAuthenticated: !!session?.user,
    user: session?.user,
    isLoading: isPending,
    session,
  };
}
