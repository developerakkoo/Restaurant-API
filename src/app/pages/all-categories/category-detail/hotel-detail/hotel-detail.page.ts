import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hotel-detail',
  templateUrl: './hotel-detail.page.html',
  styleUrls: ['./hotel-detail.page.scss'],
})
export class HotelDetailPage implements OnInit {
  totalItems: any = 0;
  constructor() {}

  ngOnInit() {}

  addToCart() {
    console.log('add');
    this.totalItems++;
  }

  removeFromCart() {
    console.log('remove');
    this.totalItems--;
  }
  onSearchChange(ev: any) {}
}
