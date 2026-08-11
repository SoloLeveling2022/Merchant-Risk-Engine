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
    { id: 'what-is', label: 'What is StockShield' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'risk-model', label: 'Risk Model' },
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

