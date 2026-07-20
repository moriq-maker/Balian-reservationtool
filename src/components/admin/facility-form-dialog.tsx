'use client';

import { useState, type ReactElement } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createFacilityAction, updateFacilityAction } from '@/actions/facility-actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Facility, FacilityCategory } from '@/generated/prisma/client';
import {
  facilityFormDefaultValues,
  facilityFormSchema,
  type FacilityFormValues,
} from '@/lib/validation/facility';

interface FacilityFormDialogProps {
  categories: Pick<FacilityCategory, 'id' | 'name'>[];
  facility?: Facility;
  trigger: ReactElement;
}

export function FacilityFormDialog({ categories, facility, trigger }: FacilityFormDialogProps) {
  const [open, setOpen] = useState(false);

  const defaultValues: FacilityFormValues = facility
    ? {
        categoryId: facility.categoryId,
        name: facility.name,
        durationMinutes: facility.durationMinutes,
        displayOrder: facility.displayOrder,
        color: facility.color,
        hasCleaning: facility.hasCleaning,
        description: facility.description ?? '',
        adminNote: facility.adminNote ?? '',
      }
    : facilityFormDefaultValues;

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues,
  });

  async function onSubmit(values: FacilityFormValues) {
    const result = facility
      ? await updateFacilityAction(facility.id, values)
      : await createFacilityAction(values);

    if (!result.success) {
      toast.error(result.error ?? '保存に失敗しました');
      return;
    }

    toast.success(facility ? '施設情報を更新しました' : '施設を追加しました');
    setOpen(false);
    form.reset(defaultValues);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset(defaultValues);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{facility ? '施設情報を編集' : '新しい施設を追加'}</DialogTitle>
          <DialogDescription>予約表・予約入力で使用する施設マスター情報です。</DialogDescription>
        </DialogHeader>

        <form
          id="facility-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="facility-category">カテゴリ</Label>
            <Select
              value={form.watch('categoryId')}
              onValueChange={(value) =>
                form.setValue('categoryId', value ?? '', { shouldValidate: true })
              }
            >
              <SelectTrigger id="facility-category">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId ? (
              <p className="text-destructive text-sm">{form.formState.errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="facility-name">施設名</Label>
            <Input id="facility-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="facility-duration">固定利用時間(分)</Label>
              <Input
                id="facility-duration"
                type="number"
                min={1}
                {...form.register('durationMinutes', { valueAsNumber: true })}
              />
              {form.formState.errors.durationMinutes ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.durationMinutes.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="facility-order">表示順</Label>
              <Input
                id="facility-order"
                type="number"
                {...form.register('displayOrder', { valueAsNumber: true })}
              />
              {form.formState.errors.displayOrder ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.displayOrder.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="facility-color">予約表の色</Label>
            <div className="flex items-center gap-2">
              <input
                id="facility-color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border"
                value={form.watch('color')}
                onChange={(e) => form.setValue('color', e.target.value, { shouldValidate: true })}
              />
              <Input className="flex-1" placeholder="#3B82F6" {...form.register('color')} />
            </div>
            {form.formState.errors.color ? (
              <p className="text-destructive text-sm">{form.formState.errors.color.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="facility-cleaning"
              checked={form.watch('hasCleaning')}
              onCheckedChange={(checked) => form.setValue('hasCleaning', checked === true)}
            />
            <Label htmlFor="facility-cleaning" className="font-normal">
              清掃機能あり(利用完了後に自動で清掃中ステータスへ遷移する)
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="facility-description">説明</Label>
            <Textarea id="facility-description" rows={2} {...form.register('description')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="facility-admin-note">管理者向け備考</Label>
            <Textarea id="facility-admin-note" rows={2} {...form.register('adminNote')} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="facility-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '保存中...' : '保存する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
