I will increase the logo size across the application to ensure it looks harmonious and consistent.

### 1. Update Header Logo

In `frontend/src/components/Header.tsx`:

* Increase the CSS height class from `h-12` (48px) to `h-16` (64px).

* Update the `Image` props to `width={210}` and `height={65}` to match the new size and the natural aspect ratio (\~3.2:1).

### 2. Update Footer Logo

In `frontend/src/app/layout.tsx`:

* Increase the logo size in the footer.

* Update `Image` props from `width={150} height={50}` to `width={210} height={65}`.

### 3. Update Login Page Logo

In `frontend/src/app/auth/login/page.tsx`:

* Increase the logo size above the login form.

* Update `Image` props from `width={160} height={50}` to `width={240} height={75}`.

### 4. Update 404 Page Logo

In `frontend/src/app/not-found.tsx`:

* Increase the logo size on the error page.

* Update `Image` props from `width={300} height={100}` to `width={400} height={125}`.

<br />

