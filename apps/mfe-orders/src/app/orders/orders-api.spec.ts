import { EmptyOrderError, OrdersApi, type OrderLine } from './orders-api';

const LINES: readonly OrderLine[] = [
  { productId: 'sku-1001', name: 'Thermal receipt printer', unitPrice: 4200, quantity: 2 },
  { productId: 'sku-2002', name: 'Inventory add-on / year', unitPrice: 3400, quantity: 1 },
];

describe('OrdersApi', () => {
  let api: OrdersApi;

  beforeEach(() => {
    api = new OrdersApi();
  });

  it('rejects an order with no lines instead of creating an empty one', () => {
    const before = api.orders().length;

    expect(() => api.place('Tester', [])).toThrow(EmptyOrderError);
    expect(api.orders()).toHaveLength(before);
  });

  it('totals the lines and starts the order as pending', () => {
    const order = api.place('Tester', LINES);

    expect(order.total).toBe(4200 * 2 + 3400);
    expect(order.status).toBe('pending');
    expect(order.placedBy).toBe('Tester');
  });

  it('gives each order its own id and puts the newest first', () => {
    const first = api.place('Tester', LINES);
    const second = api.place('Tester', LINES);

    expect(second.id).not.toBe(first.id);
    expect(api.orders()[0]?.id).toBe(second.id);
    expect(api.byId(first.id)?.id).toBe(first.id);
  });

  it('approves one order without touching the others', () => {
    const target = api.place('Tester', LINES);
    const other = api.place('Tester', LINES);

    api.approve(target.id);

    expect(api.byId(target.id)?.status).toBe('approved');
    expect(api.byId(other.id)?.status).toBe('pending');
  });

  it('ignores an unknown order id rather than throwing', () => {
    expect(() => api.approve('ORD-does-not-exist')).not.toThrow();
  });
});
