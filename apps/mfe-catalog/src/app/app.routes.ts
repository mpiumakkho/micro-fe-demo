import type { Routes } from '@angular/router';
import { routes as catalogRoutes } from './catalog/catalog.routes';

/**
 * Standalone mode only (npm start on port 4202). Inside the shell the exposed
 * route table is mounted directly, so this file is not involved.
 */
export const routes: Routes = catalogRoutes;
