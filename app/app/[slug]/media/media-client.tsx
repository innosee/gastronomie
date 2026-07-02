'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ACCEPT_ATTRIBUTE, MAX_ALT_LENGTH } from '@/lib/media';
import { deleteMediaAction, updateMediaAltAction, uploadMediaAction } from './actions';

export type MediaItem = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function MediaClient({ slug, items }: { slug: string; items: MediaItem[] }) {
  return (
    <div className="space-y-6">
      <UploadCard slug={slug} />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Bilder hochgeladen.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MediaGridItem key={item.id} slug={slug} item={item} formatBytes={formatBytes} />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadCard({ slug }: { slug: string }) {
  const [isUploading, startUpload] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string>('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Object-URL beim Unmount / Wechsel freigeben, um Memory-Leaks zu vermeiden.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startUpload(async () => {
      const result = await uploadMediaAction(null, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Bild hochgeladen');
      formRef.current?.reset();
      if (preview) URL.revokeObjectURL(preview);
      setPreview('');
      setDimensions(null);
      setFileName('');
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview('');
      setDimensions(null);
      setFileName('');
      return;
    }
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Bildmaße clientseitig ermitteln — spart serverseitiges Decoding.
    const img = new Image();
    img.onload = () => setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bild hochladen</CardTitle>
        <CardDescription>JPEG, PNG, WebP, AVIF oder GIF (max. 8 MB).</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="width" value={dimensions?.width ?? ''} />
          <input type="hidden" name="height" value={dimensions?.height ?? ''} />
          <input
            type="file"
            name="file"
            accept={ACCEPT_ATTRIBUTE}
            required
            disabled={isUploading}
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vorschau"
              className="max-h-40 rounded-md border object-contain"
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="upload-alt">Alt-Text (optional)</Label>
            <Input
              id="upload-alt"
              name="alt"
              maxLength={MAX_ALT_LENGTH}
              placeholder="Beschreibung fürs Bild"
              disabled={isUploading}
            />
          </div>
          <Button type="submit" size="sm" disabled={isUploading || !fileName}>
            {isUploading ? 'Wird hochgeladen…' : 'Hochladen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MediaGridItem({
  slug,
  item,
  formatBytes,
}: {
  slug: string;
  item: MediaItem;
  formatBytes: (bytes: number) => string;
}) {
  const [isPending, startTransition] = useTransition();
  const [alt, setAlt] = useState(item.alt ?? '');

  function handleSaveAlt() {
    if (alt === (item.alt ?? '')) return;
    startTransition(async () => {
      const result = await updateMediaAltAction(slug, item.id, alt);
      if (result?.error) toast.error(result.error);
      else toast.success('Alt-Text gespeichert');
    });
  }

  function handleDelete() {
    if (!confirm('Bild wirklich löschen?')) return;
    startTransition(async () => {
      const result = await deleteMediaAction(slug, item.id);
      if (result?.error) toast.error(result.error);
      else toast.success('Bild gelöscht');
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.alt ?? ''}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <CardContent className="space-y-2 pt-4">
        <p className="text-xs text-muted-foreground">
          {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
          {formatBytes(item.fileSize)}
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={alt}
            maxLength={MAX_ALT_LENGTH}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Alt-Text"
            disabled={isPending}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSaveAlt}
            disabled={isPending || alt === (item.alt ?? '')}
          >
            Speichern
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={isPending}
        >
          Löschen
        </Button>
      </CardContent>
    </Card>
  );
}
