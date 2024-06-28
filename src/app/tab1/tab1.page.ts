import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AllCategoriesPage } from '../pages/all-categories/all-categories.page';
import { AddressPage } from '../pages/address/address.page';
import { Geolocation, Position } from '@capacitor/geolocation';
import { StorageService } from '../services/storage/storage.service';
import { UserService } from '../services/user/user.service';
import { CategoriesService } from '../services/category/categories.service';
import { HttpErrorResponse } from '@angular/common/http';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  coordinates!: Position;
  defaultAddress:any;
  categories:any[] = [];
  topHotelsBanner:any[] = [];
  constructor(private modalController: ModalController,
              private geolocation: Geolocation,
              private storage: StorageService,
              private user:UserService,
              private category: CategoriesService
  ) {}

  ionViewDidEnter(){
    this.loadCurrentPosition();
  }
  

   async loadCurrentPosition(){
  
      this.user.address.subscribe((value:any) =>{
        console.log(value);
        
        let add = value['address'].toString().split(',');
        this.defaultAddress = add.slice(-3,-1).join(',');
        console.log(this.defaultAddress);
      });
      this.getAllCategory();
      // this.getOfferBanner();
      this.getTopHotels();
      
 
    

    
    // await Geolocation.requestPermissions().then(async (value:any) =>{
      const coordinates = await Geolocation.getCurrentPosition();
    
    console.log('Current position:', coordinates);
    this.coordinates = coordinates;
    // }).catch((error) =>{
    //   console.log(error);
      
    // })
  };

  getOfferBanner(){
    this.user.getOfferBanner()
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        
      },
      error:(error:HttpErrorResponse) =>{
        console.log(error.error.message);
        
      }
    })
  }

  getAllCategory(){
    this.category.getAllCategory()
    .subscribe({
      next:(cat:any) =>{
        console.log(cat);
        this.categories = cat['data']['content'].slice(0,4);
        console.log(this.categories);
        
        
      },
      error:(error:HttpErrorResponse) =>{
        console.log(error.error.message);
        
      }
    })
  }


  getTopHotels(){
    this.user.getTopHotels()
    .subscribe({
      next:(hotels:any) =>{
        console.log(hotels['data'][0]['image_url']);
        this.topHotelsBanner = hotels['data'];
      },
      error:(error:HttpErrorResponse) =>{
        console.log(error.error.message);
        
      }
    })
  }
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
