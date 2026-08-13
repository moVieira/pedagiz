document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('contact-copy-btn');
  const emailText = document.getElementById('contact-email-text');
  if (!copyBtn || !emailText) return;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(emailText.textContent.trim());
    } catch (err) {
      console.error(err);
      return;
    }
    const icon = copyBtn.querySelector('.material-symbols-outlined');
    const original = icon.textContent;
    icon.textContent = 'check';
    copyBtn.title = 'Copiado!';
    setTimeout(() => {
      icon.textContent = original;
      copyBtn.title = 'Copiar e-mail';
    }, 1500);
  });
});
