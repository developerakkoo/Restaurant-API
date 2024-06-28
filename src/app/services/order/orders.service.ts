import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from '../storage/storage.service';
export interface Product {
  dishId: number;
  quantity: number;
}

export interface CartItem {
  dishId: string;
  dishName: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  data: Product[] = [];

  cart = [];
  cartItemCount = new BehaviorSubject(0);
  userAuthState: BehaviorSubject<any> = new BehaviorSubject(false);
  accessToken: BehaviorSubject<string> = new BehaviorSubject('');
  userId: BehaviorSubject<string> = new BehaviorSubject('');
  address: BehaviorSubject<string> = new BehaviorSubject('');
  private cartItems: CartItem[] = [];
  private cartSubject: BehaviorSubject<CartItem[]> = new BehaviorSubject<
    CartItem[]
  >([]);

  cartItems$ = this.cartSubject.asObservable();
  constructor(private http: HttpClient, private storage: StorageService) {
    this.init();
    // this.getProducts();
  }

  async init() {
    let token = await this.storage.get('accessToken');
    let userId = await this.storage.get('userId');

    this.accessToken.next(token);
    this.userId.next(userId);
  }


  placeOrder(){

  }

  calculateCartAmount(promoCode:string){
    return this.http.post(environment.URL + `order/calculate/amount-to-pay`,{
      userId:this.userId.value,
      code:promoCode
    },{
      headers: {
        'x-access-token': this.accessToken.value,
      },})
  }


  addToCart(cartItem: CartItem, hotelId:any): Observable<any> {
    const payload = {
      userId: this.userId.value,
      hotelId:hotelId,
      products: [{ dishId: cartItem.dishId, quantity: cartItem.quantity }],
    };

    // Update the local cart state
    const existingItem = this.cartItems.find(
      (item) => item.dishId === cartItem.dishId
    );
    if (existingItem) {
      existingItem.quantity += cartItem.quantity;
    } else {
      this.cartItems.push({ ...cartItem });
    }
    this.cartSubject.next(this.cartItems);

    return this.http.post(environment.URL + `user/cart/add-to-cart`, payload, {
      headers: {
        'x-access-token': this.accessToken.value,
      },
    });
  }

  removeFromCart(dishId: string, quantityToRemove: number): Observable<any> {
    // Update the local cart state
    const existingItem = this.cartItems.find(item => item.dishId === dishId);
    if (existingItem) {
      existingItem.quantity -= quantityToRemove;
      if (existingItem.quantity <= 0) {
        this.cartItems = this.cartItems.filter(item => item.dishId !== dishId);
      }
    } else {
      this.cartItems = this.cartItems.filter(item => item.dishId !== dishId);
    }
    this.cartSubject.next(this.cartItems);

    const payload = {
      userId: this.userId.value,
      dishId: dishId,
      quantityToRemove: quantityToRemove
    };

    return this.http.post(environment.URL+`user/cart/delete/product`, payload, {
      headers: {
        'x-access-token': this.accessToken.value,
      },
    });
  }
  getCartItems(): Observable<CartItem[]> {
    return this.cartItems$;
  }
  getCartItemCount(): Observable<number> {
    return this.cartItems$.pipe(
      map(items => items.reduce((total, item) => total + item.quantity, 0))
    );
  }
  // async getProducts() {
  //   (await this.product.getAllProducts())
  //     .subscribe((products) => {
  //       console.log(products);
  //       this.data = products['products'];
  //     });

  // }

  getCart() {
     return this.http.get(environment.URL + `user/cart/get-cart/${this.userId.value}`, {
      headers: {
        'x-access-token': this.accessToken.value,
      },
    });
  }



  // addProduct(product:any, count:any) {
  //   console.log(product);

  //   let added = false;
  //   for (let p of this.cart) {
  //     if (p['dishId'] === product._id) {
  //       p['quantity'] += count;
  //       added = true;
  //       break;
  //     }
  //   }
  //   if (!added) {
  //     product.amount = count;
  //     this.cart.push(product);
  //   }
  //   this.cartItemCount.next(this.cartItemCount.value + count);
  // }

  // decreaseProduct(product:any, value:any) {
  //   for (let [index, p] of this.cart.entries()) {
  //     if (p['dishId'] === product._id) {
  //       p['quantity'] -= value;
  //       if (p['quantity'] == 0) {
  //         this.cart.splice(index, 1);
  //       }
  //     }
  //   }
  //   this.cartItemCount.next(this.cartItemCount.value - value);
  // }

  // decreaseProduct(product) {
  //   for (let [index, p] of this.cart.entries()) {
  //     if (p._id === product._id) {
  //       p.amount -= 1;
  //       if (p.amount == 0) {
  //         this.cart.splice(index, 1);
  //       }
  //     }
  //   }
  //   this.cartItemCount.next(this.cartItemCount.value - 1);
  // }

  removeProduct(product: any) {
    for (let [index, p] of this.cart.entries()) {
      if (p['dishId'] === product._id) {
        this.cartItemCount.next(this.cartItemCount.value - p['quantity']);
        this.cart.splice(index, 1);
      }
    }
  }

  clearCart() {
    return this.http.delete(environment.URL + `user/cart/${this.userId.value}/clear`,{
      headers: {
        'x-access-token': this.accessToken.value,
      },
    })
  }
}
