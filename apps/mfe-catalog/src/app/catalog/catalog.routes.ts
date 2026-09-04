import type { Routes } from '@angular/router';
import { registerBuild } from '@mfe-demo/platform';
import { BUILD_INFO } from '../../build-info';
import { ProductDetail } from './product-detail';
import { ProductList } from './product-list';

/**
 * Registered here rather than in bootstrap.ts on purpose.
 *
 * bootstrap.ts is the standalone entry point and never runs when the shell
 * loads this remote - the shell imports this module and nothing else. Putting
 * the registration at module scope means the remote reports its build in both
 * modes, which is what the shell's evidence table relies on.
 */
registerBuild(BUILD_INFO);

/**
 * Exposed to the shell as './routes'.
 *
 * The shell mounts this table under a path prefix it chooses and knows nothing
 * about what is inside, so this team can add, rename or reorder pages here
 * without a shell release.
 */
export const routes: Routes = [
  { path: '', component: ProductList },
  { path: ':productId', component: ProductDetail },
];
