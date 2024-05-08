import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AllCategoriesPage } from '../pages/all-categories/all-categories.page';
import { AddressPage } from '../pages/address/address.page';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  constructor(private modalController: ModalController) {}

  

  

  async openModalCategory(){
    const modal = await this.modalController.create({
      component: AllCategoriesPage,
      componentProps: { value: 123 }
      });
    
      await modal.present();

      const data = await modal.onDidDismiss();
    console.log(data)
  }

  async openModalAddress(){
    const modal = await this.modalController.create({
      component: AddressPage,
      componentProps: { value: 123 }
      });
    
      await modal.present();

      const data = await modal.onDidDismiss();
    console.log(data)
  }
}
