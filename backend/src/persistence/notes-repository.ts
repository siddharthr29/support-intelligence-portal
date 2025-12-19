import { getPrismaClient } from './prisma-client';
import { logger } from '../utils/logger';

export type NoteType = 'rft' | 'general' | 'highlight' | 'ticket';

export interface WeeklyNoteInput {
  readonly snapshotId: string;
  readonly noteType: NoteType;
  readonly content: string;
}

export interface WeeklyNoteRecord {
  readonly id: string;
  readonly snapshotId: string;
  readonly noteType: string;
  readonly content: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export async function createNote(input: WeeklyNoteInput): Promise<WeeklyNoteRecord> {
  const prisma = getPrismaClient();

  const note = await prisma.weeklyNote.create({
    data: {
      snapshotId: input.snapshotId,
      noteType: input.noteType,
      content: input.content,
    },
  });

  logger.info({
    noteId: note.id,
    snapshotId: input.snapshotId,
    noteType: input.noteType,
  }, 'Weekly note created');

  return note;
}

export async function updateNote(
  noteId: string,
  content: string
): Promise<WeeklyNoteRecord> {
  const prisma = getPrismaClient();

  const note = await prisma.weeklyNote.update({
    where: { id: noteId },
    data: { content },
  });

  logger.info({ noteId, snapshotId: note.snapshotId }, 'Weekly note updated');

  return note;
}

export async function deleteNote(noteId: string): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.weeklyNote.delete({
    where: { id: noteId },
  });

  logger.info({ noteId }, 'Weekly note deleted');
}

export async function getNotesBySnapshot(snapshotId: string): Promise<readonly WeeklyNoteRecord[]> {
  const prisma = getPrismaClient();

  return prisma.weeklyNote.findMany({
    where: { snapshotId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getNotesByType(
  snapshotId: string,
  noteType: NoteType
): Promise<readonly WeeklyNoteRecord[]> {
  const prisma = getPrismaClient();

  return prisma.weeklyNote.findMany({
    where: { snapshotId, noteType },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getNoteById(noteId: string): Promise<WeeklyNoteRecord | null> {
  const prisma = getPrismaClient();

  return prisma.weeklyNote.findUnique({
    where: { id: noteId },
  });
}
