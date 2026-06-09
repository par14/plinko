import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RISK_MODES, ROWS_OPTIONS, type RiskMode, type Rows } from '../../../core/fairness/multipliers';
import { AudioService } from '../../../core/audio/audio.service';
import { GameConfigStore, MIN_BET } from '../../../state/game-config.store';
import { GameService } from '../../../state/game.service';
import { PlayersStore } from '../../../state/players.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe],
  templateUrl: './controls.html',
  styleUrl: './controls.scss',
  host: { class: 'controls' },
})
export class Controls {
  private readonly config = inject(GameConfigStore);
  private readonly players = inject(PlayersStore);
  private readonly game = inject(GameService);
  private readonly audio = inject(AudioService);

  readonly rowsOptions = ROWS_OPTIONS;
  readonly riskModes = RISK_MODES;

  readonly bet = this.config.bet;
  readonly rows = this.config.rows;
  readonly risk = this.config.risk;
  readonly lastWin = this.config.lastWin;
  readonly activeBalls = this.config.activeBalls;
  readonly balance = this.players.balance;
  readonly canPlay = this.game.canPlay;
  readonly isMuted = this.audio.isMuted;

  onBetInput(value: string): void {
    const parsed = Number(value);
    this.config.setBet(Number.isFinite(parsed) ? parsed : MIN_BET);
  }

  betMin(): void {
    this.config.setBet(MIN_BET);
  }

  betHalf(): void {
    this.config.betFraction(0.5, this.balance());
  }

  betDouble(): void {
    this.config.betFraction(2, this.balance());
  }

  betMax(): void {
    this.config.betMax(this.balance());
  }

  selectRows(rows: number): void {
    this.config.setRows(rows as Rows);
  }

  selectRisk(risk: RiskMode): void {
    this.config.setRisk(risk);
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  play(): void {
    this.audio.unlock();
    void this.game.play();
  }
}
