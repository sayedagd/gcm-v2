"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginActionState } from "@/features/auth/api/loginAction";

const initialState: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block space-y-2">
        <span className="block text-sm font-medium text-slate-700">Email address</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@company.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <label className="block space-y-2">
        <span className="block text-sm font-medium text-slate-700">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      {state.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Use your assigned app credentials to continue.</p>
        <SubmitButton />
      </div>
    </form>
  );
}
