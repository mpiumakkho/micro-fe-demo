import { Injectable, signal } from '@angular/core';

export type OrderStatus = 'pending' | 'approved';

export interface OrderLine {
  readonly productId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

export interface Order {
  readonly id: string;
  readonly placedBy: string;
  readonly placedAt: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly total: number;
}

export class EmptyOrderError extends Error {
  constructor() {
    super('An order needs at least one line');
    this.name = 'EmptyOrderError';
  }
}

const SEED: readonly Order[] = [
  {
    id: 'ORD-24001',
    placedBy: 'Somchai (Ops Manager)',
    placedAt: '2026-08-28T09:12:00.000Z',
    status: 'approved',
    lines: [{ productId: 'sku-1002', name: 'Barcode scanner, 2D', unitPrice: 2850, quantity: 4 }],
    total: 11400,
  },
  {
    id: 'ORD-24002',
    placedBy: 'Pranee (Catalog Editor)',
    placedAt: '2026-09-01T02:40:00.000Z',
    status: 'pending',
    lines: [
      { productId: 'sku-2001', name: 'POS license, 1 terminal / year', unitPrice: 7900, quantity: 2 },
      { productId: 'sku-2002', name: 'Inventory add-on / year', unitPrice: 3400, quantity: 2 },
    ],
    total: 22600,
  },
];

/**
 * In-memory order store. The demo has no backend, so state lives here for the
 * lifetime of the page. It is deliberately local to this remote: orders are
 * this team's data and do not belong in the shared platform package.
 */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly state = signal<readonly Order[]>(SEED);
  private sequence = SEED.length;

  readonly orders = this.state.asReadonly();

  byId(orderId: string): Order | undefined {
    return this.state().find((order) => order.id === orderId);
  }

  place(placedBy: string, lines: readonly OrderLine[]): Order {
    if (lines.length === 0) {
      throw new EmptyOrderError();
    }

    this.sequence += 1;
    const order: Order = {
      id: `ORD-24${String(this.sequence).padStart(3, '0')}`,
      placedBy,
      placedAt: new Date().toISOString(),
      status: 'pending',
      lines,
      total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    };

    this.state.update((orders) => [order, ...orders]);
    return order;
  }

  approve(orderId: string): void {
    this.state.update((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status: 'approved' } : order)),
    );
  }
}
