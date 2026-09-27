import { getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getDatabase, onValue, ref, set, type Unsubscribe } from 'firebase/database';

import googleServices from '@assets/google-services_(1)_1790479825083.json';

const projectId = googleServices.project_info.project_id;
const client = googleServices.client[0];

const firebaseConfig = {
  apiKey: client.api_key[0].current_key,
  authDomain: `${projectId}.firebaseapp.com`,
  databaseURL: googleServices.project_info.firebase_url,
  projectId,
  storageBucket: googleServices.project_info.storage_bucket,
  messagingSenderId: googleServices.project_info.project_number,
  appId: client.client_info.mobilesdk_app_id,
};

const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);
const storeReference = ref(database, 'stores/samar-x-modes');

export type RemoteStoreListener<T> = (value: T | null) => void;

export function subscribeToStore<T>(
  listener: RemoteStoreListener<T>,
  onError: (error: Error) => void,
): Unsubscribe {
  let unsubscribeValue: Unsubscribe | undefined;
  let stopped = false;

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (stopped) return;
    if (!user) {
      void signInAnonymously(auth).catch(onError);
      return;
    }

    unsubscribeValue?.();
    unsubscribeValue = onValue(
      storeReference,
      (snapshot) => listener(snapshot.exists() ? (snapshot.val() as T) : null),
      (error) => onError(error),
    );
  });

  return () => {
    stopped = true;
    unsubscribeValue?.();
    unsubscribeAuth();
  };
}

export function saveStore<T>(value: T): Promise<void> {
  return set(storeReference, value);
}