import { z } from 'zod';

export const guestTypeSchema = z.enum(['staying', 'before_checkin', 'after_checkout']);

export const reservationFormSchema = z
  .object({
    guestType: guestTypeSchema,
    roomId: z.string().uuid().optional(),
    guestName: z.string().trim().max(50, '利用者名は50文字以内で入力してください').optional(),
    facilityId: z.string().uuid({ message: '施設を選択してください' }),
    startAt: z.date({ error: '利用開始日時を選択してください' }),
    note: z.string().trim().max(500, '備考は500文字以内で入力してください'),
  })
  .superRefine((data, ctx) => {
    if (data.guestType === 'staying') {
      if (!data.roomId) {
        ctx.addIssue({ code: 'custom', message: '部屋番号を選択してください', path: ['roomId'] });
      }
    } else if (!data.guestName || data.guestName.length === 0) {
      ctx.addIssue({ code: 'custom', message: '利用者名を入力してください', path: ['guestName'] });
    }
  });

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;

export const reservationFormDefaultValues: Omit<ReservationFormValues, 'startAt'> & {
  startAt: Date | undefined;
} = {
  guestType: 'staying',
  roomId: undefined,
  guestName: '',
  facilityId: '',
  startAt: undefined,
  note: '',
};
