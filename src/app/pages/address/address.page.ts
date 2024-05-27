import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-address',
  templateUrl: './address.page.html',
  styleUrls: ['./address.page.scss'],
})
export class AddressPage implements OnInit {

  constructor(private modalController: ModalController

  ) { }


  ngOnInit() {
  }


  openModalAddAddress(){
    
  }


  close(){
    this.modalController.dismiss();
  }
}
