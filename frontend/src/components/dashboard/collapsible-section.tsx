'use client';

import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-0">
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto hover:bg-transparent"
          onClick={() => setIsOpen(!isOpen)}
        >
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            {icon}
            {title}
          </CardTitle>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
