'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services.
 * Includes a check to ensure valid configuration is present.
 */
export function initializeFirebase() {
  if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
    console.warn(
      'Firebase API Key is missing. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your environment.'
    );
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const firestore = getFirestore(app);
  const auth = getAuth(app);
  
  return { app, firestore, auth };
}

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './error-emitter';
export * from './errors';
