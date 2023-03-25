import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { CookieService } from 'ngx-cookie-service';
import { UserInfo } from './UserInfo';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'proiectMDSAngular';

  userInfo?: UserInfo;
  loginForm = this.formBuilder.group({
    email: '',
    password: ''
  });

  signupForm = this.formBuilder.group({
    email: '',
    password: ''
  });

  constructor(private http: HttpClient, private formBuilder: FormBuilder,
    private cookieService: CookieService) {

  }

  ngOnInit() {
    this.http.get<UserInfo>("/api/whoami", {withCredentials: true})
      .subscribe((x) => {
        this.userInfo = x;
        this.loginForm.reset();
      });
  }

  onSubmit(): void {

    this.http.post("/api/login", this.loginForm.value, { responseType: "text", withCredentials: true })
      .subscribe((x) => {
        console.log(x);
        this.ngOnInit();
      });
  }

  onSignUp(): void{
    this.http.post<UserInfo>("/api/signup", this.signupForm.value, {withCredentials: true})
    .subscribe((x) => {
        console.log(x);
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
