import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { StorageService } from 'src/app/services/storage/storage.service';
import { UserService } from 'src/app/services/user/user.service';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  isRegistering:boolean = false;
  loginButtonText:string = "SIGN IN";
  form!:FormGroup;
  constructor(private router:Router,
    private formBuilder: FormBuilder,
              private toastController: ToastController,
              private userService: UserService,
              private data: StorageService,) {
                this.form = this.formBuilder.group({
                  email:[,[Validators.email, Validators.required]],
                  password:[,[Validators.required]]
                })
              }

  ngOnInit() {}

  loginHandler() {
    if(this.form.valid){
      console.log(this.form.value);
      this.isRegistering = true;
      this.loginButtonText = "";
      this.userService.signInUser(this.form.value)
      .subscribe({
        next:async (value:any) =>{
          console.log(value);
          
          this.isRegistering = false;
          this.loginButtonText = "SIGN IN";
          let userId = value['data']['userId'];
          let accessToken = value['data']['accessToken'];
          let refreshToken = value['data']['refreshToken'];
          await this.data.set("userId", userId);
          await this.data.set("accessToken", accessToken);
          await this.data.set("refreshToken", refreshToken);

          this.router.navigate(['tabs','tabs','tab1']);
        },
        error:(error:HttpErrorResponse) =>{
          console.log(error.error.message);
          this.isRegistering = false;
          this.loginButtonText = "SIGN IN";
 
          
        }
      })  
    }
    
  }

  buttonFocusEvent(ev: any) {
    console.log(ev);
  }

  buttonBlurEvent(ev: any) {
    console.log(ev);
  }
}
