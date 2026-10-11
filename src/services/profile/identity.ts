export function profileDisplayName(profileName: string | null | undefined, user: {
  email?: string; user_metadata?: Record<string, unknown>;
} | null | undefined): string {
  if (profileName?.trim()) return profileName.trim();
  for (const field of ['display_name', 'full_name', 'name']) {
    const value = user?.user_metadata?.[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return user?.email?.split('@')[0]?.trim() || 'Minha conta';
}

export function validateProfileName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 80) throw new Error('Informe um nome de até 80 caracteres.');
  return name;
}
