import { Routes } from '@angular/router';

import { adminGuard } from '@core/admin-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'requests' },
  {
    path: 'requests',
    loadComponent: () =>
      import('@feedback/pages/requests-page/requests-page').then((m) => m.RequestsPage),
  },
  {
    path: 'requests/new',
    loadComponent: () =>
      import('@feedback/pages/request-form-page/request-form-page').then((m) => m.RequestFormPage),
  },
  {
    path: 'requests/:id',
    loadComponent: () =>
      import('@feedback/pages/request-detail-page/request-detail-page').then(
        (m) => m.RequestDetailPage,
      ),
  },
  {
    path: 'requests/:id/edit',
    loadComponent: () =>
      import('@feedback/pages/request-form-page/request-form-page').then((m) => m.RequestFormPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('@settings/pages/settings-page/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadComponent: () => import('@admin/pages/admin-page/admin-page').then((m) => m.AdminPage),
  },
  { path: '**', redirectTo: 'requests' },
];
