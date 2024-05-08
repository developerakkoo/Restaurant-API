import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-all-categories',
  templateUrl: './all-categories.page.html',
  styleUrls: ['./all-categories.page.scss'],
})
export class AllCategoriesPage implements OnInit {

  constructor(private modalController: ModalController,
              private router: Router
  ) { }

  ngOnInit() {
  }

  dismiss(){
    this.modalController.dismiss();
    this.router.navigate(['all-categories', 'category-detail'])
  }

}
