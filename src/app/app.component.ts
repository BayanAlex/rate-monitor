import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RateWidgetComponent } from "./components/rate-widget/rate-widget.component";
import { AuthService } from './services/auth-service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RateWidgetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'Rate Monitor';

  constructor(
    private authService: AuthService
  ) {
    firstValueFrom(this.authService.login());
  }
}
