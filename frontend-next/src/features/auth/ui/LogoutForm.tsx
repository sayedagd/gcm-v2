"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction, type LogoutActionState } from "@/features/auth/api/logoutAction";

const initialState: LogoutActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Sign out now"}
    </button>
  );
}

export function LogoutForm() {
  const [state, formAction] = useActionState(logoutAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-3">
      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
