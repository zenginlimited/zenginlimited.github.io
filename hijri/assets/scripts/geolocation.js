export default globalThis.getGeolocation = async function({ enableHighAccuracy, maximumAge, timeout } = {}) {
	if (navigator.geolocation) {
		return new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(({ coords }) => {
				resolve(coords)
			}, err => {
				console.warn(err);
				// Fallback to API
				getGeolocationFromIpApi()
					.then(resolve)
					.catch(reject)
			}, { enableHighAccuracy, maximumAge, timeout })
		});
	} else {
		return getGeolocationFromIpApi()
	}
}

export const getGeolocationFromIpApi = async () => {
	return fetch('https://ipapi.co/json/')
		.then(r => r.json());
};

export const getTimezoneOffset = longitude => {
	// Get the absolute value of the longitude, floor it, and multiply by the sign of the longitude
	const offsetInHours = Math.floor(Math.abs(longitude) / 15) * Math.sign(longitude);

	// Convert the offset to minutes (1 hour = 60 minutes)
	const offsetInMinutes = offsetInHours * 60;

	return offsetInMinutes;
};