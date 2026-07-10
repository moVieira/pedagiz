let currentMethod = 'pix';
let cardBrickController = null;

document.addEventListener('DOMContentLoaded', renderCart);

function copyPixCode(text, btn) {
  const original = btn.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">check</span> Copiado!';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  }).catch((err) => {
    console.error(err);
    alert('Não foi possível copiar o código.');
  });
}

function renderCart() {
  const list = document.getElementById('cart-list');
  const summary = document.getElementById('cart-summary');
  if (!list || !summary) return;

  const items = Cart.getItems();
  if (!items.length) {
    list.innerHTML = '<p class="empty-state">Seu carrinho está vazio. <a href="index.html">Explorar catálogo</a></p>';
    summary.innerHTML = '';
    return;
  }

  list.innerHTML = items.map((i) => `
    <div class="cart-item">
      <div class="cover ${tintFor(i.slug)}"></div>
      <div class="info">
        <div class="title">${escapeHtml(i.title)}</div>
        <div class="creator">${escapeHtml(i.creator || '')}</div>
      </div>
      <span class="price">${formatPrice(i.price)}</span>
      <button class="remove" data-remove="${i.id}" title="Remover" type="button">✕</button>
    </div>`).join('');

  const total = Cart.total();
  summary.innerHTML = `
    <div class="summary-card">
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(total)}</span></div>
      <div class="summary-total"><span>Total</span><span>${formatPrice(total)}</span></div>
      <div class="payment-tabs">
        <div class="payment-tab" data-method="pix">Pix</div>
        <div class="payment-tab" data-method="card">Cartão</div>
        <div class="payment-tab" data-method="boleto">Boleto</div>
      </div>
      <div id="payment-method-body"></div>
      <p id="checkout-error" class="form-error"></p>
      <div id="payment-result"></div>
    </div>`;

  list.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Cart.remove(Number(btn.dataset.remove));
      renderCart();
      initHeader();
    });
  });

  document.querySelectorAll('.payment-tab').forEach((tab) => {
    tab.addEventListener('click', () => selectMethod(tab.dataset.method));
  });
  selectMethod('pix');
}

function selectMethod(method) {
  currentMethod = method;
  document.querySelectorAll('.payment-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.method === method);
  });

  const errorBox = document.getElementById('checkout-error');
  errorBox.classList.remove('show');
  document.getElementById('payment-result').innerHTML = '';

  if (cardBrickController) {
    cardBrickController.unmount();
    cardBrickController = null;
  }

  const body = document.getElementById('payment-method-body');
  if (method === 'pix') {
    body.innerHTML = '<button class="btn btn-dark btn-block" id="pix-btn" type="button">Pagar com Pix</button>';
    document.getElementById('pix-btn').addEventListener('click', (e) => {
      runCheckout({ paymentMethod: 'pix' }, e.currentTarget, 'Gerando Pix…', 'Pagar com Pix');
    });
  } else if (method === 'card') {
    body.innerHTML = '<div id="card-brick-container"></div>';
    initCardBrick();
  } else if (method === 'boleto') {
    body.innerHTML = `
      <div class="field"><label for="boleto-cpf">CPF</label><input type="text" id="boleto-cpf" placeholder="000.000.000-00" required></div>
      <div class="field"><label for="boleto-cep">CEP</label><input type="text" id="boleto-cep" placeholder="00000-000" required></div>
      <div class="field"><label for="boleto-street">Rua</label><input type="text" id="boleto-street" required></div>
      <div style="display:flex;gap:10px;">
        <div class="field" style="flex:1;"><label for="boleto-number">Número</label><input type="text" id="boleto-number" required></div>
        <div class="field" style="flex:2;"><label for="boleto-neighborhood">Bairro</label><input type="text" id="boleto-neighborhood" required></div>
      </div>
      <div style="display:flex;gap:10px;">
        <div class="field" style="flex:2;"><label for="boleto-city">Cidade</label><input type="text" id="boleto-city" required></div>
        <div class="field" style="flex:1;"><label for="boleto-state">UF</label><input type="text" id="boleto-state" maxlength="2" required></div>
      </div>
      <button class="btn btn-dark btn-block" id="boleto-btn" type="button">Gerar boleto</button>`;
    document.getElementById('boleto-btn').addEventListener('click', (e) => {
      submitBoleto(e.currentTarget);
    });
  }
}

