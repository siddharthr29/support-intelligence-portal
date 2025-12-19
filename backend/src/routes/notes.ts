import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createNote,
  updateNote,
  deleteNote,
  getNotesBySnapshot,
  getNoteById,
} from '../persistence';
import type { NoteType } from '../persistence';
import { logger, ValidationError } from '../utils';

interface NotesQueryParams {
  snapshotId: string;
}

interface CreateNoteBody {
  snapshotId: string;
  noteType: NoteType;
  content: string;
}

interface UpdateNoteBody {
  content: string;
}

interface NoteParams {
  noteId: string;
}

const VALID_NOTE_TYPES: NoteType[] = ['rft', 'general', 'highlight', 'ticket'];

export async function registerNotesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: NotesQueryParams }>(
    '/api/notes',
    async (request: FastifyRequest<{ Querystring: NotesQueryParams }>, reply: FastifyReply) => {
      const { snapshotId } = request.query;

      if (!snapshotId) {
        throw new ValidationError('snapshotId query parameter is required');
      }

      const notes = await getNotesBySnapshot(snapshotId);

      return reply.send({
        success: true,
        data: notes.map(note => ({
          id: note.id,
          snapshotId: note.snapshotId,
          noteType: note.noteType,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      });
    }
  );

  fastify.post<{ Body: CreateNoteBody }>(
    '/api/notes',
    async (request: FastifyRequest<{ Body: CreateNoteBody }>, reply: FastifyReply) => {
      const { snapshotId, noteType, content } = request.body;

      if (!snapshotId || !noteType || !content) {
        throw new ValidationError('snapshotId, noteType, and content are required');
      }

      if (!VALID_NOTE_TYPES.includes(noteType)) {
        throw new ValidationError(`noteType must be one of: ${VALID_NOTE_TYPES.join(', ')}`);
      }

      const note = await createNote({ snapshotId, noteType, content });

      logger.info({ noteId: note.id, snapshotId }, 'Note created via API');

      return reply.status(201).send({
        success: true,
        data: {
          id: note.id,
          snapshotId: note.snapshotId,
          noteType: note.noteType,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
      });
    }
  );

  fastify.put<{ Params: NoteParams; Body: UpdateNoteBody }>(
    '/api/notes/:noteId',
    async (
      request: FastifyRequest<{ Params: NoteParams; Body: UpdateNoteBody }>,
      reply: FastifyReply
    ) => {
      const { noteId } = request.params;
      const { content } = request.body;

      if (!content) {
        throw new ValidationError('content is required');
      }

      const existing = await getNoteById(noteId);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Note not found',
        });
      }

      const note = await updateNote(noteId, content);

      logger.info({ noteId }, 'Note updated via API');

      return reply.send({
        success: true,
        data: {
          id: note.id,
          snapshotId: note.snapshotId,
          noteType: note.noteType,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
      });
    }
  );

  fastify.delete<{ Params: NoteParams }>(
    '/api/notes/:noteId',
    async (request: FastifyRequest<{ Params: NoteParams }>, reply: FastifyReply) => {
      const { noteId } = request.params;

      const existing = await getNoteById(noteId);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Note not found',
        });
      }

      await deleteNote(noteId);

      logger.info({ noteId }, 'Note deleted via API');

      return reply.send({
        success: true,
        message: 'Note deleted',
      });
    }
  );
}
