'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotes, createNote, updateNote, deleteNote } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Edit2, Save } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { NoteType, WeeklyNote } from '@/lib/types';

interface NotesSectionProps {
  snapshotId: string;
}

const NOTE_TYPES: { type: NoteType; label: string; color: string }[] = [
  { type: 'rft', label: 'RFT', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
  { type: 'general', label: 'Note', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  { type: 'highlight', label: 'Highlight', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  { type: 'ticket', label: 'Ticket', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
];

export function NotesSection({ snapshotId }: NotesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedType, setSelectedType] = useState<NoteType>('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes', snapshotId],
    queryFn: () => fetchNotes(snapshotId),
  });

  const createMutation = useMutation({
    mutationFn: () => createNote(snapshotId, selectedType, newNoteContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', snapshotId] });
      setNewNoteContent('');
      setIsAdding(false);
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateNote(editingId!, editContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', snapshotId] });
      setEditingId(null);
      toast.success('Note updated');
    },
    onError: () => toast.error('Failed to update note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', snapshotId] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  if (isLoading) return <div className="h-10 w-full animate-pulse bg-muted rounded" />;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {notes?.data?.map((note: WeeklyNote) => (
        <div key={note.id} className="group relative">
          {editingId === note.id ? (
            <div className="flex items-center gap-2 bg-white border rounded-full px-3 py-1 shadow-sm">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="h-6 w-48 text-sm border-none shadow-none focus-visible:ring-0 p-0"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-green-600"
                onClick={() => updateMutation.mutate()}
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-red-600"
                onClick={() => setEditingId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Badge
              variant="secondary"
              className={`pl-2 pr-1 py-1 gap-2 cursor-pointer transition-all ${
                NOTE_TYPES.find((t) => t.type === note.noteType)?.color
              }`}
            >
              <span onClick={() => {
                setEditingId(note.id);
                setEditContent(note.content);
              }}>
                {note.content}
              </span>
              <button
                onClick={() => deleteMutation.mutate(note.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 bg-white border rounded-full px-3 py-1 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 font-normal">
                {NOTE_TYPES.find(t => t.type === selectedType)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {NOTE_TYPES.map((type) => (
                <DropdownMenuItem key={type.type} onClick={() => setSelectedType(type.type)}>
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-4 w-px bg-border" />
          
          <Input
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add note..."
            className="h-6 w-48 text-sm border-none shadow-none focus-visible:ring-0 p-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newNoteContent.trim()) {
                createMutation.mutate();
              }
            }}
            autoFocus
          />
          
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full"
            onClick={() => setIsAdding(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full h-7 px-3 text-xs border-dashed text-muted-foreground hover:text-foreground"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Note
        </Button>
      )}
    </div>
  );
}
