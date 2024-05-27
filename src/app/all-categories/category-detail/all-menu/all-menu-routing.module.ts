import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AllMenuPage } from './all-menu.page';

const routes: Routes = [
  {
    path: '',
    component: AllMenuPage
  },
  {
    path: 'menu-detail',
    loadChildren: () => import('./menu-detail/menu-detail.module').then( m => m.MenuDetailPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AllMenuPageRoutingModule {}
