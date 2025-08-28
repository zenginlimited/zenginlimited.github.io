const timetable = document.querySelector('#timetable');
const caption = timetable.querySelector('caption');

const displayPrayerTimes = (latitude, longitude) => {
	console.log('Latitude:', latitude, 'Longitude:', longitude);
	try {
		const date = new Date();
		caption.textContent = date.toLocaleDateString([], { month: 'long' });
		const timeTableBody = timetable.appendChild(document.createElement('tbody'));
		for (let i = 1; i <= daysInThisMonth(); i++) {
			date.setDate(i);
			const prayerTimes = calculatePrayerTimes(latitude, longitude, date);
			const row = timeTableBody.appendChild(document.createElement('tr'));
			let data = row.appendChild(document.createElement('td'));
			data.classList.add('date');
			for (const prayer in prayerTimes) {
				data = row.appendChild(document.createElement('td'));
				data.textContent = prayerTimes[prayer].displayTime;
			}
		}
	} catch (error) {
		console.error("Error in displayPrayerTimes:", error);
		document.body.textContent = 'An error occurred while calculating the prayer times.';
	}
};

getGeolocation()
	.then(({ latitude, longitude }) => {
		displayPrayerTimes(latitude, longitude)
	});

function daysInThisMonth() {
	const now = new Date();
	return new Date(now.getFullYear(), 1 + now.getMonth(), 0).getDate()
}