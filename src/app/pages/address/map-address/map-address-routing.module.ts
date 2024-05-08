import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MapAddressPage } from './map-address.page';

const routes: Routes = [
  {
    path: '',
    component: MapAddressPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapAddressPageRoutingModule {}
