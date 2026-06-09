import { Routes } from '@angular/router';
import { activePlayerGuard } from './state/players.providers';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/player-select/player-select').then((m) => m.PlayerSelect),
  },
  {
    path: 'game',
    canActivate: [activePlayerGuard],
    loadComponent: () =>
      import('./features/game/game-page/game-page').then((m) => m.GamePage),
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./features/leaderboard/leaderboard-page/leaderboard-page').then(
        (m) => m.LeaderboardPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
