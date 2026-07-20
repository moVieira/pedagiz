document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  if (Auth.isLogged()) {
    window.location.href = params.get('next') || '/';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorBox = document.getElementById('form-error');

  const next = params.get('next');
  if (next) {
    const switchLink = document.querySelector('.auth-switch a');
    if (switchLink) switchLink.href += `?next=${encodeURIComponent(next)}`;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.remove('show');
      try {
        const { user, token } = await Api.login({
          email: loginForm.email.value.trim(),
          password: loginForm.password.value
        });
        Auth.setSession(token, user);
        window.location.href = params.get('next') || '/';
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.add('show');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.remove('show');
      try {
        const { user, token } = await Api.register({
          name: registerForm.name.value.trim(),
          email: registerForm.email.value.trim(),
          password: registerForm.password.value
        });
        Auth.setSession(token, user);
        window.location.href = params.get('next') || '/';
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.add('show');
      }
    });
  }
});