import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AllMenuPageRoutingModule } from './all-menu-routing.module';

import { AllMenuPage } from './all-menu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AllMenuPageRoutingModule
  ],
  declarations: [AllMenuPage]
})
export class AllMenuPageModule {}
