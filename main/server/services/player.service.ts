import * as alt from 'alt-server';
import { ClientEvents } from '../../shared/events';
import { AuthenticatedSession } from '../../shared/types';

export class PlayerService {
  private readonly sessions = new Map<number, AuthenticatedSession>();

  public setSession(player: alt.Player, session: AuthenticatedSession): void {
    this.sessions.set(player.id, session);
  }

  public getSession(player: alt.Player): AuthenticatedSession | null {
    return this.sessions.get(player.id) ?? null;
  }

  public clearSession(player: alt.Player): void {
    this.sessions.delete(player.id);
  }

  public isAuthenticated(player: alt.Player): boolean {
    return this.sessions.has(player.id);
  }

  public notify(player: alt.Player, message: string): void {
    player.emit(ClientEvents.SystemMessage, message);
  }

  public spawnDefault(player: alt.Player): void {
    player.model = 'mp_m_freemode_01';
    player.spawn(215.8, -810.1, 30.7, 0);
  }
}
