import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CategoryDetailPage } from './category-detail.page';

const routes: Routes = [
  {
    path: '',
    component: CategoryDetailPage
  },
  {
    path: 'hotel-detail',
    loadChildren: () => import('./hotel-detail/hotel-detail.module').then( m => m.HotelDetailPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CategoryDetailPageRoutingModule {}
