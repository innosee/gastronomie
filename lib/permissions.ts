// Zentrale Zugriffssteuerung für die Organisation. Wird SOWOHL vom Server
// (lib/auth.ts) ALS AUCH vom Client (lib/auth-client.ts) importiert, damit
// Better Auth Rollen konsistent kennt und der Client sie typisiert inferiert.
//
// Wir erweitern die Standard-Statements der Organization um drei eigene
// Ressourcen — content, media, menu — und definieren neben owner/admin/member
// eine 'editor'-Rolle: darf Inhalte/Medien/Karten pflegen, aber KEINE
// Org-Settings, Billing oder Mitglieder verwalten.

import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

export const statement = {
  ...defaultStatements,
  content: ['read', 'update'],
  media: ['read', 'create', 'update', 'delete'],
  menu: ['read', 'create', 'update', 'delete'],
} as const;

export const ac = createAccessControl(statement);

// Die Berechtigungen, die eine Redaktion ausmachen. Owner/Admin erben sie
// zusätzlich zu ihren Verwaltungsrechten; der Editor bekommt NUR diese.
const editorPermissions = {
  content: ['read', 'update'],
  media: ['read', 'create', 'update', 'delete'],
  menu: ['read', 'create', 'update', 'delete'],
} as const;

export const roles = {
  owner: ac.newRole({ ...ownerAc.statements, ...editorPermissions }),
  admin: ac.newRole({ ...adminAc.statements, ...editorPermissions }),
  member: ac.newRole({ ...memberAc.statements }),
  editor: ac.newRole({ ...editorPermissions }),
};

export type OrgRole = keyof typeof roles;

// --- Rollen-Prädikate (plain, server- und client-safe) ------------------

// Wer darf Org-Settings/Mitglieder/Billing verwalten?
export const ORG_MANAGER_ROLES = ['owner', 'admin'] as const;

// Wer darf Inhalte, Medien und Karten bearbeiten?
export const CONTENT_EDITOR_ROLES = ['owner', 'admin', 'editor'] as const;

// Rollen, die ein Owner/Admin per Einladung vergeben darf. Owner wird bewusst
// nicht angeboten — Eigentümerwechsel ist ein separater, seltener Vorgang.
export const ASSIGNABLE_ROLES = ['editor', 'admin'] as const;

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Inhaber',
  admin: 'Administrator',
  editor: 'Redakteur',
  member: 'Mitglied',
};

export function canManageOrg(role: string | null | undefined): boolean {
  return !!role && (ORG_MANAGER_ROLES as readonly string[]).includes(role);
}

export function canEditContent(role: string | null | undefined): boolean {
  return !!role && (CONTENT_EDITOR_ROLES as readonly string[]).includes(role);
}

export function isAssignableRole(role: string): role is (typeof ASSIGNABLE_ROLES)[number] {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}
