import type { Routes } from '@angular/router';
import { registerBuild } from '@mfe-demo/platform';
import { BUILD_INFO } from '../../build-info';
import { OrderDetail } from './order-detail';
import { OrderList } from './order-list';

/**
 * Registered at module scope because this is the module the shell imports.
 * bootstrap.ts is the standalone entry point and does not run inside the shell.
 */
registerBuild(BUILD_INFO);

/** Exposed to the shell as './routes'. */
export const routes: Routes = [
  { path: '', component: OrderList },
  { path: ':orderId', component: OrderDetail },
];
