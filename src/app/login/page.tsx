"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { inputClasses, buttonPrimary } from "@/lib/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <h1 className="mb-1 text-xl font-semibold">Monitor de Compras</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Novedades diarias de procesos en comprar.ar
        </p>

        <div className="mb-4 space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClasses}
          />
        </div>

        <div className="mb-6 space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClasses}
          />
        </div>

        {state?.error && (
          <p className="mb-4 text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={`w-full ${buttonPrimary}`}
        >
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
