import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryDetailPage } from './category-detail.page';

describe('CategoryDetailPage', () => {
  let component: CategoryDetailPage;
  let fixture: ComponentFixture<CategoryDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoryDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
