import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CategoriesService } from 'src/app/services/category/categories.service';
var ScrollReveal:any;
@Component({
  selector: 'app-category-detail',
  templateUrl: './category-detail.page.html',
  styleUrls: ['./category-detail.page.scss'],
})
export class CategoryDetailPage implements OnInit {

  searchBarPlaceholder:string = "Search By Hotel Name";
  categoryId:any;
  categoryName:any;
  hotels:any[] = [];

  constructor(private category: CategoriesService,
    private router: Router,
    private route:ActivatedRoute,
              private loadingController: LoadingController
  ) { 
    this.categoryId = this.route.snapshot.paramMap.get("id");
    this.categoryName = this.route.snapshot.paramMap.get("name");
    
  }

  ngOnInit() {
  }

  ionViewDidEnter(){
    this.getAllHotelsByCategory();
  }

  onSearchChange(ev:any){
    let searchTerm = ev.detail.value;
    console.log(searchTerm);
    this.category.getHotelsByCategory(this.categoryId, searchTerm)
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        this.hotels = value['data']['content'];
      },
      error:async(error: HttpErrorResponse) =>{
        console.log(error);
        
      }
    })
  }

  async getAllHotelsByCategory(){
 
    this.category.getHotelsByCategory(this.categoryId)
    .subscribe({
      next:async(value:any) =>{
        console.log(value);
        this.hotels = value['data']['content'];
      },
      error:async(error: HttpErrorResponse) =>{
        console.log(error);
        
      }
    })
  }

  openHotelDetailPage(hotel:any){
    console.log(hotel);
    this.router.navigate(['all-categories','category-detail',this.categoryId, this.categoryName, 'hotel-detail', hotel.hotelId, hotel.hotelName]);
    
  }


}
