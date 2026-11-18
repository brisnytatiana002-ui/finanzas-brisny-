import {initializeApp} from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BudgetMovement,
  EMPTY_MONTH_TEMPLATES,
  MonthlyBudgetData,
} from './data/budgetData';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt: 'select_account'});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error(
        'Por favor verifica la configuración de Firebase: el cliente está sin conexión.',
      );
    }
  }
}

void testConnection();

export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  defaultMonthlyBudget: number;
  onboardingCompleted: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MonthlyBudgetFirestoreDoc {
  ownerId: string;
  monthId: string;
  label: string;
  shortLabel: string;
  monthAbbr: string;
  monthNumber: number;
  year: number;
  totalDays: number;
  monthlyBudget: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MovementFirestoreDoc {
  ownerId: string;
  monthId: string;
  type: 'expense' | 'income';
  day: number;
  dateISO: string;
  dateLabel: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  clientCreatedAt: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
}

export async function initializeAccountBudget(params: {
  uid: string;
  email: string;
  displayName: string;
  monthlyBudget: number;
  profileExists: boolean;
}): Promise<void> {
  const {uid, email, displayName, monthlyBudget, profileExists} = params;
  const cleanName = displayName.trim().slice(0, 60) || 'Usuario';
  const cleanEmail = email.trim().slice(0, 200);
  const safeBudget = Math.max(0, Math.min(100_000_000_000, Math.round(monthlyBudget)));

  const profilePath = `users/${uid}`;
  try {
    if (profileExists) {
      await updateDoc(doc(db, 'users', uid), {
        displayName: cleanName,
        defaultMonthlyBudget: safeBudget,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: cleanEmail,
        displayName: cleanName,
        defaultMonthlyBudget: safeBudget,
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      profileExists ? OperationType.UPDATE : OperationType.CREATE,
      profilePath,
    );
  }

  const monthsPath = `users/${uid}/months`;
  try {
    const batch = writeBatch(db);
    for (const template of EMPTY_MONTH_TEMPLATES) {
      const monthRef = doc(db, 'users', uid, 'months', template.id);
      batch.set(monthRef, {
        ownerId: uid,
        monthId: template.id,
        label: template.label,
        shortLabel: template.shortLabel,
        monthAbbr: template.monthAbbr,
        monthNumber: template.monthNumber,
        year: template.year,
        totalDays: template.totalDays,
        monthlyBudget: safeBudget,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, monthsPath);
  }
}

export async function updateMonthBudgetInFirestore(params: {
  uid: string;
  month: MonthlyBudgetData;
  newBudget: number;
}): Promise<void> {
  const {uid, month, newBudget} = params;
  const safeBudget = Math.max(0, Math.min(100_000_000_000, Math.round(newBudget)));
  const path = `users/${uid}/months/${month.id}`;

  try {
    await updateDoc(doc(db, 'users', uid, 'months', month.id), {
      monthlyBudget: safeBudget,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserDisplayNameInFirestore(params: {
  uid: string;
  displayName: string;
}): Promise<void> {
  const {uid, displayName} = params;
  const cleanName = displayName.trim().slice(0, 60);
  if (!cleanName) return;
  const path = `users/${uid}`;

  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: cleanName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createMovementInFirestore(params: {
  uid: string;
  monthId: string;
  movement: Omit<BudgetMovement, 'id' | 'createdAt'>;
}): Promise<string> {
  const {uid, monthId, movement} = params;
  const clientCreatedAt = Date.now();
  const movementId = sanitizeId(
    `mov-${clientCreatedAt}-${Math.random().toString(36).slice(2, 7)}`,
  );
  const path = `users/${uid}/movements/${movementId}`;

  const payload: Record<string, unknown> = {
    ownerId: uid,
    monthId: sanitizeId(monthId),
    type: movement.type,
    day: Math.max(1, Math.min(31, Math.round(movement.day))),
    dateISO: movement.dateISO.slice(0, 10),
    dateLabel: movement.dateLabel.trim().slice(0, 30) || movement.dateISO.slice(0, 10),
    category: String(movement.category).trim().slice(0, 60) || 'Alimentación',
    description: movement.description.trim().slice(0, 200) || 'Movimiento',
    amount: Math.max(1, Math.min(100_000_000_000, Math.round(movement.amount))),
    clientCreatedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (movement.paymentMethod && movement.paymentMethod.trim()) {
    payload.paymentMethod = movement.paymentMethod.trim().slice(0, 40);
  }
  if (movement.notes && movement.notes.trim()) {
    payload.notes = movement.notes.trim().slice(0, 500);
  }

  try {
    await setDoc(doc(db, 'users', uid, 'movements', movementId), payload);
    return movementId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
