'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MENU_CATEGORY_LABELS, type MenuCategory } from '@/lib/menu-categories';
import { deleteMenuAction, uploadMenuAction, type UploadState } from './actions';

type Props = {
  slug: string;
  category: MenuCategory;
  current: { url: string; version: number; fileSize: number; uploadedAt: Date } | null;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);

export function UploadCard({ slug, category, current }: Props) {
  const [state, formAction, isUploading] = useActionState<UploadState, FormData>(
    uploadMenuAction,
    null,
  );
  const [isDeleting, startDelete] = useTransition();
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(`${MENU_CATEGORY_LABELS[category]} aktualisiert`);
      const handle = setTimeout(() => {
        setFileName('');
        formRef.current?.reset();
      }, 0);
      return () => clearTimeout(handle);
    }
    if (state.error) toast.error(state.error);
  }, [state, category]);

  function handleDelete() {
    if (!confirm(`${MENU_CATEGORY_LABELS[category]} wirklich löschen?`)) return;
    startDelete(async () => {
      const result = await deleteMenuAction(slug, category);
      if (result?.error) toast.error(result.error);
      else toast.success(`${MENU_CATEGORY_LABELS[category]} gelöscht`);
    });
  }

  const isBusy = isUploading || isDeleting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{MENU_CATEGORY_LABELS[category]}</CardTitle>
        <CardDescription>
          {current
            ? `Aktuell: ${formatBytes(current.fileSize)} · ${formatDate(current.uploadedAt)}`
            : 'Noch keine PDF hochgeladen'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {current && (
          <a
            href={`${current.url}?v=${current.version}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            Aktuelle PDF öffnen ↗
          </a>
        )}
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="category" value={category} />
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept="application/pdf"
            required
            disabled={isBusy}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
          {fileName && <p className="text-xs text-muted-foreground truncate">{fileName}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={isBusy || !fileName}>
              {isUploading ? 'Wird hochgeladen…' : current ? 'Ersetzen' : 'Hochladen'}
            </Button>
            {current && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isBusy}
              >
                Löschen
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
