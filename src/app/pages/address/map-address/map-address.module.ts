import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MapAddressPageRoutingModule } from './map-address-routing.module';

import { MapAddressPage } from './map-address.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MapAddressPageRoutingModule
  ],
  declarations: [MapAddressPage]
})
export class MapAddressPageModule {}
