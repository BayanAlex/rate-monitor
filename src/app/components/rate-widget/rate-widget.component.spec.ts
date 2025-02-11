import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RateWidgetComponent } from './rate-widget.component';

describe('RateWidgetComponent', () => {
  let component: RateWidgetComponent;
  let fixture: ComponentFixture<RateWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RateWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
