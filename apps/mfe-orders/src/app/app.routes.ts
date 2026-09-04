import type { Routes } from '@angular/router';
import { routes as ordersRoutes } from './orders/orders.routes';

/**
 * Standalone mode only (npm start on port 4201). Inside the shell the exposed
 * route table is mounted directly, so this file is not involved.
 */
export const routes: Routes = ordersRoutes;
