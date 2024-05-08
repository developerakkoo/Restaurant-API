import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllCategoriesPage } from './all-categories.page';

describe('AllCategoriesPage', () => {
  let component: AllCategoriesPage;
  let fixture: ComponentFixture<AllCategoriesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllCategoriesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
