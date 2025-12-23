'use client';

import { useState, useEffect } from "react";
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
import { Clock, Plus, Users, Lock } from "lucide-react";

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

// Check if current week entry is unlocked
// Unlocks: Friday 1PM IST
// Stays unlocked until engineer hours are filled (no time-based lock)
function isCurrentWeekUnlocked(): boolean {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istTime.getDay(); // 5 = Friday
  const hours = istTime.getHours();
  
  // Unlocked from Friday 1 PM onwards (no upper time limit)
  if (dayOfWeek === 5 && hours >= 13) {
    return true;
  }
  
  // Unlocked on Saturday and Sunday (weekend grace period)
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    return true;
  }
  
  // Unlocked on Monday-Thursday (stays unlocked until filled)
  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    return true;
  }
  
  // Locked before Friday 1 PM
  return false;
}

// Get time until unlock
function getTimeUntilUnlock(): string {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istTime.getDay();
  const hours = istTime.getHours();
  
  // If currently unlocked
  if (dayOfWeek === 5 && hours >= 13) return 'Unlocked';
  if (dayOfWeek === 6 || dayOfWeek === 0) return 'Unlocked';
  if (dayOfWeek >= 1 && dayOfWeek <= 4) return 'Unlocked';
  
  // Calculate next Friday 1PM IST
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && hours < 13) {
    const hoursLeft = 13 - hours;
    return `${hoursLeft}h until unlock`;
  }
  if (daysUntilFriday === 0) daysUntilFriday = 7;
  
  return `${daysUntilFriday} days until Friday 1PM IST`;
}

export function EngineerHoursModal({ snapshotId, onHoursUpdated }: EngineerHoursModalProps) {
  const [open, setOpen] = useState(false);
  const [newEngineer, setNewEngineer] = useState({ name: '', hours: '' });
  const [isUnlocked, setIsUnlocked] = useState(isCurrentWeekUnlocked());
  const [timeUntilUnlock, setTimeUntilUnlock] = useState(getTimeUntilUnlock());
  const queryClient = useQueryClient();
  
  // Update lock status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setIsUnlocked(isCurrentWeekUnlocked());
      setTimeUntilUnlock(getTimeUntilUnlock());
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

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
        <Button variant="outline" size="sm" className="gap-2" disabled={!isUnlocked}>
          {isUnlocked ? (
            <>
              <Clock className="h-4 w-4" />
              Enter Support Hours
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Locked ({timeUntilUnlock})
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Support Engineer Hours
          </DialogTitle>
        </DialogHeader>

        {!isUnlocked && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Entry Locked</span>
            </div>
            <p className="text-sm text-yellow-700">
              Engineer hours entry unlocks on Friday at 1:00 PM IST and locks at 9:00 PM IST (if report pushed).
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              Time until unlock: {timeUntilUnlock}
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              Note: You can add past week hours on Monday if report was not pushed by Friday.
            </p>
          </div>
        )}

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
                disabled={!isUnlocked}
              />
              <Input
                type="number"
                placeholder="Hours"
                value={newEngineer.hours}
                onChange={(e) => setNewEngineer({ ...newEngineer, hours: e.target.value })}
                disabled={!isUnlocked}
              />
            </div>
            <Button
              onClick={handleAddEngineer}
              disabled={!isUnlocked || mutation.isPending}
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
