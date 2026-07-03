import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {db} from './firebase';
import type {Profile} from './sync';

export interface LeaderRow {
  uid: string;
  nickname: string;
  defeatedCount: number;
  totalReps: number;
}

export async function loadRemote(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    progression: {
      defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
      lastWorkoutDate: typeof d.lastWorkoutDate === 'string' ? d.lastWorkoutDate : null,
    },
    totalReps: typeof d.totalReps === 'number' ? d.totalReps : 0,
  };
}

export async function saveRemote(uid: string, profile: Profile, nickname: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      nickname,
      defeatedCount: profile.progression.defeatedCount,
      lastWorkoutDate: profile.progression.lastWorkoutDate,
      totalReps: profile.totalReps,
      updatedAt: serverTimestamp(),
    },
    {merge: true},
  );
}

/** Топ игроков по прогрессу кампании; до-сортировку по XP делает вызывающий. */
export async function loadLeaderboard(max: number): Promise<LeaderRow[]> {
  const q = query(collection(db, 'users'), orderBy('defeatedCount', 'desc'), limit(max));
  const snap = await getDocs(q);
  const rows: LeaderRow[] = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    rows.push({
      uid: docSnap.id,
      nickname: typeof d.nickname === 'string' && d.nickname ? d.nickname : '—',
      defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
      totalReps: typeof d.totalReps === 'number' ? d.totalReps : 0,
    });
  });
  return rows;
}
