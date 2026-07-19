import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'sohaib';
  scrolled = false;
  isVisitorPage = false;

  constructor(private router: Router) {
    this.updatePageLayout(this.router.url);
    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => this.updatePageLayout(event.urlAfterRedirects));
  }

  onWindowScroll(event: any): void {
    this.scrolled = window.scrollY > 50;
  }

  private updatePageLayout(url: string): void {
    this.isVisitorPage = url.split('?')[0] === '/visitors';
  }
}
