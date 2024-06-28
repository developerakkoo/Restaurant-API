import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
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

  getAllCategory(){
    return this.http.get(environment.URL + `admin/category/get/all`,{
      headers:{
        'x-access-token': this.accessToken.value.toString()
      }
    });
  }

  getHotelsByCategory(cat:any, query:string = ""){
    return this.http.get(environment.URL + `hotel/get-by/${cat}/category?populate=1&q=${query}`,{
      headers:{
        'x-access-token': this.accessToken.value.toString()
      }
    })
  }
  
  getHotelMenuById(hotelId:any, query:string = "", populate:number = 1){
    return this.http.get(environment.URL + `hotel/search-dish?populate=${populate}&hotelId=${hotelId}&q=${query}`,{
      headers:{
        'x-access-token': this.accessToken.value.toString()
      }
    })
  }
}
