import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AllCategoriesPage } from './all-categories.page';

const routes: Routes = [
  {
    path: '',
    component: AllCategoriesPage,
  },
  {
    path: 'category-detail/:id/:name',
    loadChildren: () =>
      import('./category-detail/category-detail.module').then(
        (m) => m.CategoryDetailPageModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AllCategoriesPageRoutingModule {}
