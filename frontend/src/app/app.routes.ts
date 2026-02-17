import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'posts/:slug',
    loadComponent: () => import('./pages/post-detail/post-detail.component').then(m => m.PostDetailComponent)
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  }
];
