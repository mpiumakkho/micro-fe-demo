import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { cartStore } from '@mfe-demo/platform';
import { CatalogApi } from './catalog-api';
import { ProductList } from './product-list';

describe('ProductList', () => {
  beforeEach(async () => {
    cartStore.clear();
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    cartStore.clear();
  });

  it('lists every product the api returns', async () => {
    const expected = await TestBed.inject(CatalogApi).list();

    const fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(expected.length);
  });

  /**
   * The point of this test is the boundary, not the button: adding to the cart
   * has to land in the shared platform instance, because that is the only thing
   * the shell header and the orders remote can read.
   */
  it('writes an added product into the shared cart', async () => {
    const fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();

    const firstButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'tbody tr button',
    );
    firstButton?.click();

    expect(cartStore.count()).toBe(1);
    expect(cartStore.items()[0]?.productId).toBe('sku-1001');
    expect(cartStore.total()).toBe(4200);
  });

  it('accumulates quantity when the same product is added twice', async () => {
    const fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();

    const firstButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'tbody tr button',
    );
    firstButton?.click();
    firstButton?.click();

    expect(cartStore.items()).toHaveLength(1);
    expect(cartStore.count()).toBe(2);
  });
});
