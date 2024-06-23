import { Component } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { StorageService } from './services/storage/storage.service';
import { Router } from '@angular/router';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private data: StorageService,
              private router: Router
  ) {
    this.checkForLoginStatus();
  }

  async checkForLoginStatus(){
    let userId = await this.data.get("userId");
    console.log(userId);
    if(userId != null || userId != undefined){
      console.log("userid not null");
      this.router.navigate(['tabs','tabs','tab1']);

      
    }
    else{
      this.router.navigate(['/login']);
    }
    
  }
}
