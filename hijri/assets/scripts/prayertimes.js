import getGeolocation, { getTimezoneOffset } from "./geolocation.js";

const lang = ((navigator.languages ? navigator.languages[0] : null) || navigator.language || navigator.browserLanguage || navigator.userLanguage)?.replace(/(?<=ar)$/i, '-EG');
const calculateJulianDate = (year, month, day) => {
	if (month <= 2) {
		year -= 1;
		month += 12;
	}
	const A = Math.floor(year / 100);
	const B = 2 - A + Math.floor(A / 4);
	return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
};

const calculateSunDeclination = (julianDate) => {
	const D = julianDate - 2451545.0;
	const g = (357.529 + 0.98560028 * D) % 360;
	const q = (280.459 + 0.98564736 * D) % 360;
	const L = (q + 1.915 * Math.sin((g * Math.PI) / 180) + 0.020 * Math.sin((2 * g * Math.PI) / 180)) % 360;
	const e = 23.439 - 0.00000036 * D;
	return Math.asin(Math.sin((e * Math.PI) / 180) * Math.sin((L * Math.PI) / 180)) * (180 / Math.PI);
};

const calculateHourAngle = (declination, latitude, angle) => {
	const radAngle = (Math.sin((angle * Math.PI) / 180) - Math.sin((latitude * Math.PI) / 180) * Math.sin((declination * Math.PI) / 180)) / (Math.cos((latitude * Math.PI) / 180) * Math.cos((declination * Math.PI) / 180));
	const validRadAngle = Math.max(-1, Math.min(1, radAngle)); // Prevent invalid values for acos
	return Math.acos(validRadAngle) * (180 / Math.PI);
};

const formatTime = (decimalTime, now, [currentHours, currentMinutes], estimatedTimezoneOffset) => {
	let hours = Math.floor(decimalTime);
	let minutes = Math.round((decimalTime - hours) * 60);

	if (minutes >= 60) {
		minutes = 0;
		hours += 1;
	}

	let r = hours % 12
	  , hourTwelve = r === 0 ? hours : r
	  , p = hours / 12 >= 1;

	let date = new Date(now);
	date.setHours(hours);
	date.setMinutes(minutes);
	date.setSeconds(0);

	// Neautralize Date
	date.setTime(date.getTime() + 6e4 * date.getTimezoneOffset());
	date.setTime(date.getTime() + 6e4 * estimatedTimezoneOffset);

	return Object.defineProperties({
		displayTime: `${hourTwelve.toLocaleString(lang)}:${minutes.toLocaleString(lang).padStart(2, (0).toLocaleString(lang))}${p ? 'p' : 'a'}m`,
		passed: (currentHours * 60 + currentMinutes) - (hours * 60 + minutes) > 0,
		startTimestamp: Math.floor(date.getTime() / 1e3),
		time: `${hours.toString().padStart(2, 0)}:${minutes.toString().padStart(2, 0)}`
	}, {
		calculateTimeRemaining: {
			value: function calculateTimeRemaining() {
				const secondsRemaining = this.getSecondsRemaining();

				let hours = Math.floor(secondsRemaining / 3600)
				  , minutes = Math.floor(secondsRemaining / 60) % 60
				  , seconds = secondsRemaining % 60;

				let text = '';
				hours > 0 && (text += hours + 'h');
				minutes > 0 && (hours > 0 && (text += ' '),
				text += minutes + 'm');
				seconds > 0 && ((hours > 0 || minutes > 0) && (text += ' '),
				text += seconds + 's');
				return text
			},
			writable: true
		},
		getMinutesRemaining: {
			value: function getMinutesRemaining() {
				return this.calculateSecondsRemaining() / 60
			},
			writable: true
		},
		getSecondsRemaining: {
			value: function getSecondsRemaining() {
				return (this.startTimestamp - Math.floor(Date.now() / 1e3))
			},
			writable: true
		},
		startAt: { value: date },
		ongoing: { value: false, writable: true }
	});
};

const calculateEquationOfTime = (julianDate) => {
	const D = julianDate - 2451545.0;
	const g = (357.529 + 0.98560028 * D) % 360;
	const q = (280.459 + 0.98564736 * D) % 360;
	const L = (q + 1.915 * Math.sin((g * Math.PI) / 180) + 0.020 * Math.sin((2 * g * Math.PI) / 180)) % 360;
	const EoT = (L - q) - 0.00478 * Math.sin((2 * g * Math.PI) / 180) + 0.000093 * Math.cos((2 * g * Math.PI) / 180);
	return EoT;
};

/**
 * 
 * @property {Date} [date]
 * @returns {Promise<object>}
 */
export const getPrayerTimes = globalThis.getPrayerTimes = async function(date, options) {
	return getGeolocation(options)
		.then(({ latitude, longitude }) => {
			return calculatePrayerTimes(latitude, longitude, date)
		});
};

/**
 * 
 * @property {number} latitude
 * @property {number} longitude
 * @property {Date} [date]
 * @returns {object}
 */
export default globalThis.calculatePrayerTimes = function(latitude, longitude, date) {
	const now = date || new Date();

	// Test auto timezoning based on geolocation
	const estimatedTimezoneOffset = getTimezoneOffset(longitude);
	// Neautralize Date
	now.setTime(now.getTime() + 6e4 * now.getTimezoneOffset());
	now.setTime(now.getTime() + 6e4 * estimatedTimezoneOffset);

	console.log(now)

	const julianDate = calculateJulianDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
	const declination = calculateSunDeclination(julianDate);
	const EoT = calculateEquationOfTime(julianDate);

	const timeZoneOffset = now.getTimezoneOffset() / 60;
	const solarNoon = 12 - (longitude / 15) - timeZoneOffset + (EoT / 60);

	const fajrAngle = -18;
	const ishaAngle = -18;
	const maghribAngle = 0;

	const fajr = solarNoon - calculateHourAngle(declination, latitude, fajrAngle) / 15;
	const dhuhr = solarNoon;  // Dhuhr is solar noon
	const asrAngle = 90 + Math.atan(1 + Math.tan(Math.abs(latitude - declination) * Math.PI / 180)) * 180 / Math.PI;
	const asr = solarNoon + calculateHourAngle(declination, latitude, asrAngle) / 15;
	const maghrib = solarNoon + calculateHourAngle(declination, latitude, maghribAngle) / 15;
	const isha = solarNoon + calculateHourAngle(declination, latitude, ishaAngle) / 15;

	const currentTime = now.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(v => parseInt(v));
	const prayerTimes = {
		Fajr: formatTime(fajr, now, currentTime, estimatedTimezoneOffset),
		Dhuhr: formatTime(dhuhr, now, currentTime, estimatedTimezoneOffset),
		Asr: formatTime(asr, now, currentTime, estimatedTimezoneOffset),
		Maghrib: formatTime(maghrib, now, currentTime, estimatedTimezoneOffset),
		Isha: formatTime(isha, now, currentTime, estimatedTimezoneOffset),
	};

	const currentPrayerName = Object.entries(prayerTimes).filter(([, { passed }]) => passed).map(([key]) => key).reverse()[0];
	if (currentPrayerName) {
		const currentPrayer = prayerTimes[currentPrayerName];
		currentPrayer.ongoing = true;
		currentPrayer.passed = false;
	}

	return Object.defineProperties(prayerTimes, {
		latitude: { value: latitude, writable: true },
		longitude: { value: longitude, writable: true },
		refresh: {
			value: function refresh() {
				return Object.assign(this, calculatePrayerTimes(latitude, longitude, new Date()))
			},
			writable: true
		}
	})
}