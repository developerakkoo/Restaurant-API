import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { CategoriesService } from 'src/app/services/category/categories.service';
import { CartItem, OrdersService } from 'src/app/services/order/orders.service';
import { UserService } from 'src/app/services/user/user.service';
export interface Product {
  dishId: number;
  quantity: number
}
@Component({
  selector: 'app-hotel-detail',
  templateUrl: './hotel-detail.page.html',
  styleUrls: ['./hotel-detail.page.scss'],
})
export class HotelDetailPage implements OnInit {
  hotelId:any;
  hotelName:any;
  menuItems:any[] = [];

    cart:any[] = [];
    cartItems$!: Observable<CartItem[]>;
    dishesWithCartStatus: any[] = [];
    cartItemCount$!: Observable<number>;
  constructor(private router: Router,
              private route: ActivatedRoute,
              private orderService: OrdersService,
              private userService: UserService,
              private cdr: ChangeDetectorRef,
              private category: CategoriesService,
              private loadingController: LoadingController,
              private toastController: ToastController,
  ) {
    this.hotelId = this.route.snapshot.paramMap.get("id");
    this.hotelName = this.route.snapshot.paramMap.get("name");
    this.getHotelMenu("",1);
    this.getUserCart();

  }

  ngOnInit() {
    this.cartItemCount$ = this.orderService.getCartItemCount();
    
      this.cartItemCount$.subscribe({
        next:(count:any) =>{
          console.log(count);
          
        },
        error:(error:any) =>{
          console.log(error);
          
        }
      })
    // // Subscribe to cart items updates
    // this.cartItems$.subscribe(cartItems => {
    //   this.dishesWithCartStatus.forEach(dish => {
    //     dish.isAddedToCart = !!cartItems.find(item => item.dishId === dish._id._id);
    //   });
    //   this.cdr.detectChanges();
    // });
  }

  ionViewDidLoad(){
    // this.cartItems$ = this.orderService.getCartItems();
  }

  async presentToastWithOptions(count:any,duration:number) {
    this.toastController.dismiss();

    const toast = await this.toastController.create({
      animated: true,
      duration:duration,
      buttons:[{
        role:'cancel',
        handler:()=>{}
      },
      
      {
        icon:'assets/icon/shopping-cart-outline.svg',
        side:'end',
        text:"View Cart",
        handler:()=>{
          console.log("Go To CArt");
          this.router.navigate(['tab', 'tabs', 'tab2']);
          
        }
      }
    ],
      color: 'primary',
      cssClass: 'toast-success',
      header: 'You have items in your cart',
      keyboardClose: true,
      message: `${count} items added`,
      mode: 'ios',
      position: 'bottom',
      swipeGesture:'vertical',
      translucent: true
    });

    console.log(toast);
    
    toast.present();
  }
  addToCartNew(dish: any): void {
    const cartItem: CartItem = {
      dishId: dish._id._id,
      dishName: dish._id.dishName,
      quantity: 1,
    };
    this.orderService.addToCart(cartItem,this.hotelId).subscribe({
      next:async(value:any) => {
        console.log('Item added to cart', value);
        // Update the isAddedToCart field
        const dishIndex = this.dishesWithCartStatus.findIndex(d => d._id._id === dish._id._id);
        if (dishIndex !== -1) {
          this.dishesWithCartStatus[dishIndex].isAddedToCart = true;
        }
    this.cartItems$ = this.orderService.getCartItems();

        this.cdr.detectChanges();
        console.log(this.cartItems$);
        this.updateCartItemCount();
      },
      error: (error:any) => {
        console.error('Error adding item to cart', error);
      }
  });
  }


  removeFromCart(menu:any) {
    const quantityToRemove = 1; // Define the quantity to remove
    this.orderService.removeFromCart( menu, quantityToRemove).subscribe({
      next:(value:any) => {
        console.log('Item removed from cart', value);
        // Update the isAddedToCart field
        const dishIndex = this.dishesWithCartStatus.findIndex(d => d._id._id === menu);
        if (dishIndex !== -1) {
          this.dishesWithCartStatus[dishIndex].isAddedToCart = false;
        }
    this.cartItems$ = this.orderService.getCartItems();

        this.cdr.detectChanges();
        this.updateCartItemCount();

      },
      error:(error:any) => {
        console.error('Error removing item from cart', error);
      }
  });
  }
  onSearchChange(ev: any) {
    this.getHotelMenu(ev.detail.value,0);
  }



  updateCartItemCount(){
    this.cartItemCount$.subscribe({
      next:(count:any) =>{
        console.log(count);
          if(count <= 0){
            this.presentToastWithOptions(count, 300);

          }
          else{
            this.presentToastWithOptions(count, 3000);

          }
      
        
      },
      error:(error:any) =>{
        console.log(error);
        
      }
    })
  }
  getHotelMenu(query:string, populate:any){
    this.category.getHotelMenuById(this.hotelId, query, populate)
    .subscribe({
      next:async(value:any) =>{
        console.log("Menu List");
        
        console.log(value);
        let data = value['data'];
        this.menuItems = data;
        console.log(this.menuItems);
      
        this.dishesWithCartStatus = this.menuItems.map(dish => ({
          ...dish,
          isAddedToCart: false
        }));
        
    
        console.log(this.dishesWithCartStatus);
        
        
      },
      error:async(error:HttpErrorResponse) =>
        {
        console.log(error);
      }
    })
  }


  getUserCart(){
    this.orderService.getCart()
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        
      },
      error:async(error:HttpErrorResponse) =>{
        console.log(error.error.message);
        
      }
    })
  }

  addHotelAsUserFav(){
    this.userService.addUserFavHotel(this.hotelId)
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        
      },
      error:async(error:HttpErrorResponse) =>{
        console.log(error);
        
      }
    })
  }
}
