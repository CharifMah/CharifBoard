import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { PlaygroundPageComponent } from './pages/playground/playground-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'ui', component: PlaygroundPageComponent },
  { path: '**', redirectTo: '' },
];