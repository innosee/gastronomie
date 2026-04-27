import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Karten-Verwaltung
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
