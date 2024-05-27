import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HotelDetailPage } from './hotel-detail.page';

describe('HotelDetailPage', () => {
  let component: HotelDetailPage;
  let fixture: ComponentFixture<HotelDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HotelDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
