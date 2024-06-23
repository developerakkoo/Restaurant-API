import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  userAuthState:BehaviorSubject<any> = new BehaviorSubject(false);
  accessToken: BehaviorSubject<string> = new BehaviorSubject("");
  userId: BehaviorSubject<string> = new BehaviorSubject("");
  constructor(private http: HttpClient,
              private storage: StorageService
  ) {
    this.init();
   }


  async init(){
    let token = await this.storage.get("accessToken");
    let userId = await this.storage.get("userId");

    this.accessToken.next(token);
    this.userId.next(userId);
  }

  signUpUser(body:{}){
    return this.http.post(environment.URL + "auth/user/register", body);
  }

  
  signInWithGoogle(){

  }

  signInWithFacebook(){

  }

  signInWithApple(){

  }


  signInUser(body:{}){
    return this.http.post(environment.URL + "auth/user/login", body);

  }

  logout(id:string){
    this.http.post(environment.URL + "user/logout",{});
  }

  getUserProfile(id:string){

  }

  addUserAddress(body:{}){
    return this.http.post(environment.URL + `user/add-address`, body, {
      headers:{
        'x-access-token': this.accessToken.value
      }
    });
  }
  getUserAddress(){
    return this.http.get(environment.URL + `user/get/all-address/${this.userId.value}`,{
      headers:{
        'x-access-token': this.accessToken.value
      }
    })
  }

  getUserFavoriteHotels(){

  }

  getUserOrders(){

  }


  deleteUserAccount(){

  }


}
