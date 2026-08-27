import Link from "next/link";
import { logout } from "../login/actions";

const LINKS = [
  { href: "/", label: "Novedades" },
  { href: "/expedientes", label: "Expedientes" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Monitor de Compras</span>
          <nav className="flex flex-wrap gap-1 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm font-medium text-zinc-500 hover:text-red-600"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
