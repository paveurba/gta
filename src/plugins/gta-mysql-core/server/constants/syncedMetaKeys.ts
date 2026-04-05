/** Player synced meta for client overhead nametag — keep in sync with client `NAMETAG_SYNCED_META`. */
export const SYNCED_DISPLAY_NAME = 'gta:displayName';

export function displayTagFromEmail(email: string): string {
    const i = email.indexOf('@');
    return i > 0 ? email.slice(0, i) : email;
}
