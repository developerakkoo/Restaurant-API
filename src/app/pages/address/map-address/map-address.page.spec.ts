import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapAddressPage } from './map-address.page';

describe('MapAddressPage', () => {
  let component: MapAddressPage;
  let fixture: ComponentFixture<MapAddressPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapAddressPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
