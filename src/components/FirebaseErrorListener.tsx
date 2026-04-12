
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { toast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * @fileOverview A central listener that captures and displays Firebase-related errors
 * emitted throughout the application.
 */

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error('Firebase Permission Error:', error);
      toast({
        variant: 'destructive',
        title: 'Security Rules Error',
        description: `Insufficient permissions for ${error.context.operation} at ${error.context.path}. Check your Firestore security rules.`,
      });
    };

    const unsubscribe = errorEmitter.on('permission-error', handlePermissionError);
    return () => unsubscribe();
  }, []);

  return null;
}
