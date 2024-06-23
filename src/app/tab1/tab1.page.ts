import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AllCategoriesPage } from '../pages/all-categories/all-categories.page';
import { AddressPage } from '../pages/address/address.page';
import { Geolocation, Position } from '@capacitor/geolocation';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  coordinates!: Position;
  constructor(private modalController: ModalController,
              private geolocation: Geolocation
  ) {}

  ionViewDidEnter(){
    this.loadCurrentPosition();
  }
  

   async loadCurrentPosition(){
    // await Geolocation.requestPermissions().then(async (value:any) =>{
      const coordinates = await Geolocation.getCurrentPosition();
    
    console.log('Current position:', coordinates);
    this.coordinates = coordinates;
    // }).catch((error) =>{
    //   console.log(error);
      
    // })
  };

  async openModalCategory(){
    const modal = await this.modalController.create({
      component: AllCategoriesPage,
      componentProps: { value: this.coordinates }
      });
    
      await modal.present();

      const data = await modal.onDidDismiss();
    console.log(data)
  }

  async openModalAddress(){
    const modal = await this.modalController.create({
      component: AddressPage,
      componentProps: { value: this.coordinates }
      });
    
      await modal.present();

      const data = await modal.onDidDismiss();
    console.log(data)
  }
}
