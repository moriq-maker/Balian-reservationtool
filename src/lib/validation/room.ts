import { z } from 'zod';

export const roomFormSchema = z.object({
  roomNumber: z
    .string()
    .trim()
    .min(1, '部屋番号を入力してください')
    .max(20, '部屋番号は20文字以内で入力してください'),
  displayOrder: z.number().int('表示順は整数で入力してください'),
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;

export const roomFormDefaultValues: RoomFormValues = {
  roomNumber: '',
  displayOrder: 0,
};
