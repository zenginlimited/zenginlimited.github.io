class Toast extends HTMLElement {
	static get observedAttributes() {
		return ['timeout']
	}

	static styleSheet = (() => {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(`
			:host {
				-webkit-user-select: none;
				align-items: flex-end;
				bottom: 20px;
				display: flex;
				flex-direction: column;
				gap: .3em;
				pointer-events: none;
				position: fixed;
				right: 20px;
				touch-action: none;
				user-select: none;
				z-index: 40;
			}

			.toast {
				animation: slide-in 250ms ease-out forwards;
				backdrop-filter: blur(.5em);
				background-color: var(--toast-background, hsl(var(--toast-tint, 0) var(--toast-saturation, 0%) calc(5% + var(--toast-brightness, 0%)) / 85%));
				border: var(--toast-border, 1px solid hsl(var(--toast-tint, 0) var(--toast-saturation, 0%) calc(50% + var(--toast-brightness, 0%)) / 8%));
				border-radius: .3em;
				box-shadow: 0 0 4px 0 var(--toast-background, hsl(var(--toast-tint, 0) var(--toast-saturation, 0%) 2.5% / 50%));
				color: var(--toast-color, hsl(var(--toast-tint, 0) var(--toast-saturation, 0%) 85%));
				line-height: 100%;
				overflow: hidden;
				padding: var(--toast-padding, .75em);
				/* pointer-events: all;
				touch-action: manipulation; */
				transition: bottom .3s ease, width .2s ease;
			}

			.toast.interactable, .toast:not(.removing) > button {
				pointer-events: all;
				touch-action: manipulation;
			}

			.toast.removing {
				animation: slide-out 250ms ease-in forwards;
				pointer-events: none;
				touch-action: none;
			}

			.toast.tinted { --toast-saturation: 80% }
			.toast:has(> button) {
				padding-bottom: 0;
				padding-right: 0;
				padding-top: 0;
			}

			.toast > button {
				background: none;
				border: none;
				border-radius: .3em;
				padding: var(--toast-padding, .75em);
				transition: backdrop-filter 150ms ease;
			}

			.toast > button:first-child { margin-left: var(--toast-padding, .75em) }
			.toast > button:hover { backdrop-filter: brightness(.5) }

			@keyframes slide-in {
				from {
					transform: translateX(100%);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}
			@keyframes slide-out {
				from {
					transform: translateX(0);
					opacity: 1;
				}
				to {
					transform: translateX(100%);
					opacity: 0;
				}
			}
		`);
		return sheet
	})();

	#timeout = null;
	toasts = [];
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.adoptedStyleSheets = [this.constructor.styleSheet]
	}

	connectedCallback() {
		this.setAttribute('aria-label', 'Toast Notification')
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		switch (name) {
		case 'timeout':
			this.#timeout && clearTimeout(this.#timeout);
			this.classList.add('active');
			this.#timeout = setTimeout(() => {
				this.classList.remove('active')
			}, parseInt(newValue) ?? 2500)
		}
	}

	get timeout() {
		return parseInt(this.getAttribute('timeout')) || 2500
	}

	set timeout(value) {
		this.setAttribute('timeout', Number(value))
	}

	error(text) {
		this.show(text, {
			actionRequired: true,
			interactable: true,
			styles: {
				brightness: '8%',
				tint: 0
			}
		})
	}

	hide(toast) {
		toast.classList.add('removing');
		toast.addEventListener('animationend', () => {
			toast.remove();
			const index = this.toasts.indexOf(toast);
			if (index !== -1) this.toasts.splice(index, 1)
		}, { once: true })
	}

	show(text, buttons, options) {
		!Array.isArray(buttons) && (options = buttons, buttons = null);
		const { actionRequired, click, interactable = !Array.isArray(buttons) || buttons.length == 0, styles, timeout } = options || {};
		const toast = document.createElement('div');
		toast.setAttribute('part', 'toast');
		toast.classList.add('toast');
		interactable && toast.classList.add('interactable');
		toast.setAttribute('role', 'status');
		toast.setAttribute('aria-live', 'polite');
		toast.textContent = text;
		if (interactable) {
			toast.addEventListener('click', (...args) => {
				if (typeof click == 'function') {
					const result = click.apply(toast, args);
					if (result === false) return;
				}
				this.hide(toast)
			});
		}

		if (typeof styles == 'object' && styles !== null) {
			for (const style in styles) {
				toast.style.setProperty('--toast-' + style, styles[style]);
				if (style === 'tint' && typeof styles['saturation'] == 'undefined') {
					toast.classList.add('tinted');
				}
			}
		}

		if (Array.isArray(buttons)) {
			for (const buttonData of buttons) {
				const button = document.createElement('button');
				button.textContent = buttonData.name || 'Submit';
				button.addEventListener('click', (...args) => {
					if (typeof buttonData.click == 'function') {
						const result = buttonData.click.apply(button, args);
						if (result === false) return;
					}
					this.hide(toast)
				});
				toast.appendChild(button);
			}
		}

		this.shadowRoot.appendChild(toast);
		this.toasts.push(toast);

		// if there are buttons, no timeout -- force button to be pressed
		if (actionRequired) return;
		setTimeout(this.hide.bind(this), timeout ?? this.timeout, toast)
	}

	success(text) {
		this.show(text, {
			interactable: true,
			styles: {
				brightness: '8%',
				tint: 140
			}
		})
	}

	warn(text) {
		this.show(text, {
			interactable: true,
			styles: {
				brightness: '8%',
				tint: 40
			}
		})
	}

	static show() {
		const hub = document.querySelector('body > toast-hub') || document.body.appendChild(new this());
		hub.show(...arguments);
		return hub
	}
}

Object.defineProperty(self, 'Toast', {
	value: Toast,
	writable: true
});
customElements.define('toast-hub', Toast);