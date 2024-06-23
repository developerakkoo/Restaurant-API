import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {

  isRegistering:boolean = false;
  registerButtonText:string = "CREATE AN ACCOUNT";
  form!:FormGroup;
  constructor(private router:Router,
    private formBuilder: FormBuilder,
              private toastController: ToastController,
              private userService: UserService
  ) {
    this.form = this.formBuilder.group({
      name:['',[]],
      email:[,[Validators.email]],
      phoneNumber:[],
      password:[]
    })
   }

  ngOnInit() {

  }

  registerHandler(){
    if(this.form.valid){
      console.log(this.form.value);
      this.isRegistering = true;
      this.registerButtonText = "";
      this.userService.signUpUser(this.form.value)
      .subscribe({
        next:async (value:any) =>{
          this.isRegistering = false;
          this.registerButtonText = "CREATE AN ACCOUNT";
          this.router.navigate(['login']);
        },
        error:(error:HttpErrorResponse) =>{
          console.log(error);
          this.isRegistering = false;
          this.registerButtonText = "CREATE AN ACCOUNT";
 
          
        }
      })  
    }
    
    // setTimeout(() =>
    //   {
    //  this.router.navigate(['login']);
    // },2000)
  }

}
