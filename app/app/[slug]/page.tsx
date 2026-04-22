import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function OrgHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Karten</h1>
        <p className="text-sm text-muted-foreground">Lade die aktuellen PDF-Karten hoch.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>PDF-Upload</CardTitle>
          <CardDescription>
            Folgt im nächsten Schritt. Vorerst nur die Anmeldung und das Anlegen des Restaurants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Slug: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{slug}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
