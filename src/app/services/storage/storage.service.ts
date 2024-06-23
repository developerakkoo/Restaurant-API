import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(private storage: Storage) {
    this.init();
   }

   init(){
    this.storage.create();
   }


   set(key:string, value:string){
    return this.storage.set(key,value);
   }

   get(key:string){
    return this.storage.get(key);
   }

   remove(key:string){
    return this.storage.remove(key);
   }

   clearAll(){
    return this.storage.clear();
   }
}
