import {Component, OnDestroy, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

@Component({
  selector: 'app-visitor-dashboard',
  templateUrl: './visitor-dashboard.component.html',
  styleUrls: ['./visitor-dashboard.component.scss']
})
export class VisitorDashboardComponent implements OnInit, OnDestroy {
  days = 30;
  page = 1;
  pageSize = 10;
  totalPages = 1;
  loading = true;
  locations: any[] = [];
  visits: any[] = [];
  summary = {totalVisits: 0, countries: 0, visitsToday: 0};
  selectedLocation: any = null;
  private refreshTimer: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
    this.refreshTimer = setInterval(() => this.load(false), 30000);
  }

  ngOnDestroy(): void { if (this.refreshTimer) clearInterval(this.refreshTimer); }

  load(showLoading: boolean = true): void {
    if (showLoading) this.loading = true;
    const location = this.selectedLocation ? `&country=${this.selectedLocation.countryCode}&city=${encodeURIComponent(this.selectedLocation.city || '')}` : '';
    this.http.get<any>(`${environment.visitorApiUrl}/visitor-map?days=${this.days}&page=${this.page}&limit=${this.pageSize}${location}`)
      .subscribe(data => {
        this.locations = data.locations;
        this.visits = data.visits;
        this.summary = data.summary;
        this.totalPages = Math.max(1, Math.ceil(data.total / this.pageSize));
        this.loading = false;
      }, () => this.loading = false);
  }

  changeRange(): void { this.page = 1; this.selectedLocation = null; this.load(); }
  selectLocation(location: any): void { this.selectedLocation = location; this.page = 1; this.load(); }
  clearLocation(): void { this.selectedLocation = null; this.page = 1; this.load(); }
  previousPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }

  countryFlag(code: string): string {
    if (!code || code.length !== 2) return '🌍';
    return code.toUpperCase().replace(/./g, character => String.fromCodePoint(127397 + character.charCodeAt(0)));
  }
}
