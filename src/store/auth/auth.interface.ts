export interface User {
  id: string;
  name: string;
}

export interface Wallet {
  balance: number;
}

export interface Auth {
  user: User | null;
  wallet: Wallet;
}
