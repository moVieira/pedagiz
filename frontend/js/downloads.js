document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) {
    window.location.href = 'login.html?next=downloads.html';
    return;
  }

  const user = Auth.getUser();
  const nameEl = document.getElementById('account-name');
  const emailEl = document.getElementById('account-email');
  if (nameEl) nameEl.textContent = user?.name || '';
  if (emailEl) emailEl.textContent = user?.email || '';

  const adminLink = document.getElementById('account-admin-link');
  if (adminLink && user?.role === 'admin') adminLink.style.display = '';

  const list = document.getElementById('downloads-list');
  const countEl = document.getElementById('downloads-count');
  if (!list) return;

  try {
    const { downloads } = await Api.myDownloads();
    if (countEl) {
      countEl.textContent = `${downloads.length} ${downloads.length === 1 ? 'item' : 'itens'} · acesso vitalício a tudo que você comprou`;
    }

    list.innerHTML = downloads.length ? downloads.map((d) => `
      <div class="download-row">
        <div class="download-thumb ${tintFor(d.title)}"></div>
        <div class="download-info">
          <div class="title">${escapeHtml(d.title)}</div>
          <div class="meta">por ${escapeHtml(d.creator_name)} · comprado em ${new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
          <div class="download-tags"><span>${escapeHtml(d.file_type)}</span></div>
        </div>
        <div class="download-actions">
          <button class="btn btn-dark" data-download="${d.download_token}" data-name="${escapeHtml(d.title)}" type="button">⬇ Baixar</button>
        </div>
      </div>`).join('') : '<p class="empty-state">Você ainda não comprou nenhum material.</p>';

    list.querySelectorAll('[data-download]').forEach((btn) => {
      btn.addEventListener('click', () => downloadFile(btn));
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Não foi possível carregar seus materiais agora.</p>';
    console.error(err);
  }
});

async function downloadFile(btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Baixando...';
  try {
    const res = await fetch(`${API_BASE_URL}/downloads/${btn.dataset.download}/file`, {
      headers: { Authorization: `Bearer ${Auth.getToken()}` }
    });
    if (!res.ok) throw new Error('Não foi possível baixar o arquivo.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = btn.dataset.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}