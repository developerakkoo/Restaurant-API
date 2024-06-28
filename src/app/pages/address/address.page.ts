import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Position } from '@capacitor/geolocation';
import { ModalController } from '@ionic/angular';
import { StorageService } from 'src/app/services/storage/storage.service';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-address',
  templateUrl: './address.page.html',
  styleUrls: ['./address.page.scss'],
})
export class AddressPage implements OnInit {
  @Input() value!: any;
  coords:any;
  address:any[] = [];

  constructor(
    private modalController: ModalController,
    private router: Router,
    private user: UserService,
    private storage: StorageService
  ) {}

  ngOnInit() {
    console.log(this.value);
    this.coords = this.value;
  }

  ionViewDidEnter(){
    this.getAllAddress();
  }

  getAllAddress(){
    this.user.getUserAddress().subscribe({
      next:async(value:any) =>{
        console.log(value);
        this.address = value['data'];
      },
      error:async(error:HttpErrorResponse) =>{
        console.log(error);
        
      }
    })
  }
  openMapsAddressPage() {
    this.close();
    console.log(this.coords);
    
    this.router.navigate(['address', 'map-address',this.coords['coords']['latitude'],this.coords['coords']['longitude']]);
  }

  close() {
    this.modalController.dismiss();
  }

  async setAddressDefault(address:any){
    console.log(address);
    await this.storage.set("address", address['address']);
    this.user.address.next(address);
    this.close();
    
  }
}
