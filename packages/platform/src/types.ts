export interface User {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}

export interface AuthSession {
  readonly user: User;
  readonly token: string;
  /** ISO 8601 timestamp. */
  readonly expiresAt: string;
}

export interface CartItem {
  readonly productId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

/**
 * What one deployed application reports about itself.
 * The shell renders these so a redeploy of a single remote is visible
 * without rebuilding or redeploying anything else.
 */
export interface BuildInfo {
  /** Federation name of the app, e.g. "shell", "mfeOrders". */
  readonly app: string;
  /** package.json version of that app. */
  readonly version: string;
  /** Unique per build; changes on every rebuild. */
  readonly buildId: string;
  /** ISO 8601 timestamp of the build. */
  readonly builtAt: string;
  /** Angular version the app was compiled against. */
  readonly angularVersion: string;
}
