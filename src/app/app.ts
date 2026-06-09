import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PlayersStore } from './state/players.store';
import { MoneyPipe } from './shared/pipes/money.pipe';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MoneyPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly players = inject(PlayersStore);
  readonly activePlayer = this.players.activePlayer;
  readonly balance = this.players.balance;
}
