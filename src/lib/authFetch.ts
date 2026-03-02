import { auth } from '@/firebase/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

/**
 * Waits for Firebase Auth to resolve its initial auth state.
 * On page load, `auth.currentUser` is null until `onAuthStateChanged`
 * fires. This helper returns a promise that resolves with the user
 * (or null) once the auth state is known.
 */
function waitForAuth(): Promise<User | null> {
    return new Promise((resolve) => {
        // If auth state is already resolved, return immediately
        if (auth.currentUser) {
            resolve(auth.currentUser);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

/**
 * Makes an authenticated fetch request by automatically attaching
 * the Firebase ID token as a Bearer token in the Authorization header.
 *
 * Waits for Firebase Auth to initialize before checking the current user,
 * which prevents "User is not authenticated" errors on initial page load.
 *
 * Usage: Replace `fetch(url, options)` with `authFetch(url, options)`
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const currentUser = await waitForAuth();

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
