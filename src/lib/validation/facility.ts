import { z } from 'zod';

export const facilityFormSchema = z.object({
  categoryId: z.string().uuid({ message: 'カテゴリを選択してください' }),
  name: z
    .string()
    .trim()
    .min(1, '施設名を入力してください')
    .max(50, '施設名は50文字以内で入力してください'),
  durationMinutes: z
    .number({ error: '固定利用時間を入力してください' })
    .int('固定利用時間は整数(分)で入力してください')
    .positive('固定利用時間は1分以上で入力してください'),
  displayOrder: z.number().int('表示順は整数で入力してください'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '色は #RRGGBB の形式で入力してください'),
  hasCleaning: z.boolean(),
  description: z.string().trim().max(500, '説明は500文字以内で入力してください'),
  adminNote: z.string().trim().max(500, '管理者向け備考は500文字以内で入力してください'),
});

export type FacilityFormValues = z.infer<typeof facilityFormSchema>;

export const facilityFormDefaultValues: FacilityFormValues = {
  categoryId: '',
  name: '',
  durationMinutes: 60,
  displayOrder: 0,
  color: '#3B82F6',
  hasCleaning: false,
  description: '',
  adminNote: '',
};
