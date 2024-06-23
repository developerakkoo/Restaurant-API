import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-add-address',
  templateUrl: './add-address.page.html',
  styleUrls: ['./add-address.page.scss'],
})
export class AddAddressPage implements OnInit {

  @Input() value:any;
  form:FormGroup;
  constructor(private modalController: ModalController,
    private formBuilder: FormBuilder,private user: UserService
  ) {
    this.form = this.formBuilder.group({
      address:[this.value,[Validators.required]],
      type:[,[Validators.required]],
      isSelected:[,[Validators.required]]
    })
   }

  ngOnInit() {
    console.log(this.value);
    this.form.patchValue({address:this.value})
    
  }

  close(){
    this.modalController.dismiss();
  }

  async onSubmit(){
    if(this.form.valid){
      console.log(this.form.value);
      this.user.addUserAddress(this.form.value)
      .subscribe({
        next:async(value:any) =>{
          console.log(value);
          
        },
        error:async(error:HttpErrorResponse) =>{
          console.log(error.error.message);
          
        }
      })
      
    }
  }
}
