// Single shared modal overlay used by the equation, spec-sheet and scenario dialogs.

let overlay: HTMLElement | null = null;
let modal: HTMLElement | null = null;

function ensure(): void {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'overlay';
  modal = document.createElement('div');
  modal.className = 'modal';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

export function openModal(html: string): void {
  ensure();
  modal!.innerHTML = `<button class="close">✕ close</button>${html}`;
  modal!.querySelector('.close')!.addEventListener('click', closeModal);
  overlay!.classList.add('show');
}

export function closeModal(): void {
  overlay?.classList.remove('show');
}

export function isModalOpen(): boolean {
  return !!overlay?.classList.contains('show');
}
