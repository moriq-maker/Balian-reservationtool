'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface ActiveToggleProps {
  isActive: boolean;
  onToggle: (nextActive: boolean) => Promise<{ success: boolean; error?: string }>;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function ActiveToggle({
  isActive,
  onToggle,
  activeLabel = '有効',
  inactiveLabel = '無効',
}: ActiveToggleProps) {
  const [checked, setChecked] = useState(isActive);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      const result = await onToggle(next);
      if (!result.success) {
        toast.error(result.error ?? '更新に失敗しました');
        return;
      }
      setChecked(next);
      toast.success(next ? '有効にしました' : '無効化しました');
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} disabled={isPending} onCheckedChange={handleChange} />
      <span className="text-muted-foreground text-sm">{checked ? activeLabel : inactiveLabel}</span>
    </div>
  );
}
