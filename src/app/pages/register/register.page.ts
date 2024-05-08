import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {

  isRegistering:boolean = false;
  registerButtonText:string = "CREATE AN ACCOUNT";
  constructor(private router:Router) { }

  ngOnInit() {
  }

  registerHandler(){
    this.isRegistering = true;
    this.registerButtonText = "";
    setTimeout(() =>{
     this.router.navigate(['login']);
    },2000)
  }

}
