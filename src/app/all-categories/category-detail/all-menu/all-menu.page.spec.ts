import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllMenuPage } from './all-menu.page';

describe('AllMenuPage', () => {
  let component: AllMenuPage;
  let fixture: ComponentFixture<AllMenuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllMenuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
