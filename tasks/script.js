const API_URL = 'http://api.zengin.ca/'
	, TASKS_KEY = 'tasks'
	, localTasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || []
	, tasks = [];

const DOM = {
	confirmDeleteBtn: document.getElementById('confirm-delete'),
	deleteModal: document.getElementById('delete-modal'),
	deleteMessage: document.getElementById('delete-message'),
	filterBy: document.getElementById('filter-by'),
	localTaskList: document.getElementById('personal-task-list'),
	modalTitle: document.getElementById('modal-title'),
	newTaskBtn: document.querySelector('.btn-new'),
	notification: document.getElementById('notification'),
	sortBy: document.getElementById('sort-by'),
	taskForm: document.getElementById('task-form'),
	taskList: document.getElementById('task-list'),
	taskModal: document.getElementById('task-modal'),
	toastHub: document.getElementById('notifications')
};

const CURRENT_YEAR = new Date().getFullYear()
	, REPLACE_CURRENT_YEAR_REGEX = new RegExp('[\\/-]*' + CURRENT_YEAR + '\\1*,*', 'g');

const formatDateTime = date => {
	date = new Date(date).toLocaleString('en-US', {
		month: 'numeric',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		hour12: true
	});
	return date.replace(REPLACE_CURRENT_YEAR_REGEX, '')
};

const saveTasks = () => localStorage.setItem(TASKS_KEY, JSON.stringify(localTasks));
if (localTasks.length > 0) {
	localTasks.splice(0, localTasks.length, localTasks.filter(({ id }) => id));
	saveTasks();
}

const applySortAndFilter = taskArray => {
	const filtered = [...taskArray];
	const { filters } = DOM.filterBy;
	if (!filters.has('showAll')) {
		for (const filter of filters.values()) {
			switch (filter) {
			case 'hideCompleted': filtered.splice(0, filtered.length, filtered.filter(t => !t.completed)); break;
			case 'hideGroupTasks': filtered.splice(0, filtered.length, filtered.filter(t => -1 === tasks.findIndex(({ id }) => id === t.id)))
			}
		}
	}

	const sort = DOM.sortBy.value;
	if (sort === 'added') {
		filtered.sort(({ createdTimestamp: a }, { createdTimestamp: b }) => b - a);
	} else if (sort === 'completed') {
		filtered.sort((a, b) => {
			if (!b.completed) return 1;
			if (!a.completed) return -1;
			return new Date(b.updatedTimestamp) - new Date(a.updatedTimestamp);
		});
	}

	if (sort === 'completed') filtered.sort(({ completed: a }, { completed: b }) => b - a);
	else filtered.sort(({ completed: a }, { completed: b }) => a - b);

	return filtered
	// Filter by completion by defualt
	// return filtered.sort((a, b) => a.completed - b.completed)
};

const escapeHTML = str => str
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

