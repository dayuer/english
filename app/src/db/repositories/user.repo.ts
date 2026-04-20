import { queryFirst, execute } from '../client';

export interface LocalUser {
  id: number;
  displayName: string | null;
  nativeLang: string;
  targetLang: string;
  competenceScore: number;
  interestTags: string;
  diagnosticCompleted: number;
}

export async function getLocalUser(): Promise<LocalUser | null> {
  return queryFirst<LocalUser>('SELECT * FROM users LIMIT 1');
}

export async function updateInterests(interests: string[]): Promise<void> {
  await execute('UPDATE users SET interest_tags = ?, updated_at = datetime("now")', [
    JSON.stringify(interests),
  ]);
}

export async function updateCompetenceScore(score: number): Promise<void> {
  await execute('UPDATE users SET competence_score = ?, updated_at = datetime("now")', [score]);
}

export async function markDiagnosticCompleted(): Promise<void> {
  await execute(
    'UPDATE users SET diagnostic_completed = 1, updated_at = datetime("now")',
    []
  );
}
