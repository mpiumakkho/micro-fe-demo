import { bootstrapApplication } from '@angular/platform-browser';
import { registerBuild } from '@mfe-demo/platform';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { BUILD_INFO } from './build-info';

registerBuild(BUILD_INFO);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
