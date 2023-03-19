import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'proiectMDSAngular';

  sessionID?: string;
  isLoggedIn = false;
  loginForm = this.formBuilder.group({
    email: '',
    password: ''
  });

  constructor(private http: HttpClient, private formBuilder: FormBuilder,
    private cookieService: CookieService) {

  }

  ngOnInit() {
    this.http.get("/api/whoami", {responseType: "text", withCredentials: true})
      .subscribe((x) => {
        if (x === "false")
        {
          this.isLoggedIn = false;
        }
        else 
        {
          this.isLoggedIn = true;
          this.sessionID = "session id here!";
        }
        this.loginForm.reset();
      });
  }

  onSubmit(): void {

    this.http.post("/api/login", this.loginForm.value, { responseType: "text", withCredentials: true })
      .subscribe((x) => {
        this.sessionID = x;
        this.ngOnInit();
      });
  }

  onLogOut() : void {
    this.http.get("/api/logout", {responseType: "text", withCredentials: true})
      .subscribe((x) => {
        
        this.ngOnInit();
      });
  }

}
