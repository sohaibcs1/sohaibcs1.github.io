import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-visitor-map',
  templateUrl: './visitor-map.component.html',
  styleUrls: ['./visitor-map.component.scss']
})
export class VisitorMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() locations: any[] = [];
  @Input() compact = false;
  @Output() locationSelected = new EventEmitter<any>();
  @ViewChild('mapContainer', {static: false}) mapContainer: ElementRef;

  private map: L.Map;
  private markerLayer: L.LayerGroup;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20, 0],
      zoom: this.compact ? 1 : 2,
      minZoom: 1,
      maxZoom: 8,
      dragging: !this.compact,
      scrollWheelZoom: !this.compact,
      doubleClickZoom: !this.compact,
      touchZoom: !this.compact,
      zoomControl: !this.compact,
      worldCopyJump: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.map.on('zoomend', () => this.renderMarkers());
    this.renderMarkers();
    setTimeout(() => this.map.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.locations && this.map) this.renderMarkers();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private renderMarkers(): void {
    if (!this.markerLayer) return;
    this.markerLayer.clearLayers();

    this.clusterLocations().forEach(cluster => {
      const size = Math.min(54, 30 + Math.sqrt(cluster.visits) * 2.2);
      const icon = L.divIcon({
        className: 'visitor-cluster-marker',
        html: `<span>${cluster.visits}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      const marker = L.marker([cluster.latitude, cluster.longitude], {icon});
      marker.bindTooltip(this.clusterLabel(cluster), {direction: 'top', offset: [0, -size / 2]});
      marker.on('click', () => {
        if (this.compact) return;
        if (cluster.locations.length === 1) {
          this.locationSelected.emit(cluster.locations[0]);
        } else {
          this.map.setView([cluster.latitude, cluster.longitude], Math.min(7, this.map.getZoom() + 2));
        }
      });
      marker.addTo(this.markerLayer);
    });
  }

  private clusterLocations(): any[] {
    const zoom = this.map ? this.map.getZoom() : 1;
    const gridSize = zoom <= 1 ? 16 : zoom === 2 ? 8 : zoom === 3 ? 4 : zoom === 4 ? 2 : .25;
    const groups: {[key: string]: any} = {};

    (this.locations || []).forEach(location => {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (!isFinite(latitude) || !isFinite(longitude)) return;
      const key = `${Math.round(latitude / gridSize)}:${Math.round(longitude / gridSize)}`;
      if (!groups[key]) groups[key] = {latitude: 0, longitude: 0, weight: 0, visits: 0, locations: []};
      const weight = Math.max(1, Number(location.visits) || 1);
      groups[key].latitude += latitude * weight;
      groups[key].longitude += longitude * weight;
      groups[key].weight += weight;
      groups[key].visits += weight;
      groups[key].locations.push(location);
    });

    return Object.keys(groups).map(key => ({
      ...groups[key],
      latitude: groups[key].latitude / groups[key].weight,
      longitude: groups[key].longitude / groups[key].weight
    }));
  }

  private clusterLabel(cluster: any): string {
    const cities = cluster.locations.map(location => location.city || location.country || 'Unknown')
      .filter((city, index, all) => all.indexOf(city) === index).slice(0, 3).join(', ');
    return `${cities}${cluster.locations.length > 3 ? '…' : ''} · ${cluster.visits} ${cluster.visits === 1 ? 'visit' : 'visits'}`;
  }
}
