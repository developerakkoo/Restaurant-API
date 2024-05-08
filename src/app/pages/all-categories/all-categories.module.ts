import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AllCategoriesPageRoutingModule } from './all-categories-routing.module';

import { AllCategoriesPage } from './all-categories.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AllCategoriesPageRoutingModule
  ],
  declarations: [AllCategoriesPage]
})
export class AllCategoriesPageModule {}