const formatText = text => {
	if (typeof text != 'string') return text;
	text = escapeHTML(text);
	// Replace code blocks (```...```)
	text = text.replace(/```([\s\S]*?)```/gm, '<pre><code>$1</code></pre>');
	// Replace inline code (`...`)
	text = text.replace(/`([^`\n]+)`/gm, '<code>$1</code>');
	// Replace bold (**...** or __...__)
	text = text.replace(/\*\*(.+?)\*\*/gm, '<strong>$1</strong>');
	text = text.replace(/__(.+?)__/gm, '<strong>$1</strong>');
	// Replace italic (*...* or _..._)
	text = text.replace(/\*(?!\*)([^*\n]+?)\*(?!\*)/gm, '<em>$1</em>');
	text = text.replace(/_(?!_)([^_\n]+?)_(?!_)/gm, '<em>$1</em>');
	// Replace plain URLs with <a> tags
	text = text.replace(/(?<!\()(https?:\/\/[\w.-]+\.[a-z]{2,}(?:[^\s]*)?)(?!\))/gm, '<a href="$1">$1</a>');
	// Replace markdown links [text](url)
	text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gm, '<a href="$2" title="$1&#13;&#13;$2">$1</a>');
	return text
};

// Task Rendering
const renderTasks = () => {
	DOM.localTaskList.innerHTML = '';
	DOM.taskList.innerHTML = '';
	const filteredTasks = applySortAndFilter([...localTasks, ...tasks]);
	filteredTasks.forEach(task => {
		const isLocalTask = -1 !== localTasks.indexOf(task);
		const taskEl = document.createElement('div');
		taskEl.classList.add('task');
		if (task.completed) taskEl.classList.add('completed');

		let editHistoryHTML = '';
		if (task.editHistory?.length > 0) {
			const lastEdit = task.editHistory.at(-1);
			editHistoryHTML = `<small>Last modified by <strong>${lastEdit.editedBy}</strong>&ensp;•&ensp;${formatDateTime(lastEdit.createdTimestamp)}</small>`;
			if (task.editHistory.length > 1) {
				editHistoryHTML += `
					<details>
						<summary style="font-size: smaller;">Show full edit history</summary>
						${
							task.editHistory.slice(0, -1).map((edit, i) =>
								`<small>Edit ${i + 1} by <strong>${edit.editedBy}</strong>&ensp;•&ensp;${formatDateTime(edit.createdTimestamp)}</small>`).join('')
						}
					</details>
				`;
			}
		}

		let title = task.title;
		const tags = title.match(/(?<=^\[)([^\]]{3,})(?=\])/g);
		let tag = tags && tags.length > 0 && tags[0];
		if (tag) {
			title = title.replace(new RegExp(`^\\[${tag.replace(/([\.?])/, '\\$1')}\\]\\s+([>+-]+\\s*)?`), '');
			const matchPriority = tag.match(/^([!?])|[!?]$/);
			if (matchPriority) {
				taskEl.classList.add(matchPriority[0] == '!' ? 'important' : 'warning');
				tag = tag.replace(/^([!?])|[!?]$/, '');
			}
		}

		const innerHTML = `
			<div class="task-header">
				<input type="checkbox" ${task.completed ? 'checked' : ''}>
				<span class="task-title" ${tag && `data-tag="${tag}"`}>${title}</span>
			</div>
			<span class="task-date-added">${formatDateTime(task.createdTimestamp)}</span>
			<span class="task-date-completed">${task.completed ? formatDateTime(task.updatedTimestamp) : '-'}</span>
			<div class="task-actions">
				<svg class="edit-btn" viewBox="0 0 24 24">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M21.1213 2.70705C19.9497 1.53548 18.0503 1.53547 16.8787 2.70705L15.1989 4.38685L7.29289 12.2928C7.16473 12.421 7.07382 12.5816 7.02986 12.7574L6.02986 16.7574C5.94466 17.0982 6.04451 17.4587 6.29289 17.707C6.54127 17.9554 6.90176 18.0553 7.24254 17.9701L11.2425 16.9701C11.4184 16.9261 11.5789 16.8352 11.7071 16.707L19.5556 8.85857L21.2929 7.12126C22.4645 5.94969 22.4645 4.05019 21.2929 2.87862L21.1213 2.70705ZM18.2929 4.12126C18.6834 3.73074 19.3166 3.73074 19.7071 4.12126L19.8787 4.29283C20.2692 4.68336 20.2692 5.31653 19.8787 5.70705L18.8622 6.72357L17.3068 5.10738L18.2929 4.12126ZM15.8923 6.52185L17.4477 8.13804L10.4888 15.097L8.37437 15.6256L8.90296 13.5112L15.8923 6.52185ZM4 7.99994C4 7.44766 4.44772 6.99994 5 6.99994H10C10.5523 6.99994 11 6.55223 11 5.99994C11 5.44766 10.5523 4.99994 10 4.99994H5C3.34315 4.99994 2 6.34309 2 7.99994V18.9999C2 20.6568 3.34315 21.9999 5 21.9999H16C17.6569 21.9999 19 20.6568 19 18.9999V13.9999C19 13.4477 18.5523 12.9999 18 12.9999C17.4477 12.9999 17 13.4477 17 13.9999V18.9999C17 19.5522 16.5523 19.9999 16 19.9999H5C4.44772 19.9999 4 19.5522 4 18.9999V7.99994Z" fill="currentColor"/>
				</svg>
				<svg class="delete-btn" viewBox="0 0 24 24" fill="none">
					<path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		`;

		taskEl.innerHTML = `
			<div class="task-inner">${innerHTML}</div>
			<div class="task-content">
				<div class="task-full-title">${title}</div>
				<p>${formatText(task.desc) || ''}</p>
				<div class="task-details">
					${isLocalTask ? '' : `<small>Added by <strong>${task.addedBy}</strong>&ensp;•&ensp;${formatDateTime(task.createdTimestamp)}</small>`}
					${editHistoryHTML}
					${task.completed ? `<small>Completed${isLocalTask ? '' : ` by <strong>${task.completedBy}</strong>`}&ensp;•&ensp;${formatDateTime(task.updatedTimestamp)}</small>` : ''}
				</div>
			</div>
		`;
		DOM[(isLocalTask ? 'localT' : 't') + 'askList'].appendChild(taskEl);

		// Event Delegation for Efficiency
		taskEl.addEventListener('click', e => {
			const target = e.target;
			if (target.type === 'checkbox') {
				e.preventDefault();
				e.stopPropagation(); // Prevent task content toggle
				if (!task.completed) handleVerification(task, target);
			} else if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
				e.preventDefault();
				e.stopPropagation();
				handleEdit(task);
			} else if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
				e.preventDefault();
				e.stopPropagation();
				handleDelete(task);
			} else if (!target.closest('.task-content')) {
				taskEl.querySelector('.task-content').classList.toggle('active')
			}
		})
	})
};

// Close Modals on Outside Click
const closeModalOnOutsideClick = modal => {
	modal.addEventListener('click', function (event) {
		const rect = modal.getBoundingClientRect()
			, isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
				rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
		!isInDialog && modal.close('cancel')
	}, { passive: true })
};

// Event Handlers
const handleVerification = async (task, checkbox) => {
	// if personal task don't fetch
	if (-1 !== localTasks.indexOf(task)) {
		task.completed = checkbox.checked;
		saveTasks();
	} else {
		await fetchWithCredentials('tasks/' + task.id, {
			completed: checkbox.checked,
			method: 'PATCH'
		})
		.then(taskData => Object.assign(task, taskData))
		.catch(err => DOM.toastHub.error(err.message || "Something went wrong! Failed to update task"));
	}

	// saveTasks();
	renderTasks();
	DOM.toastHub.show(`Task "${task.title}" completed`, { styles: { tint: 120 }})
};

const handleEdit = task => {
	const submit = DOM.taskForm.querySelector('[type="submit"]')
		, title = DOM.taskForm.querySelector('#task-title')
		, desc = DOM.taskForm.querySelector('#task-desc')
		, uncheck = DOM.taskForm.querySelector('#mark-incomplete');
	const handleChanges = () => {
		const newTask = {
			title: title.value,
			desc: desc.value
		};
		submit.disabled = newTask.title === task.title && newTask.desc === task.desc && uncheck.checked === !task.completed
	};

	DOM.modalTitle.textContent = 'Edit Task';
	title.value = task.title;
	desc.value = task.desc;
	uncheck.checked = false;
	// completed.checked = !task.completed;
	title.addEventListener('input', handleChanges, { passive: true });
	desc.addEventListener('input', handleChanges, { passive: true });
	uncheck.addEventListener('change', handleChanges, { passive: true });
	submit.disabled = true;
	DOM.taskModal.addEventListener('close', async ({ target }) => {
		// Remove listeners
		title.removeEventListener('input', handleChanges);
		desc.removeEventListener('input', handleChanges);
		uncheck.removeEventListener('change', handleChanges);
		submit.disabled = false
	}, { once: true, passive: true });
	task.completed && DOM.taskModal.classList.add('completed');
	DOM.taskModal.dataset.id = task.id;
	DOM.taskModal.showModal();
	desc.style.setProperty('height', desc.scrollHeight + 'px')
};

const handleDelete = task => {
	DOM.deleteModal.dataset.id = task.id;
	DOM.deleteMessage.textContent = `Are you sure you want to delete "${task.title}"?`;
	DOM.deleteModal.showModal()
};

DOM.newTaskBtn.addEventListener('click', e => {
	e.preventDefault();
	DOM.modalTitle.textContent = 'New Task';
	DOM.taskForm.reset();
	delete DOM.taskModal.dataset.id;
	DOM.taskModal.showModal()
});

const resetModal = modal => {
	for (const key in modal.dataset)
		delete modal.dataset[key];

	const form = modal.querySelector('form');
	if (form === null) return;
	const buttons = form.getElementsByTagName('button');
	for (const button of buttons) {
		button.classList.remove('loading');
		button.disabled = false
	}
};

DOM.taskModal.addEventListener('close', async function() {
	this.classList.remove('completed');
	const taskId = this.dataset.id;
	resetModal(this);
	// delete this.dataset.id;
	if (this.returnValue !== 'submit') return;
	let task = tasks.find(({ id }) => id === taskId) || localTasks.find(({ id }) => id === parseInt(taskId));
	renderTasks();
	DOM.toastHub.show(`Task ${taskId ? `"${task.title}" updated` : 'added'}`);
	this.returnValue = ''
}, { passive: true });

DOM.taskForm.addEventListener('submit', async e => {
	e.preventDefault();
	const submit = DOM.taskForm.querySelector('[type="submit"]');
	submit.classList.add('loading');
	submit.disabled = true;
	const taskId = DOM.taskModal.dataset.id;
	const existingTask = taskId ? tasks.find(({ id }) => id === taskId) || localTasks.find(({ id }) => id === parseInt(taskId)) : null;
	const isLocalTask = existingTask ? -1 !== localTasks.indexOf(existingTask) : DOM.taskForm.querySelector('#create-personal-task').checked;
	const taskData = {
		title: DOM.taskForm.querySelector('#task-title').value,
		desc: DOM.taskForm.querySelector('#task-desc').value,
		completed: taskId ? (existingTask.completed && !DOM.taskForm.querySelector('#mark-incomplete').checked) : false
	};

	if (!isLocalTask) {
		Object.assign(taskData, {
			completedBy: taskId ? existingTask.completedBy : null,
			editHistory: existingTask?.editHistory || []
		});
	} else {
		if (!existingTask) {
			Object.assign(taskData, {
				createdTimestamp: Date.now(),
				id: Date.now()
			});
		}
		Object.assign(taskData, { updatedTimestamp: Date.now() });
	}

	if (taskId) {
		if (isLocalTask) {
			const index = localTasks.findIndex(({ id }) => id === parseInt(taskId));
			localTasks[index] = { ...localTasks[index], ...taskData };
			saveTasks();
		} else {
			const index = tasks.findIndex(({ id }) => id === taskId);
			tasks[index] = { ...tasks[index], ...taskData };
			const res = await fetchWithCredentials('tasks/' + taskId, {
				...taskData,
				method: 'PATCH'
			}, true)
			.then(({ status }) => status === 200)
			.catch(err => DOM.toastHub.error(err.message || "Something went wrong! Failed to update task"));
			if (!res) return;
		}
	} else {
		if (isLocalTask) {
			localTasks.push(taskData);
			saveTasks();
		} else {
			await fetchWithCredentials('tasks', {
				...taskData,
				method: 'POST'
			})
			.then(task => tasks.push(Object.assign(taskData, task)))
			.catch(err => DOM.toastHub.error(err.message || "Something went wrong! Failed to update task"));
		}
	}

	DOM.taskModal.close('submit')
});

DOM.deleteModal.addEventListener('close', function() {
	const taskId = this.dataset.id;
	resetModal(this);
	// delete this.dataset.id;
	if (this.returnValue !== 'submit' || !taskId) return;
	let task = tasks.find(({ id }) => id === taskId);
	if (task) {
		tasks.splice(0, tasks.length, tasks.filter(({ id }) => id !== taskId));
	} else {
		task = localTasks.find(({ id }) => id === parseInt(taskId));
		if (!task) return;
		localTasks.splice(0, localTasks.length, localTasks.filter(({ id }) => id !== parseInt(taskId)));
		saveTasks();
	}
	// saveTasks();
	renderTasks();
	DOM.toastHub.show(`Task "${task.title}" deleted`, { styles: { tint: 5 }});
	this.returnValue = ''
}, { passive: true });

DOM.confirmDeleteBtn.addEventListener('click', async e => {
	e.preventDefault();
	const taskId = DOM.deleteModal.dataset.id;
	if (-1 !== tasks.findIndex(({ id }) => id === taskId)) {
		const deleted = await fetchWithCredentials('tasks/' + taskId, {
			method: 'DELETE'
		}, true)
		.then(r => r.status === 200)
		.catch(err => DOM.toastHub.error(err.message || "Something went wrong! Failed to delete task"));
		if (!deleted) return;
	}
	DOM.deleteModal.close('submit')
});

document.querySelectorAll('.btn-close').forEach(btn => {
	btn.addEventListener('click', ({ target }) => {
		target.closest('dialog').close()
	}, { passive: true })
});

closeModalOnOutsideClick(DOM.taskModal);
closeModalOnOutsideClick(DOM.deleteModal);

DOM.sortBy.addEventListener('change', renderTasks);
Object.defineProperty(DOM.filterBy, 'filters', {
	value: new Set(),
	writable: true
});
for (const filter of DOM.filterBy.querySelectorAll('input')) {
	filter.addEventListener('change', () => {
		DOM.filterBy.filters[filter.checked ? 'add' : 'delete'](filter.dataset.id);
		renderTasks()
	});
}

DOM.taskForm.querySelector('#task-desc').addEventListener('input', function() {
	this.style.height = "auto";
    this.style.height = this.scrollHeight + "px"
}, { passive: true });

renderTasks();
fetchWithCredentials('tasks').then(r => {
	tasks.splice(0, tasks.length, r);
	renderTasks()
});

async function fetchWithCredentials(path, payload, rawResponse) {
	const options = {
		credentials: 'include',
		headers: { Authorization: parseAuthorizationCookie() }
	};
	if (payload instanceof Object) {
		if (typeof payload.method == 'string' && 'GET' !== payload.method.toUpperCase()) {
			options.method = payload.method;
			delete payload.method;
		}
		Object.keys(payload).length > 0 && (options.body = JSON.stringify(payload));
	}
	return fetch(API_URL + path, options)
	.then(r => {
		if (r.status > 399) {
			throw new Error(r.statusText || "Something went wrong! Failed to fetch");
		}
		return rawResponse ? r : r.json().catch(err => ({
			code: r.status,
			message: r.statusText || 'Success'
		}))
	})
}

function parseAuthorizationCookie() {
	return 'Bearer ' + parseCookie('BasicAuthorization')
}

function parseCookie(key) {
	if (document.cookie.length > 0) {
		const cookies = new Map(document.cookie.split(';').map(cookie => cookie.split('=')));
		if (cookies.size > 0 && cookies.has(key)) {
			return cookies.get(key);
		}
	}

	return null
}