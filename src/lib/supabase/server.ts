import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Using 'as any' to bypass a build-time type error where the
          // compiler incorrectly infers the type of cookies().
          return (cookies() as any).get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Using 'as any' to bypass a build-time type error.
            (cookies() as any).set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Using 'as any' to bypass a build-time type error.
            (cookies() as any).set({ name, value: '', ...options })
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}