"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { GCM_ROLE_VALUES } from "@/lib/auth";
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
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block">
        <span className="mb-2 block text-sm text-slate-700">Role</span>
        <select
          name="role"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          defaultValue="ADMIN"
        >
          {GCM_ROLE_VALUES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
