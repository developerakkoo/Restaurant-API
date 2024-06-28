import { Component } from '@angular/core';
import { CartItem, OrdersService } from '../services/order/orders.service';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {
  cart:any[] = [];
  cartItems$!: Observable<CartItem[]>;
  dishesWithCartStatus: any[] = [];
  cartItemCount$!: Observable<number>;

  subtotal:number = 0;
  total:number = 0;
  deliveryCharges:number = 50;
  handlingFeed:number = 50;
  gstCharges:number = 100;

  promoCode:string = "";
  promoCodeInputFillType:string = "outline";
  isPromoCodeApplied:boolean = false;

  constructor(private orderService: OrdersService,
              private router: Router,
              private loadingController: LoadingController,
              private toastController: ToastController
  ) {}



  ionViewDidEnter(){
    this.getCart();
    this.calculateTotalAmountForPayment("");
  }

  ionViewDidLeave(){
    console.log(
  "CArt Leave"
    );
    
    this.isPromoCodeApplied = false;
          this.promoCodeInputFillType = 'outline';
  }
  getCart(){
    this.orderService.getCart()
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        this.cart = value['data']['products'];

        
      },
      error:async(error:HttpErrorResponse) =>{
        console.log(error.error.message);
        
      }
    })
  }

  calculateTotalAmountForPayment(promoCode:string){
    this.orderService.calculateCartAmount(promoCode)
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        this.deliveryCharges = value['data']['deliveryCharges'];
        this.gstCharges = value['data']['gstAmount'];
        this.handlingFeed = value['data']['platformFee'];
        this.total = value['data']['totalAmountToPay'];
        this.subtotal = value['data']['subtotal'];
        let promocode = value['data']['promoCodeId'];
        if(promocode == null){
          this.isPromoCodeApplied = false;
          this.promoCodeInputFillType = 'outline';
        }
        else if(promocode != null){
          this.isPromoCodeApplied = true;
          this.promoCodeInputFillType = 'solid';
        }
      
      },
      error:async(error:HttpErrorResponse) =>{
        console.log(error);
        
      }
    })
  }
  clearCart(){
    this.orderService.clearCart().subscribe({
      next:async(value:any) =>{
        console.log(value);
        this.getCart();
      },
      error:async(error:any) =>{
        console.log(error);
        
      }
    })
  }

  removeFromCart(item:any){

  }

  placeOrder(){

  }

  addPromoCode(){
    this.calculateTotalAmountForPayment(this.promoCode);
  }

  clearPromoCode(){
    this.calculateTotalAmountForPayment("");

  }
  checkout(){
    
  }
}
