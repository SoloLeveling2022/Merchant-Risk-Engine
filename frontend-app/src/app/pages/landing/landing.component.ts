import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  isScrolled = false;

  navSections = [
    { id: 'what-is', label: 'Overview' },
    { id: 'rolling-reserves', label: 'Rolling Reserves' },
    { id: 'scheme-thresholds', label: 'VAMP & ECP' },
    { id: 'waterfall-ledger', label: '4-Tier Waterfall' },
  ];

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