async function initCardBrick() {
  const container = document.getElementById('card-brick-container');
  if (typeof MercadoPago === 'undefined' || typeof MP_PUBLIC_KEY === 'undefined') {
    container.innerHTML = '<p class="empty-state">Não foi possível carregar o pagamento por cartão.</p>';
    return;
  }

  const mp = new MercadoPago(MP_PUBLIC_KEY);
  const total = Cart.total();

  try {
    cardBrickController = await mp.bricks().create('cardPayment', 'card-brick-container', {
      initialization: { amount: total },
      locale: 'pt-BR',
      callbacks: {
        onReady: () => {},
        onError: (error) => {
          console.error(error);
          const errorBox = document.getElementById('checkout-error');
          errorBox.textContent = 'Não foi possível carregar o formulário de cartão.';
          errorBox.classList.add('show');
        },
        onSubmit: (cardData, additionalData) => submitCard(cardData, additionalData)
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="empty-state">Não foi possível carregar o formulário de cartão.</p>';
  }
}

function submitCard(cardData, additionalData) {
  const paymentMethod = additionalData?.paymentTypeId === 'debit_card' ? 'debito' : 'credito';
  return runCheckout({
    paymentMethod,
    card: {
      token: cardData.token,
      paymentMethodId: cardData.payment_method_id,
      issuerId: cardData.issuer_id,
      installments: cardData.installments
    },
    payer: { cpf: cardData.payer?.identification?.number }
  });
}

function submitBoleto(btn) {
  const cpf = document.getElementById('boleto-cpf').value.trim();
  const zipCode = document.getElementById('boleto-cep').value.trim();
  const streetName = document.getElementById('boleto-street').value.trim();
  const streetNumber = document.getElementById('boleto-number').value.trim();
  const neighborhood = document.getElementById('boleto-neighborhood').value.trim();
  const city = document.getElementById('boleto-city').value.trim();
  const state = document.getElementById('boleto-state').value.trim().toUpperCase();

  const errorBox = document.getElementById('checkout-error');
  if (!cpf || !zipCode || !streetName || !streetNumber || !neighborhood || !city || !state) {
    errorBox.textContent = 'Preencha todos os campos para gerar o boleto.';
    errorBox.classList.add('show');
    return;
  }

  runCheckout({
    paymentMethod: 'boleto',
    payer: { cpf, address: { zipCode, streetName, streetNumber, neighborhood, city, state } }
  }, btn, 'Gerando boleto…', 'Gerar boleto');
}

async function runCheckout(payload, btn, loadingText, idleText) {
  const errorBox = document.getElementById('checkout-error');
  errorBox.classList.remove('show');

  if (!Auth.isLogged()) {
    window.location.href = 'login.html?next=carrinho.html';
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = loadingText;
  }

  try {
    const purchasedItems = Cart.getItems();
    payload.items = purchasedItems.map((i) => ({ productId: i.id }));
    const result = await Api.checkout(payload);
    Cart.clear();
    initHeader();
    renderPaymentResult(result, purchasedItems);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add('show');
    if (btn) {
      btn.disabled = false;
      btn.textContent = idleText;
    }
    throw err;
  }
}

async function renderPaymentResult(result, purchasedItems) {
  document.querySelector('.payment-tabs').style.display = 'none';
  document.getElementById('payment-method-body').style.display = 'none';

  const resultBox = document.getElementById('payment-result');

  if (result.method === 'pix') {
    resultBox.innerHTML = `
      <div class="pix-box">
        ${result.pix.qrCodeBase64 ? `<img src="data:image/png;base64,${result.pix.qrCodeBase64}" alt="QR Code Pix" width="220" height="220">` : ''}
        <div class="pix-code">${escapeHtml(result.pix.qrCode || 'Código Pix indisponível')}</div>
        ${result.pix.qrCode ? '<button class="btn btn-outline btn-block" id="copy-pix-btn" type="button"><span class="material-symbols-outlined" style="font-size:16px;">content_copy</span> Copiar código</button>' : ''}
        <p>Pedido #${result.orderId} criado. Assim que o pagamento for confirmado, os materiais aparecem em <a href="downloads.html">Meus materiais</a>.</p>
      </div>`;

    const copyBtn = document.getElementById('copy-pix-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => copyPixCode(result.pix.qrCode, copyBtn));
  } else if (result.method === 'boleto') {
    resultBox.innerHTML = `
      <div class="boleto-box">
        <p>Pedido #${result.orderId} criado.</p>
        ${result.boleto?.ticketUrl ? `<a class="btn btn-dark btn-block" href="${escapeHtml(result.boleto.ticketUrl)}" target="_blank" rel="noopener">Ver boleto</a>` : ''}
        <div class="barcode">${escapeHtml(result.boleto?.digitableLine || result.boleto?.barcodeContent || '')}</div>
        <p>Assim que o pagamento for compensado, os materiais aparecem em <a href="downloads.html">Meus materiais</a>.</p>
      </div>`;
  } else {
    const approved = result.status === 'processed' || result.statusDetail === 'accredited';
    resultBox.innerHTML = `
      <div class="pix-box">
        <p><span class="material-symbols-outlined filled" style="font-size:20px;color:#4A6B5C;">check_circle</span> ${approved ? 'Pagamento aprovado!' : `Pagamento em análise (status: ${escapeHtml(result.status)}).`}</p>
        <p>Pedido #${result.orderId}. ${approved ? 'Seus materiais já estão em' : 'Assim que aprovado, os materiais aparecem em'} <a href="downloads.html">Meus materiais</a>.</p>
        <div id="instant-downloads"></div>
      </div>`;

    if (approved) await renderInstantDownloads(purchasedItems);
  }
}

async function renderInstantDownloads(purchasedItems) {
  const box = document.getElementById('instant-downloads');
  if (!box) return;
  try {
    const { downloads } = await Api.myDownloads();
    const purchasedIds = new Set((purchasedItems || []).map((i) => i.id));
    const matches = downloads.filter((d) => purchasedIds.has(d.product_id));
    if (!matches.length) return;

    box.innerHTML = matches.map((d) => `
      <div class="download-row" style="margin-top:14px;text-align:left;">
        <div class="download-thumb ${d.cover_image ? '' : tintFor(d.title)}">${d.cover_image ? `<img src="${escapeHtml(mediaUrl(d.cover_image))}" alt="${escapeHtml(d.title)}">` : ''}</div>
        <div class="download-info">
          <div class="title">${escapeHtml(d.title)}</div>
          <div class="download-tags"><span>${escapeHtml(d.file_type)}</span></div>
        </div>
        <div class="download-actions">
          <button class="btn btn-dark" data-download="${d.download_token}" data-name="${escapeHtml(d.title)}" type="button"><span class="material-symbols-outlined" style="font-size:16px;">download</span> Baixar</button>
        </div>
      </div>`).join('');

    box.querySelectorAll('[data-download]').forEach((btn) => {
      btn.addEventListener('click', () => downloadFile(btn));
    });
  } catch (err) {
    console.error(err);
  }
}