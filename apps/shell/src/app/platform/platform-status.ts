import { Component, computed } from '@angular/core';
import { PLATFORM_VERSION, getPlatformLoadInfo, registeredBuilds } from '@mfe-demo/platform';

/**
 * The evidence panel for this demo.
 *
 * Every app registers its own build on bootstrap, so redeploying one remote and
 * seeing only that row's buildId change is what proves the deploys are
 * independent. The singleton row proves federation actually collapsed the
 * shared platform to one instance instead of quietly giving each app its own.
 */
@Component({
  selector: 'app-platform-status',
  templateUrl: './platform-status.html',
  styleUrl: './platform-status.scss',
})
export class PlatformStatus {
  readonly builds = registeredBuilds;
  readonly platformVersion = PLATFORM_VERSION;

  /**
   * getPlatformLoadInfo() reads a mutable record rather than a signal. Reading
   * builds() first is deliberate: a new build registration is the moment a
   * second platform copy could have appeared, so this recomputes exactly then.
   */
  readonly load = computed(() => {
    this.builds();
    return getPlatformLoadInfo();
  });

  readonly angularVersions = computed(
    () => new Set(this.builds().map((build) => build.angularVersion)),
  );

  readonly hasVersionSkew = computed(() => this.angularVersions().size > 1);
}
