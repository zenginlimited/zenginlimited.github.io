const searchParams = new URLSearchParams(location.search);

const times = document.querySelector('#times');
const caption = document.body.querySelector('.caption');

function startTimeRemaining() {
	if (updateTimeRemaining.timer) {
		clearInterval(updateTimeRemaining.timer);
		console.log(this, this.Dhuhr.calculateTimeRemaining(), this.refresh())
		Object.assign(this, calculatePrayerTimes(this.latitude, this.longitude));
		const prayerTimeEntries = Object.entries(this);
		times.replaceChildren();
		prayerTimeEntries.forEach(([name, { displayTime, ongoing, time }], i) => {
			const p = times.appendChild(document.createElement('p'));
			p.dataset.prayer = name;
			p.dataset.time = time;
			p.textContent = displayTime;

			if (time > now) {
				if (timeRemaining.textContent.length < 1) {
					timeRemaining.dataset.prayer = name;
					timeRemaining.dataset.time = time;
					startTimeRemaining.call(prayerTimes, timeRemaining, latitude, longitude)
				}
			} else {
				p.classList.add(ongoing ? 'ongoing' : 'passed');
			}
		});
	}

	updateTimeRemaining.apply(this, arguments);
	Object.defineProperty(updateTimeRemaining, 'timer', {
		value: setInterval(updateTimeRemaining.bind(this), 1e3, ...arguments),
		writable: true
	})
}

function updateTimeRemaining(timeRemaining) {
	const now = new Date();
	let [oh, om] = now.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(v => parseInt(v))
	  , [nh, nm] = timeRemaining.dataset.time.split(':').map(v => parseInt(v))
	  , minutesRemaining = (nh * 60 + nm) - (oh * 60 + om)
	  , remainingHours = Math.floor(minutesRemaining / 60)
	  , remainingMinutes = minutesRemaining % 60
	  , text = '';
	remainingHours > 0 && (text += remainingHours + 'h');
	remainingMinutes > 0 && (remainingHours > 0 && (text += ' '),
	text += remainingMinutes + 'm');
	let remainingSeconds = now.getSeconds();
	remainingSeconds > 0 && ((remainingHours > 0 || remainingMinutes > 0) && (text += ' '),
	text += (60 - remainingSeconds) + 's')
	timeRemaining.textContent = text;
	remainingHours < 1 && remainingMinutes < 1 && remainingSeconds <= 1 && startTimeRemaining.apply(this, arguments)
}

const displayPrayerTimes = (latitude, longitude) => {
	console.log('Latitude:', latitude, 'Longitude:', longitude);
	try {
		const date = new Date();
		caption.textContent = date.toLocaleDateString([], { weekday: 'long' });
		const timeRemaining = document.createElement('div');
		timeRemaining.classList.add('time-remaining');
		caption.before(timeRemaining);
		const prayerTimes = calculatePrayerTimes(latitude, longitude, date);
		const now = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

		const prayerTimeEntries = Object.entries(prayerTimes);
		prayerTimeEntries.forEach(([name, { displayTime, ongoing, time }], i) => {
			const p = times.appendChild(document.createElement('p'));
			p.dataset.prayer = name;
			p.dataset.time = time;
			p.textContent = displayTime;

			if (time > now) {
				if (timeRemaining.textContent.length < 1) {
					timeRemaining.dataset.prayer = name;
					timeRemaining.dataset.time = time;
					startTimeRemaining.call(prayerTimes, timeRemaining, latitude, longitude)
				}
			} else {
				p.classList.add(ongoing ? 'ongoing' : 'passed');
			}
		});
	} catch (error) {
		console.error("Error in displayPrayerTimes:", error);
		document.body.textContent = 'An error occurred while calculating the prayer times.';
	}
};

if (searchParams.has('latitude') && searchParams.has('longitude')) {
	displayPrayerTimes(searchParams.get('latitude'), searchParams.get('longitude'));
} else {
	getGeolocation()
		.then(({ latitude, longitude }) => {
			displayPrayerTimes(latitude, longitude)
		})
		.catch(err => {
			alert(err)
		});
}