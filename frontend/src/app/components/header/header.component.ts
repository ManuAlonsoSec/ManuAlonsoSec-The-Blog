import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  mobileMenuOpen = signal(false);

  toggleMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
