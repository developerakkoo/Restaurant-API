import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Position } from '@capacitor/geolocation';
import { ModalController } from '@ionic/angular';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-address',
  templateUrl: './address.page.html',
  styleUrls: ['./address.page.scss'],
})
export class AddressPage implements OnInit {
  @Input() value!: any;
  coords:any;
  constructor(
    private modalController: ModalController,
    private router: Router,
    private user: UserService
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
}
