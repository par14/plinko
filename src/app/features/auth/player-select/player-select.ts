import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlayersStore } from '../../../state/players.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-player-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe],
  templateUrl: './player-select.html',
  styleUrl: './player-select.scss',
})
export class PlayerSelect {
  private readonly players = inject(PlayersStore);
  private readonly router = inject(Router);

  readonly all = this.players.players;
  readonly name = signal('');
  readonly startingBalance = signal(1000);

  create(): void {
    const name = this.name().trim();
    const balance = this.startingBalance();
    if (!name || !(balance > 0)) return;
    this.players.addPlayer(name, balance);
    void this.router.navigateByUrl('/game');
  }

  resume(id: string): void {
    this.players.selectPlayer(id);
    void this.router.navigateByUrl('/game');
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    this.players.deletePlayer(id);
  }
}
