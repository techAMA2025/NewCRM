import { auth } from '@/firebase/firebase';

/**
 * Makes an authenticated fetch request by automatically attaching
 * the Firebase ID token as a Bearer token in the Authorization header.
 *
 * Usage: Replace `fetch(url, options)` with `authFetch(url, options)`
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('User is not authenticated');
    }

    const token = await currentUser.getIdToken();

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    return fetch(url, {
        ...options,
        headers,
    });
}
