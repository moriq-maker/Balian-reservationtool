'use client';

import { useActionState } from 'react';
import { staffLoginAction, type AuthActionState } from '@/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState: AuthActionState = {};

export default function StaffLoginPage() {
  const [state, formAction, isPending] = useActionState(staffLoginAction, initialState);

  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">予約管理システム</CardTitle>
          <CardDescription>共通アクセスコード(6桁)を入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">アクセスコード</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em]"
                required
              />
            </div>
            {state.error ? (
              <p className="text-destructive text-sm font-medium" role="alert">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="h-12 text-base" disabled={isPending}>
              {isPending ? '確認中...' : '入室する'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
