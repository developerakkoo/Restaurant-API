import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  isRegistering:boolean = false;
  loginButtonText:string = "SIGN IN";
  constructor(private router:Router) {}

  ngOnInit() {}

  loginHandler() {
    this.isRegistering = true;
    this.loginButtonText = "";
    setTimeout(() =>{
     this.router.navigate(['tabs','tabs','tab1']);
    },2000)
  }

  buttonFocusEvent(ev: any) {
    console.log(ev);
  }

  buttonBlurEvent(ev: any) {
    console.log(ev);
  }
}
