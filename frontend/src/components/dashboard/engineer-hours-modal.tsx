'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, Plus, Users } from "lucide-react";

interface EngineerHoursModalProps {
  snapshotId: string;
  onHoursUpdated?: () => void;
}

interface EngineerHour {
  id: string;
  engineerName: string;
  totalHoursWorked: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchEngineerHours(snapshotId: string): Promise<EngineerHour[]> {
  const res = await fetch(`${API_BASE_URL}/api/engineer-hours?snapshotId=${snapshotId}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function saveEngineerHour(data: {
  snapshotId: string;
  engineerName: string;
  totalHoursWorked: number;
}) {
  const res = await fetch(`${API_BASE_URL}/api/engineer-hours`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save');
  return res.json();
}

export function EngineerHoursModal({ snapshotId, onHoursUpdated }: EngineerHoursModalProps) {
  const [open, setOpen] = useState(false);
  const [newEngineer, setNewEngineer] = useState({ name: '', hours: '' });
  const queryClient = useQueryClient();

  const { data: engineerHours = [] } = useQuery({
    queryKey: ['engineerHours', snapshotId],
    queryFn: () => fetchEngineerHours(snapshotId),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: saveEngineerHour,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineerHours', snapshotId] });
      setNewEngineer({ name: '', hours: '' });
      toast.success('Engineer hours saved');
      onHoursUpdated?.();
    },
    onError: () => {
      toast.error('Failed to save engineer hours');
    },
  });

  const handleAddEngineer = () => {
    if (!newEngineer.name || !newEngineer.hours) {
      toast.error('Please enter engineer name and hours');
      return;
    }

    mutation.mutate({
      snapshotId,
      engineerName: newEngineer.name,
      totalHoursWorked: parseFloat(newEngineer.hours),
    });
  };

  const totalHours = engineerHours.reduce((sum, e) => sum + e.totalHoursWorked, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Enter Support Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Support Engineer Hours
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-3xl font-bold">{totalHours}</div>
            <div className="text-sm text-muted-foreground">Total Hours This Week</div>
          </div>

          {/* Existing Engineers */}
          {engineerHours.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Logged Hours</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {engineerHours.map((eng) => (
                  <div
                    key={eng.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <span className="font-medium">{eng.engineerName}</span>
                    <span className="text-muted-foreground">{eng.totalHoursWorked} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Engineer */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Add Engineer Hours</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name"
                value={newEngineer.name}
                onChange={(e) => setNewEngineer({ ...newEngineer, name: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Hours"
                value={newEngineer.hours}
                onChange={(e) => setNewEngineer({ ...newEngineer, hours: e.target.value })}
              />
            </div>
            <Button
              onClick={handleAddEngineer}
              disabled={mutation.isPending}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Engineer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
