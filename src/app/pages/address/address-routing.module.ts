import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddressPage } from './address.page';

const routes: Routes = [
  {
    path: '',
    component: AddressPage
  },
  {
    path: 'add-address',
    loadChildren: () => import('./add-address/add-address.module').then( m => m.AddAddressPageModule)
  },
  {
    path: 'map-address/:lat/:lng',
    loadChildren: () => import('./map-address/map-address.module').then( m => m.MapAddressPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddressPageRoutingModule {}
