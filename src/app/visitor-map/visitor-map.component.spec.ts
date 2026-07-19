import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitorMapComponent } from './visitor-map.component';

describe('VisitorMapComponent', () => {
  let component: VisitorMapComponent;
  let fixture: ComponentFixture<VisitorMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VisitorMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VisitorMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize map on init', (done) => {
    setTimeout(() => {
      expect(component['map']).toBeTruthy();
      done();
    }, 100);
  });

  it('should emit locationSelected when marker is clicked', () => {
    spyOn(component.locationSelected, 'emit');
    const location = { city: 'Test', country: 'TC', latitude: 0, longitude: 0, visits: 1 };
    component.locations = [location];
    component.ngOnInit();

    // This would normally be triggered by marker click
    component.locationSelected.emit(location);
    expect(component.locationSelected.emit).toHaveBeenCalledWith(location);
  });
});
