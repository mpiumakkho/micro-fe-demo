import { Injectable } from '@angular/core';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly unitPrice: number;
  readonly inStock: number;
}

const FAKE_LATENCY_MS = 180;

/** Mock data. The demo has no backend; only the shapes are meant to be realistic. */
const PRODUCTS: readonly Product[] = [
  { id: 'sku-1001', name: 'Thermal receipt printer', category: 'Hardware', unitPrice: 4200, inStock: 12 },
  { id: 'sku-1002', name: 'Barcode scanner, 2D', category: 'Hardware', unitPrice: 2850, inStock: 40 },
  { id: 'sku-1003', name: 'Cash drawer, 5 bill slots', category: 'Hardware', unitPrice: 1950, inStock: 7 },
  { id: 'sku-2001', name: 'POS license, 1 terminal / year', category: 'Software', unitPrice: 7900, inStock: 999 },
  { id: 'sku-2002', name: 'Inventory add-on / year', category: 'Software', unitPrice: 3400, inStock: 999 },
];

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  async list(): Promise<readonly Product[]> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));
    return PRODUCTS;
  }

  async byId(productId: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));
    return PRODUCTS.find((product) => product.id === productId) ?? null;
  }
}
