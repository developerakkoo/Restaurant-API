import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Position } from '@capacitor/geolocation';
import { GoogleMap } from '@capacitor/google-maps';
import { ModalController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { AddAddressPage } from '../add-address/add-address.page';

@Component({
  selector: 'app-map-address',
  templateUrl: './map-address.page.html',
  styleUrls: ['./map-address.page.scss'],
})
export class MapAddressPage implements OnInit {
  @ViewChild('map')
  mapRef!: ElementRef<HTMLElement>;
  newMap!: GoogleMap;
  lng:any;
  lon:any;
  formattedAddress:any;

  reverseGeocodeAddressList:any[] = [];
  constructor(private route: ActivatedRoute,
              private http: HttpClient,
              private modalController: ModalController
  ) { 
    this.lng = this.route.snapshot.paramMap.get("lat");
    this.lon = this.route.snapshot.paramMap.get("lng");
    console.log(this.lng);
    console.log(this.lon);
    this.reverseGeocoding(this.lng, this.lon);
  }

  ngOnInit() {
  }
  ionViewDidEnter(){
    this.createMap();
  }

  // async presentModal() {
  //   const modal = await this.modalController.create({
  //   component: ModalPage,
  //   componentProps: { value: 123 },
  //   mode:'ios',
  //   });
  
  //   await modal.present();
  
  // }

  async createMap() {
    this.newMap = await GoogleMap.create({
      id: 'my-cool-map',
      element: document.getElementById("map")!,
      apiKey: environment.apiKey,
      language:"en",
      config: {
        draggableCursor:"true",

        draggable:true,
        center: {
          lat: parseFloat(this.lng),
          lng:  parseFloat(this.lon)
        },
        zoom: 15,
        
      },
    });
// Enable marker clustering
await this.newMap.enableClustering();
// Handle marker click
await this.newMap.setOnMarkerClickListener((event) => {
  console.log(event);
  
});

// Handle marker click
await this.newMap.setOnMarkerDragEndListener((event) => {
  console.log(event);
  this.reverseGeocoding(event['latitude'], event['longitude']);
  
});
await this.newMap.enableCurrentLocation(true);
    const marker = await this.newMap.addMarker({
      draggable:true,
      title:"My Location",
      iconUrl:"assets/gps.png",
      iconSize:{
        width:30,
        height:30
      },
      iconAnchor:{
        x:15,
        y:30
      },
      isFlat: true,
      coordinate:{
        lat: parseFloat(this.lng),
        lng: parseFloat(this.lon)
      }
    })

    
  
  }

  reverseGeocoding(lat:any, lng:any){
    this.http.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${environment.apiKey}`)
    .subscribe({
      next:(value:any) =>{
        console.log(value);
        this.reverseGeocodeAddressList = value['results'];
        this.formattedAddress = value['results'][0]['formatted_address'];
      },
      error(err:any) {
            console.log(err);
            
      },
    })
  }

  async presentModal() {
    
  
  }
  async openAddAddressPage(){
    const modal = await this.modalController.create({
      component: AddAddressPage,
      componentProps: { value: this.formattedAddress }
      });
    
      await modal.present();
    
      const data = await modal.onDidDismiss();
      console.log(data);
  }
}
