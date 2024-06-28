import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { CategoriesService } from 'src/app/services/category/categories.service';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-all-categories',
  templateUrl: './all-categories.page.html',
  styleUrls: ['./all-categories.page.scss'],
})
export class AllCategoriesPage implements OnInit {

  categories:any[] = [];
  constructor(private modalController: ModalController,
              private router: Router,
              private cat: CategoriesService,
              private user: UserService
  ) { }

  ngOnInit() {
  }

  dismissModal(){
    this.modalController.dismiss();
  }

  dismiss(cat:any){
    this.modalController.dismiss();
    this.router.navigate(['all-categories', 'category-detail', cat['_id'], cat['name']])
  }

  ionViewDidEnter(){
    this.getAllCategory();
  }
  getAllCategory(){
    this.cat.getAllCategory()
    .subscribe({
      next:(cat:any) =>{
        console.log(cat);
        this.categories = cat['data']['content'];
        console.log(this.categories);
        
        
      },
      error:(error:HttpErrorResponse) =>{
        console.log(error.error.message);
        
      }
    })
  }
}
